#!/usr/bin/env python3
"""詐欺チェック: Solana ミームコインの危険サインを公開API(キー不要)で調べて判定する。

使い方:
  python3 check.py <CA>                   # 判定レポート
  python3 check.py <CA> --json            # 機械可読(記録・比較用)
  python3 check.py <CA> --save raw.json   # 取得した生データを保存
  python3 check.py --offline raw.json     # 保存済みデータで再判定(しきい値調整用)
データ源: DexScreener / RugCheck / GoPlus / pump.fun
"""
import json
import os
import sys
import time

from common import (DEX, GOPLUS, RUGCHECK, curve_progress, dex_pairs, flag, get_json, hours, is_address,
                    main_pair, num, pct, print_errors, pump_coin, short, usd, arg)

HERE = os.path.dirname(os.path.abspath(__file__))
RED, YELLOW, OK, NA = "🔴", "🟡", "🟢", "⚪"


def load_thresholds():
    with open(os.path.join(HERE, "thresholds.json"), encoding="utf-8") as fp:
        return json.load(fp)


def fetch(mint):
    raw = {"mint": mint, "fetched_at": int(time.time())}
    raw["dex"] = dex_pairs(mint)
    raw["rugcheck"] = get_json(f"{RUGCHECK}/tokens/{mint}/report", "RugCheck")
    g = get_json(f"{GOPLUS}/solana/token_security?contract_addresses={mint}", "GoPlus")
    raw["goplus"] = ((g or {}).get("result") or {}).get(mint) if isinstance(g, dict) else None
    raw["pump"] = pump_coin(mint) if (mint.endswith("pump") or any(
        p.get("dexId") in ("pumpfun", "pumpswap") for p in raw["dex"])) else None
    raw["orders"] = get_json(f"{DEX}/orders/v1/solana/{mint}", "DexScreener orders")
    return raw


