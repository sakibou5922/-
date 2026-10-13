#!/usr/bin/env python3
"""売買記録と振り返り。記録はローカルの JSON ファイルにだけ保存される(外部送信なし)。

使い方:
  python3 journal.py add <CA> --sol 0.5 --reason "KOLが買っていた" --tags kol,動物系 [--price 0.0000123] [--verdict 要注意]
  python3 journal.py close <ID> [--price 0.0000456] [--note "半値で損切り"]
  python3 journal.py list [--open]
  python3 journal.py review [--mark]    # 勝率・平均損益・タグ別成績。--mark で保有中の含み損益も表示
  python3 journal.py delete <ID>
価格を省略すると DexScreener の現在価格(USD)を使う。
保存先: 環境変数 MEMECOIN_JOURNAL、なければ ~/.memecoin/journal.json
"""
import json
import os
import statistics
import sys
import time

from common import arg, dex_pairs, hours, is_address, main_pair, num, print_errors, usd

PATH = os.environ.get("MEMECOIN_JOURNAL", os.path.expanduser("~/.memecoin/journal.json"))


def load():
    if not os.path.exists(PATH):
        return []
    with open(PATH, encoding="utf-8") as fp:
        return json.load(fp)


def save(rows):
    os.makedirs(os.path.dirname(PATH) or ".", exist_ok=True)
    tmp = PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fp:
        json.dump(rows, fp, ensure_ascii=False, indent=1)
    os.replace(tmp, PATH)


def live(mint):
    p = main_pair(dex_pairs(mint))
    if not p:
        return None, None, None
    return num(p.get("priceUsd"), None), (p.get("baseToken") or {}).get("symbol"), num(p.get("marketCap"), None)


def ret(r, price=None):
    exit_p = price if price is not None else r.get("exit_price")
    if not exit_p or not r.get("entry_price"):
        return None
    return (exit_p / r["entry_price"] - 1) * 100


def find(rows, rid):
    for r in rows:
        if r["id"] == rid:
            return r
    sys.exit(f"ID {rid} の記録が見つかりません")


def cmd_add(rows):
    mint = next((a for a in sys.argv[2:] if is_address(a)), None)
    if not mint:
        sys.exit("使い方: journal.py add <CA> --sol 0.5 --reason \"理由\" [--tags a,b] [--price P]")
    price, sym, mcap = arg("--price", None, float), None, None
    if price is None:
        price, sym, mcap = live(mint)
        if price is None:
            sys.exit("現在価格を取得できませんでした。--price で手入力してください")
    rid = max([r["id"] for r in rows] or [0]) + 1
    rows.append({"id": rid, "mint": mint, "symbol": arg("--symbol") or sym, "entry_time": int(time.time()),
                 "entry_price": price, "entry_mcap": mcap, "size_sol": arg("--sol", None, float),
                 "reason": arg("--reason", ""), "tags": [t for t in arg("--tags", "").split(",") if t],
                 "verdict": arg("--verdict"), "exit_time": None, "exit_price": None, "note": None})
    save(rows)
    print(f"記録しました #{rid} {rows[-1]['symbol'] or ''} 価格 {usd(price)} 時価総額 {usd(mcap)}")


def cmd_close(rows):
    rid = int(sys.argv[2])
    r = find(rows, rid)
    price = arg("--price", None, float)
    if price is None:
        price = live(r["mint"])[0]
        if price is None:
            sys.exit("現在価格を取得できませんでした。--price で手入力してください")
    r.update(exit_time=int(time.time()), exit_price=price, note=arg("--note"))
    save(rows)
    print(f"決済しました #{rid} {r['symbol'] or ''} 損益 {ret(r):+.1f}%")


def cmd_list(rows):
    only_open = "--open" in sys.argv
    shown = [r for r in rows if not (only_open and r["exit_time"])]
    if not shown:
        print("記録はまだありません")
    for r in shown:
        state = f"決済 {ret(r):+.1f}%" if r["exit_time"] else "保有中"
        print(f"#{r['id']:<3} {str(r['symbol'])[:10]:<10} {state:<12} {r.get('size_sol') or '—'} SOL"
              f"  理由: {r['reason']}  タグ: {','.join(r['tags']) or '—'}  判定: {r.get('verdict') or '—'}")


def group_stats(closed, key):
    groups = {}
    for r in closed:
        for k in key(r):
            groups.setdefault(k, []).append(ret(r))
    return sorted(((k, len(v), sum(x > 0 for x in v) / len(v) * 100, statistics.mean(v)) for k, v in groups.items()),
                  key=lambda g: -g[3])


def cmd_review(rows):
    closed = [r for r in rows if r["exit_time"] and ret(r) is not None]
    if not closed:
        print("決済済みの記録がまだありません")
    else:
        rs = [ret(r) for r in closed]
        wins = [x for x in rs if x > 0]
        print(f"■ 振り返り(決済済み {len(closed)} 件)")
        print(f"  勝率 {len(wins) / len(rs) * 100:.0f}% ・平均 {statistics.mean(rs):+.1f}% ・中央値 {statistics.median(rs):+.1f}%")
        sized = [(r["size_sol"] or 0) * ret(r) / 100 for r in closed if r.get("size_sol")]
        if sized:
            print(f"  損益合計(概算) {sum(sized):+.3f} SOL ※SOL価格の変動は考慮していません")
        best, worst = max(closed, key=ret), min(closed, key=ret)
        print(f"  最高 #{best['id']} {best['symbol']} {ret(best):+.0f}%(理由: {best['reason']})")
        print(f"  最悪 #{worst['id']} {worst['symbol']} {ret(worst):+.0f}%(理由: {worst['reason']})")
        hold_w = [(r["exit_time"] - r["entry_time"]) / 3600 for r in closed if ret(r) > 0]
        hold_l = [(r["exit_time"] - r["entry_time"]) / 3600 for r in closed if ret(r) <= 0]
        if hold_w and hold_l:
            print(f"  平均保有時間: 勝ち {hours(statistics.mean(hold_w))} / 負け {hours(statistics.mean(hold_l))}")
        for title, key in (("タグ別", lambda r: r["tags"] or ["(タグなし)"]),
                           ("エントリー時の判定別", lambda r: [r.get("verdict") or "(未記録)"])):
            print(f"\n  {title}:  件数 / 勝率 / 平均損益")
            for k, n, wr, avg in group_stats(closed, key):
                print(f"    {k:<14} {n:>3} 件  {wr:>4.0f}%  {avg:+7.1f}%")
    open_rows = [r for r in rows if not r["exit_time"]]
    if open_rows:
        print(f"\n■ 保有中 {len(open_rows)} 件")
        for r in open_rows:
            line = f"  #{r['id']} {r['symbol']} 保有 {hours((time.time() - r['entry_time']) / 3600)}"
            if "--mark" in sys.argv:
                p = live(r["mint"])[0]
                line += f" ・含み損益 {ret(r, p):+.1f}%" if p else " ・現在価格取得できず"
            print(line)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    rows = load()
    if cmd == "add":
        cmd_add(rows)
    elif cmd == "close":
        cmd_close(rows)
    elif cmd == "review":
        cmd_review(rows)
    elif cmd == "delete":
        rid = int(sys.argv[2])
        find(rows, rid)
        save([r for r in rows if r["id"] != rid])
        print(f"#{rid} を削除しました")
    else:
        cmd_list(rows)
    print_errors()


if __name__ == "__main__":
    main()
