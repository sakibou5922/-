#!/usr/bin/env python3
"""開発者・大口の調査: 誰が作り、誰が持っているか。

使い方:
  python3 dev.py <CA>                              # 開発者の過去実績 + 上位ホルダー
  python3 dev.py <CA> --watchlist wallets.json     # 自分で登録した KOL/大口ウォレットが保有しているか
  python3 dev.py --wallet <ウォレット>             # そのウォレットが過去に作ったコイン一覧
wallets.json の形式: {"名前": "ウォレットアドレス", ...}
"""
import json
import sys
import time

from common import (PUMP, RUGCHECK, arg, flag, get_json, hours, is_address, num, print_errors, pump_coin, rpc,
                    short, usd)

DEAD_MCAP = 5000  # これ未満は「死んだコイン」とみなす


def created_coins(wallet):
    r = get_json(f"{PUMP}/coins/user-created-coins/{wallet}?offset=0&limit=50&includeNsfw=true", "pump.fun(作成履歴)")
    if isinstance(r, dict):
        r = r.get("coins") or r.get("data")
    return r if isinstance(r, list) else None


def creator_stats(coins, exclude=None):
    coins = [c for c in coins if c.get("mint") != exclude]
    now = time.time() * 1000
    mcaps = [num(c.get("usd_market_cap") or c.get("marketCap")) for c in coins]
    aths = [num(c.get("ath_market_cap")) for c in coins if c.get("ath_market_cap")]
    recent = [c for c in coins if c.get("created_timestamp") and now - num(c["created_timestamp"]) < 30 * 86400e3]
    return {"count": len(coins), "graduated": sum(bool(c.get("complete")) for c in coins),
            "dead": sum(x < DEAD_MCAP for x in mcaps), "best_mcap": max(mcaps or [0]),
            "best_ath": max(aths or [0]), "last30d": len(recent),
            "list": sorted(coins, key=lambda c: -num(c.get("created_timestamp")))[:8]}


def creator_label(s):
    if s["count"] == 0:
        return "🟢 初めての発行(過去実績なし=判断材料も少ない)"
    if s["count"] >= 10 and s["graduated"] == 0:
        return "🔴 量産型:何度も作って一度も graduate していない"
    if s["dead"] >= max(3, s["count"] * 0.8):
        return "🔴 過去のコインのほとんどが死んでいる(使い捨ての可能性)"
    if s["graduated"]:
        return f"🟢 過去に graduate 実績あり({s['graduated']}件)"
    return "🟡 実績はまちまち"


def wallet_info(wallet):
    bal = rpc("getBalance", [wallet])
    sigs = rpc("getSignaturesForAddress", [wallet, {"limit": 1000}])
    info = {"sol": bal["value"] / 1e9 if isinstance(bal, dict) else None, "tx": None, "age_h": None, "age_is_min": False}
    if isinstance(sigs, list):
        info["tx"] = len(sigs)
        if sigs and sigs[-1].get("blockTime"):
            info["age_h"] = (time.time() - sigs[-1]["blockTime"]) / 3600
            info["age_is_min"] = len(sigs) >= 1000  # 1000件で打ち切り=実際はもっと古い
    return info


def token_balance(owner, mint):
    r = rpc("getTokenAccountsByOwner", [owner, {"mint": mint}, {"encoding": "jsonParsed"}])
    if not isinstance(r, dict):
        return None
    return sum(num(a["account"]["data"]["parsed"]["info"]["tokenAmount"].get("uiAmount"))
               for a in r.get("value") or [])


def token_supply(mint):
    r = rpc("getTokenSupply", [mint])
    return num((r or {}).get("value", {}).get("uiAmount"), None) if isinstance(r, dict) else None


def print_creator(wallet, coins, exclude=None):
    s = creator_stats(coins, exclude)
    print(f"  過去に作ったコイン: {s['count']} 件(直近30日 {s['last30d']} 件)・graduate {s['graduated']} 件"
          f"・死亡(時価総額 {usd(DEAD_MCAP)} 未満) {s['dead']} 件・最高時価総額 {usd(max(s['best_mcap'], s['best_ath']))}")
    print(f"  評価: {creator_label(s)}")
    for c in s["list"]:
        ts = c.get("created_timestamp")
        ago = hours((time.time() * 1000 - num(ts)) / 3.6e6) + "前" if ts else "—"
        print(f"    - {str(c.get('symbol'))[:10]:<10} {usd(c.get('usd_market_cap') or c.get('marketCap')):>8}"
              f" {'graduate済' if c.get('complete') else '          '} {ago}  {c.get('mint')}")