def extract(raw):
    """各APIの生データから判定に使う指標を取り出す。取れない項目はキー自体を作らない(=判定不可)。"""
    m = {"mint": raw["mint"], "sources": [], "socials": {}}
    pairs = raw.get("dex") or []
    p = main_pair(pairs)
    if p:
        m["sources"].append("DexScreener")
        bt = p.get("baseToken") or {}
        tx = (p.get("txns") or {}).get("h24") or {}
        created = [q.get("pairCreatedAt") for q in pairs if q.get("pairCreatedAt")]
        m.update(symbol=bt.get("symbol"), name=bt.get("name"), price=num(p.get("priceUsd"), None),
                 mcap=num(p.get("marketCap") or p.get("fdv"), None),
                 liquidity=sum(num((q.get("liquidity") or {}).get("usd")) for q in pairs),
                 vol24=sum(num((q.get("volume") or {}).get("h24")) for q in pairs),
                 buys24=int(num(tx.get("buys"))), sells24=int(num(tx.get("sells"))),
                 change=(p.get("priceChange") or {}), dex_ids=sorted({q.get("dexId") for q in pairs}),
                 url=p.get("url"))
        if created:
            m["age_h"] = (time.time() * 1000 - min(created)) / 3.6e6
        info = p.get("info") or {}
        for s in info.get("socials") or []:
            m["socials"][s.get("type")] = s.get("url")
        if info.get("websites"):
            m["socials"]["website"] = info["websites"][0].get("url")
    orders = raw.get("orders")
    if isinstance(orders, dict):
        m["dex_paid"] = any(o.get("status") == "approved" for o in orders.get("orders") or [])

    rc = raw.get("rugcheck")
    if isinstance(rc, dict) and rc.get("mint"):
        m["sources"].append("RugCheck")
        known = rc.get("knownAccounts") or {}
        creator = rc.get("creator")
        holders = []
        for h in rc.get("topHolders") or []:
            label = (known.get(h.get("owner")) or known.get(h.get("address")) or {})
            # プールやロッカー等の既知アカウントは「人」ではないので保有率計算から除外
            if label.get("type") and label.get("type") != "CREATOR":
                continue
            holders.append({"owner": h.get("owner"), "pct": num(h.get("pct")), "insider": bool(h.get("insider")),
                            "creator": h.get("owner") == creator or label.get("type") == "CREATOR"})
        supply = num(rc.get("totalSupply") or (rc.get("token") or {}).get("supply"), 0)
        creator_pct = sum(h["pct"] for h in holders if h["creator"])
        if not creator_pct and supply:
            creator_pct = num(rc.get("creatorBalance")) / supply * 100
        m.update(mint_authority=bool(rc.get("mintAuthority")), freeze_authority=bool(rc.get("freezeAuthority")),
                 mutable=(rc.get("tokenMeta") or {}).get("mutable"),
                 transfer_fee_pct=num((rc.get("transferFee") or {}).get("pct")),
                 holders_total=rc.get("totalHolders"), rugged=bool(rc.get("rugged")),
                 top10_pct=sum(h["pct"] for h in holders[:10]),
                 max_holder_pct=max([h["pct"] for h in holders] or [0]),
                 insiders_pct=sum(h["pct"] for h in holders if h["insider"]),
                 graph_insiders=num(rc.get("graphInsidersDetected")),
                 creator=creator, creator_pct=creator_pct,
                 creator_prior=len(rc.get("creatorTokens") or []),
                 rc_score=rc.get("score_normalised"),
                 rc_danger=[r.get("name") for r in rc.get("risks") or [] if r.get("level") == "danger"])
        lp = [num((x.get("lp") or {}).get("lpLockedPct")) for x in rc.get("markets") or [] if x.get("lp")]
        if lp:
            m["lp_locked_pct"] = max(lp)

    gp = raw.get("goplus")
    if isinstance(gp, dict) and gp:
        m["sources"].append("GoPlus")
        # RugCheck が取れなかったときの代替
        if "mint_authority" not in m:
            m["mint_authority"] = (gp.get("mintable") or {}).get("status") == "1"
            m["freeze_authority"] = (gp.get("freezable") or {}).get("status") == "1"
        if "top10_pct" not in m and gp.get("holders"):
            hs = [num(h.get("percent")) * 100 for h in gp["holders"]]
            m.update(top10_pct=sum(hs[:10]), max_holder_pct=max(hs))
        if not m.get("holders_total") and gp.get("holder_count"):
            m["holders_total"] = int(num(gp.get("holder_count")))
        if (gp.get("closable") or {}).get("status") == "1":
            m["closable"] = True

    pc = raw.get("pump")
    if isinstance(pc, dict):
        m["sources"].append("pump.fun")
        m["pump_complete"] = bool(pc.get("complete"))
        m["pump_banned"] = bool(pc.get("is_banned"))
        m["curve_progress"] = curve_progress(pc)
        m.setdefault("creator", pc.get("creator"))
        m.setdefault("symbol", pc.get("symbol"))
        m.setdefault("name", pc.get("name"))
        if m.get("mcap") is None:
            m["mcap"] = num(pc.get("usd_market_cap"), None)
        if "age_h" not in m and pc.get("created_timestamp"):
            m["age_h"] = (time.time() * 1000 - num(pc["created_timestamp"])) / 3.6e6
        for k in ("twitter", "telegram", "website"):
            if pc.get(k):
                m["socials"].setdefault(k, pc[k])
    # pump.fun のカーブ上(未graduate)なら流動性はカーブが持っているので LP 判定は不要
    m["on_curve"] = m.get("pump_complete") is False or (
        bool(m.get("dex_ids")) and all(d == "pumpfun" for d in m["dex_ids"]))
    return m


