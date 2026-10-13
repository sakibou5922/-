#!/usr/bin/env python3
"""新しいコイン探し: pump.fun と DexScreener から候補を集めて条件で絞り込む。

使い方:
  python3 discover.py trending      # 今動いているコイン(出来高/時価総額の比が高い順)
  python3 discover.py new           # 誕生したばかりのコイン(pump.fun)
  python3 discover.py graduating    # graduate 直前(ボンディングカーブ進捗が高い順)
オプション:
  --min-mcap 10000 --max-mcap 500000 --max-age-h 72 --min-vol 20000 --min-progress 70 --limit 15 --json
次の一手: 気になったものは check.py <CA> で詐欺チェックする。
"""
import json
import sys
import time

from common import (DEX, ERRORS, PUMP, arg, curve_progress, dex_pairs_bulk, flag, get_json, hours, main_pair, num,
                    print_errors, usd)


def pump_list(sort, pages=4, nsfw=False):
    coins = []
    for off in range(0, pages * 50, 50):
        r = get_json(f"{PUMP}/coins?offset={off}&limit=50&sort={sort}&order=DESC&includeNsfw={str(nsfw).lower()}",
                     f"pump.fun({sort})")
        if not isinstance(r, list) or not r:
            break
        coins.extend(r)
    return coins


def age_h(ts_ms):
    return (time.time() * 1000 - num(ts_ms)) / 3.6e6 if ts_ms else None


def has_social(c):
    return any(c.get(k) for k in ("twitter", "telegram", "website"))


def mode_new(o):
    rows = []
    for c in pump_list("created_timestamp", pages=2):
        a = age_h(c.get("created_timestamp"))
        if a is None or a > o["max_age_h"]:
            continue
        rows.append({"symbol": c.get("symbol"), "ca": c.get("mint"), "age_h": a, "mcap": num(c.get("usd_market_cap")),
                     "progress": curve_progress(c), "replies": c.get("reply_count", 0), "social": has_social(c)})
    # SNS があり、コメントが付いているものを上に
    rows.sort(key=lambda r: (not r["social"], -num(r["replies"]), -r["mcap"]))
    return rows


def mode_graduating(o):
    rows = []
    for c in pump_list("market_cap", pages=4):
        if c.get("complete"):
            continue
        prog = curve_progress(c)
        if prog is None or prog < o["min_progress"]:
            continue
        rows.append({"symbol": c.get("symbol"), "ca": c.get("mint"), "age_h": age_h(c.get("created_timestamp")),
                     "mcap": num(c.get("usd_market_cap")), "progress": prog, "replies": c.get("reply_count", 0),
                     "social": has_social(c)})
    rows.sort(key=lambda r: -r["progress"])
    return rows


def mode_trending(o):
    cands = {}
    for sort in ("last_trade_timestamp", "market_cap"):
        for c in pump_list(sort, pages=4):
            a, mc = age_h(c.get("created_timestamp")), num(c.get("usd_market_cap"))
            if a is not None and a <= o["max_age_h"] and o["min_mcap"] * 0.5 <= mc <= o["max_mcap"] * 2:
                cands.setdefault(c["mint"], "pump.fun")
    for url, tag in ((f"{DEX}/token-profiles/latest/v1", "Dex新着"), (f"{DEX}/token-boosts/latest/v1", "Dex広告")):
        for x in get_json(url, tag) or []:
            if isinstance(x, dict) and x.get("chainId") == "solana" and x.get("tokenAddress"):
                cands.setdefault(x["tokenAddress"], tag)
    print(f"候補 {len(cands)} 件を DexScreener で確認中…", file=sys.stderr)
    pairs = dex_pairs_bulk(list(cands))
    rows = []
    for mint, src in cands.items():
        p = main_pair(pairs.get(mint) or [])
        if not p:
            continue
        created = [q.get("pairCreatedAt") for q in pairs[mint] if q.get("pairCreatedAt")]
        a = age_h(min(created)) if created else None
        mcap = num(p.get("marketCap") or p.get("fdv"))
        vol = sum(num((q.get("volume") or {}).get("h24")) for q in pairs[mint])
        liq = sum(num((q.get("liquidity") or {}).get("usd")) for q in pairs[mint])
        tx = (p.get("txns") or {}).get("h24") or {}
        b, s = int(num(tx.get("buys"))), int(num(tx.get("sells")))
        if not (o["min_mcap"] <= mcap <= o["max_mcap"]) or vol < o["min_vol"]:
            continue
        if a is not None and a > o["max_age_h"]:
            continue
        rows.append({"symbol": (p.get("baseToken") or {}).get("symbol"), "ca": mint, "src": src, "age_h": a,
                     "mcap": mcap, "liq": liq, "vol24": vol, "turnover": vol / max(mcap, 1),
                     "buy_pct": b / max(b + s, 1) * 100, "h1": (p.get("priceChange") or {}).get("h1"),
                     "h24": (p.get("priceChange") or {}).get("h24")})
    rows.sort(key=lambda r: -min(r["turnover"], 20))
    return rows


def render(mode, rows, limit):
    if not rows and ERRORS:
        print("データを取得できませんでした(ネットワークか API の不調。少し待って再実行)。")
        return
    if not rows:
        print("条件に合うコインはありませんでした(条件を緩めるか、時間をおいて再実行)。")
        return
    for i, r in enumerate(rows[:limit], 1):
        line = f"{i:>2}. {str(r['symbol'])[:10]:<10} 時価総額 {usd(r['mcap']):>8} ・誕生 {hours(r['age_h']):>7}前"
        if mode == "trending":
            line += (f" ・24h出来高 {usd(r['vol24'])}({r['turnover']:.1f}倍) ・流動性 {usd(r['liq'])}"
                     f" ・買い比率 {r['buy_pct']:.0f}% ・1h {num(r['h1']):+.0f}% ・[{r['src']}]")
        else:
            prog = "—" if r["progress"] is None else f"{r['progress']:.0f}%"
            line += f" ・カーブ進捗 {prog} ・コメント {r['replies']} ・SNS {'あり' if r['social'] else 'なし'}"
        print(line)
        print(f"    CA: {r['ca']}")
    print("\n※ これは「動いているコイン」の一覧で、安全性は未確認です。気になるものは check.py <CA> で必ずチェック。")


def main():
    mode = next((a for a in sys.argv[1:] if a in ("trending", "new", "graduating")), "trending")
    o = {"min_mcap": arg("--min-mcap", 10000.0, float), "max_mcap": arg("--max-mcap", 500000.0, float),
         "max_age_h": arg("--max-age-h", 1.0 if mode == "new" else 72.0, float),
         "min_vol": arg("--min-vol", 20000.0, float), "min_progress": arg("--min-progress", 70.0, float)}
    limit = arg("--limit", 15, int)
    rows = {"trending": mode_trending, "new": mode_new, "graduating": mode_graduating}[mode](o)
    if flag("--json"):
        print(json.dumps(rows[:limit], ensure_ascii=False))
    else:
        render(mode, rows, limit)
        print_errors()


if __name__ == "__main__":
    main()