def main():
    wallet_only = arg("--wallet")
    if wallet_only:
        if not is_address(wallet_only):
            sys.exit("ウォレットアドレスの形式が正しくありません")
        print(f"■ ウォレット {wallet_only}")
        w = wallet_info(wallet_only)
        sol = "—" if w["sol"] is None else f"{w['sol']:.2f}"
        print(f"  SOL残高 {sol} ・ウォレット年齢 "
              f"{('' if not w['age_is_min'] else '少なくとも') + hours(w['age_h'])}")
        coins = created_coins(wallet_only)
        if coins is None:
            print("  作成履歴: 取得できず")
        else:
            print_creator(wallet_only, coins)
        print_errors()
        return

    mint = next((a for a in sys.argv[1:] if is_address(a)), None)
    if not mint:
        sys.exit("使い方: python3 dev.py <CA> [--watchlist wallets.json]  /  python3 dev.py --wallet <アドレス>")
    rc = get_json(f"{RUGCHECK}/tokens/{mint}/report", "RugCheck")
    rc = rc if isinstance(rc, dict) and rc.get("mint") else {}
    pc = pump_coin(mint) or {}
    creator = rc.get("creator") or pc.get("creator")
    out = {"mint": mint, "creator": creator}
    print(f"■ {pc.get('name') or (rc.get('tokenMeta') or {}).get('name') or '?'}  {mint}")

    # 1) 開発者
    print("\n【開発者】" + (f" {creator}" if creator else " 不明"))
    if creator:
        w = wallet_info(creator)
        out["creator_wallet"] = w
        held = token_balance(creator, mint)
        supply = token_supply(mint)
        held_txt = "—" if held is None else (f"{held:,.0f} 枚" + (f"({held / supply * 100:.2f}%)" if supply else ""))
        sol = "—" if w["sol"] is None else f"{w['sol']:.2f}"
        print(f"  SOL残高 {sol} ・ウォレット年齢 "
              f"{('少なくとも' if w['age_is_min'] else '') + hours(w['age_h'])} ・このコインの現在保有 {held_txt}")
        if w["age_h"] is not None and w["age_h"] < 24 and not w["age_is_min"]:
            print("  🟡 作られて1日未満の使い捨てウォレットの可能性")
        coins = created_coins(creator)
        if coins is None and rc.get("creatorTokens"):
            coins = [{"mint": t.get("mint"), "usd_market_cap": t.get("marketCap"), "symbol": "?"}
                     for t in rc["creatorTokens"]]
        if coins is None:
            print("  作成履歴: 取得できず")
        else:
            print_creator(creator, coins, exclude=mint)
            out["creator_stats"] = {k: v for k, v in creator_stats(coins, mint).items() if k != "list"}

    # 2) 上位ホルダー
    known = rc.get("knownAccounts") or {}
    holders = rc.get("topHolders") or []
    if holders:
        print("\n【上位ホルダー】(🏦=プール等の既知アカウント 👤=開発者 ⚠=インサイダー判定)")
        for h in holders[:15]:
            lab = known.get(h.get("owner")) or {}
            mark = "👤" if h.get("owner") == creator else ("🏦" if lab.get("type") else ("⚠" if h.get("insider") else "  "))
            print(f"  {mark} {num(h.get('pct')):5.2f}%  {h.get('owner')}  {lab.get('name') or ''}")
        out["top_holders"] = holders[:15]
    else:
        print("\n【上位ホルダー】取得できず")

    # 3) ウォッチリスト(KOL・大口)
    wl_path = arg("--watchlist")
    if wl_path:
        with open(wl_path, encoding="utf-8") as fp:
            wl = json.load(fp)
        supply = token_supply(mint)
        print(f"\n【ウォッチリスト】{len(wl)} ウォレットを確認")
        hits = []
        for name, addr in wl.items():
            bal = token_balance(addr, mint)
            if bal is None:
                print(f"  ⚪ {name}: 取得できず")
            elif bal > 0:
                share = f"({bal / supply * 100:.2f}%)" if supply else ""
                print(f"  ✅ {name} が保有中: {bal:,.0f} 枚{share}  {short(addr)}")
                hits.append(name)
            time.sleep(0.3)  # 公開RPCのレート制限対策
        if not hits:
            print("  保有しているウォレットはありませんでした")
        out["watchlist_hits"] = hits

    if flag("--json"):
        print(json.dumps(out, ensure_ascii=False, default=str))
    print_errors()


if __name__ == "__main__":
    main()