def evaluate(m, t):
    checks = []

    def add(sev, title, detail):
        checks.append({"sev": sev, "title": title, "detail": detail})

    if m.get("rugged"):
        add(RED, "ラグ済み", "RugCheck が「rugged(既に抜かれた)」と判定")
    if m.get("pump_banned"):
        add(RED, "pump.fun でBAN", "pump.fun 側で banned フラグ")

    if "mint_authority" in m:
        add(RED if m["mint_authority"] else OK, "ミント権限",
            "残っている:開発者が追加発行して価格を潰せる" if m["mint_authority"] else "放棄済み")
        add(RED if m["freeze_authority"] else OK, "フリーズ権限",
            "残っている:あなたのトークンを凍結して売れなくできる" if m["freeze_authority"] else "放棄済み")
    else:
        add(NA, "ミント/フリーズ権限", "データ取得できず")
    if m.get("closable"):
        add(YELLOW, "クローズ権限", "GoPlus: トークンアカウントを閉じる権限あり")
    if "transfer_fee_pct" in m and m["transfer_fee_pct"] > 0:
        add(RED if m["transfer_fee_pct"] > t["max_transfer_fee_pct"] else YELLOW, "送金手数料(税)",
            f"{m['transfer_fee_pct']:.1f}% 取られる")

    if m["on_curve"]:
        prog = m.get("curve_progress")
        add(OK, "流動性/LP", "pump.fun カーブ上(流動性はカーブが保持)" + (f"・graduate進捗 {prog:.0f}%" if prog is not None else ""))
    else:
        if "lp_locked_pct" in m:
            v = m["lp_locked_pct"]
            add(OK if v >= t["min_lp_locked_pct"] else RED, "LPロック/バーン",
                f"{v:.0f}%" + ("" if v >= t["min_lp_locked_pct"] else ":流動性を引き抜かれる危険"))
        else:
            add(NA, "LPロック/バーン", "データ取得できず")
        if "liquidity" in m:
            ok = m["liquidity"] >= t["min_liquidity_usd"]
            add(OK if ok else YELLOW, "流動性", f"{usd(m['liquidity'])}" + ("" if ok else ":薄く、売るときに価格が大きく動く"))

    if "top10_pct" in m:
        v, mx = m["top10_pct"], t["max_top10_pct"]
        add(OK if v <= mx else (RED if v > mx * 1.5 else YELLOW), "上位10ホルダー集中", f"{v:.1f}%(目安 {mx}% 以下)")
        v, mx = m["max_holder_pct"], t["max_single_holder_pct"]
        add(OK if v <= mx else (RED if v > mx * 2 else YELLOW), "最大ホルダー", f"{v:.1f}%(目安 {mx}% 以下)")
    else:
        add(NA, "ホルダー集中", "データ取得できず")
    if "insiders_pct" in m:
        v = m["insiders_pct"]
        add(OK if v <= t["max_insiders_pct"] else RED, "インサイダー保有", f"{v:.1f}%(関係者とみられるウォレット)")
    if m.get("graph_insiders"):
        add(YELLOW, "インサイダー網", f"つながったウォレット群を {m['graph_insiders']:.0f} 件検出(バンドル購入の疑い)")
    if "creator_pct" in m:
        v = m["creator_pct"]
        add(OK if v <= t["max_creator_pct"] else YELLOW, "開発者の保有", f"{v:.1f}%")
    if m.get("holders_total") is not None:
        v = int(num(m["holders_total"]))
        add(OK if v >= t["min_holders"] else YELLOW, "ホルダー数", f"{v:,}")
    if "creator_prior" in m:
        v = m["creator_prior"]
        add(OK if v <= t["max_creator_prior_tokens"] else YELLOW, "開発者の過去発行数",
            f"{v} 件" + ("" if v <= t["max_creator_prior_tokens"] else ":量産型の可能性(dev.py で詳細確認)"))
    if m.get("mutable"):
        add(YELLOW, "メタデータ変更可", "名前・画像を後から変えられる")
    if m.get("rc_danger"):
        add(YELLOW, "RugCheck の危険項目", "、".join(m["rc_danger"][:5]))

    ch = m.get("change") or {}
    if num(ch.get("h24")) > t["parabolic_h24_pct"]:
        add(YELLOW, "急騰後", f"24h {pct(ch.get('h24'), True)}:高値掴みに注意")
    if m.get("buys24") is not None and m.get("sells24", 0) > max(m.get("buys24", 0), 1) * t["sell_buy_ratio_warn"]:
        add(YELLOW, "売り優勢", f"24h 買い {m['buys24']:,} / 売り {m['sells24']:,}")
    if m.get("age_h") is not None and m["age_h"] < t["young_age_hours"]:
        add(YELLOW, "誕生直後", f"{hours(m['age_h'])}:データが少なく判定の信頼度が低い")
    if not m["socials"]:
        add(YELLOW, "SNSなし", "X/Telegram/サイトの登録なし")
    return checks


def verdict(checks, m):
    reds = sum(c["sev"] == RED for c in checks)
    yellows = sum(c["sev"] == YELLOW for c in checks)
    if not m["sources"] or ("RugCheck" not in m["sources"] and "GoPlus" not in m["sources"]):
        return NA, "判定不可(安全性データが取れない)"
    if reds:
        return RED, f"危険:見送り推奨(重大 {reds} 件・注意 {yellows} 件)"
    if yellows >= 3:
        return YELLOW, f"要注意(注意 {yellows} 件)"
    if yellows:
        return YELLOW, f"軽い注意あり(注意 {yellows} 件)"
    return OK, "大きな危険サインなし(安全の保証ではない)"


def render(m, checks, v):
    name = f"{m.get('name') or '?'} (${m.get('symbol') or '?'})"
    print(f"■ {name}  {m['mint']}")
    ch = m.get("change") or {}
    print(f"  時価総額 {usd(m.get('mcap'))} ・流動性 {usd(m.get('liquidity'))} ・24h出来高 {usd(m.get('vol24'))}"
          f" ・誕生 {hours(m.get('age_h'))}前")
    print(f"  値動き 1h {pct(ch.get('h1'), True)} / 6h {pct(ch.get('h6'), True)} / 24h {pct(ch.get('h24'), True)}"
          f" ・開発者 {short(m.get('creator'))}" + (" ・DEX広告支払い済み" if m.get("dex_paid") else ""))
    print(f"\n判定: {v[0]} {v[1]}")
    order = {RED: 0, YELLOW: 1, NA: 2, OK: 3}
    for c in sorted(checks, key=lambda c: order[c["sev"]]):
        print(f"  {c['sev']} {c['title']}: {c['detail']}")
    if m["socials"]:
        print("\nSNS: " + " ・".join(f"{k}: {u}" for k, u in m["socials"].items() if u))
    if m.get("url"):
        print(f"チャート: {m['url']}")
    print(f"データ源: {', '.join(m['sources']) or 'なし'}")


def main():
    th = load_thresholds()
    offline = arg("--offline")
    if offline:
        with open(offline, encoding="utf-8") as fp:
            raw = json.load(fp)
    else:
        mint = next((a for a in sys.argv[1:] if is_address(a)), None)
        if not mint:
            sys.exit("使い方: python3 check.py <コントラクトアドレス(CA)> [--json] [--save raw.json]")
        raw = fetch(mint)
        if arg("--save"):
            with open(arg("--save"), "w", encoding="utf-8") as fp:
                json.dump(raw, fp, ensure_ascii=False)
    m = extract(raw)
    checks = evaluate(m, th)
    v = verdict(checks, m)
    if flag("--json"):
        print(json.dumps({"verdict": v[1], "level": v[0], "metrics": m, "checks": checks}, ensure_ascii=False, default=str))
    else:
        render(m, checks, v)
        print_errors()


if __name__ == "__main__":
    main()
