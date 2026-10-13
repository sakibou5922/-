#!/usr/bin/env python3
"""自動スキャン: コイン探し → 詐欺チェック → 危険なものを除いて Discord に通知。
タスクスケジューラ(Windows)や cron(Mac/Linux)から定期実行する想定。

使い方:
  python3 autoscan.py              # 1回スキャンして通知
  python3 autoscan.py --dry-run    # 通知せず画面に表示だけ(動作確認用)
  python3 autoscan.py --test-discord   # Discord にテストメッセージを送る
  python3 autoscan.py --log FILE   # 出力をファイルに追記(タスクスケジューラ用)
Windows の自動実行設定は setup_windows.ps1 で行う。
オプション: --max-check 10(1回に詐欺チェックする上限) --max-notify 5 --allow-yellow 2(注意が何件までなら通知するか)
設定: ~/.memecoin/config.json に {"discord_webhook": "https://discord.com/api/webhooks/..."}
      (環境変数 MEMECOIN_DISCORD_WEBHOOK でも可)
同じコインは24時間は再通知しない(~/.memecoin/seen.json)。レポートは ~/.memecoin/reports/ にも保存。
"""
import json
import os
import sys
import time
import urllib.request

import check
import discover
from common import ERRORS, UA, arg, flag, hours, num, pct, usd

HOME = os.path.join(os.path.expanduser("~"), ".memecoin")
SEEN = os.path.join(HOME, "seen.json")
CONFIG = os.path.join(HOME, "config.json")
SEEN_TTL = 24 * 3600


def load_json(path, default):
    try:
        # utf-8-sig: Windows のメモ帳/PowerShell が付ける BOM があっても読めるように
        with open(path, encoding="utf-8-sig") as fp:
            return json.load(fp)
    except (OSError, ValueError):
        return default


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fp:
        json.dump(data, fp, ensure_ascii=False, indent=1)


def webhook_url():
    return os.environ.get("MEMECOIN_DISCORD_WEBHOOK") or load_json(CONFIG, {}).get("discord_webhook")


def post_discord(payload):
    url = webhook_url()
    if not url:
        print("Discord の Webhook URL が未設定です(~/.memecoin/config.json)")
        return False
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={**UA, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20):
            return True
    except Exception as e:  # noqa: BLE001
        print(f"Discord への送信に失敗: {e}")
        return False


def candidates(seen, max_check):
    o = {"min_mcap": arg("--min-mcap", 10000.0, float), "max_mcap": arg("--max-mcap", 500000.0, float),
         "max_age_h": arg("--max-age-h", 24.0, float), "min_vol": arg("--min-vol", 20000.0, float),
         "min_progress": arg("--min-progress", 70.0, float)}
    picks = []
    trending = discover.mode_trending(o)
    graduating = discover.mode_graduating(o)
    # 動いているもの 6 : graduate 直前 4 の割合で選ぶ
    for rows, n, tag in ((trending, max_check * 6 // 10, "急上昇"), (graduating, max_check, "graduate直前")):
        for r in rows:
            if len([p for p in picks if p[1] == tag]) >= n or len(picks) >= max_check:
                break
            if r["ca"] not in seen and r["ca"] not in [p[0] for p in picks]:
                picks.append((r["ca"], tag))
    return picks


def embed(m, checks, v, tag):
    ch = m.get("change") or {}
    warns = [f"🟡 {c['title']}: {c['detail']}" for c in checks if c["sev"] == check.YELLOW]
    lines = [f"時価総額 **{usd(m.get('mcap'))}** ・流動性 {usd(m.get('liquidity'))} ・24h出来高 {usd(m.get('vol24'))}",
             f"誕生 {hours(m.get('age_h'))}前 ・1h {pct(ch.get('h1'), True)} ・24h {pct(ch.get('h24'), True)}"
             f" ・ホルダー {int(num(m.get('holders_total'))):,}"]
    if m.get("curve_progress") is not None and m.get("on_curve"):
        lines.append(f"graduate 進捗 {m['curve_progress']:.0f}%")
    lines += warns[:4] or ["大きな危険サインなし"]
    lines.append(f"`{m['mint']}`")
    return {"title": f"${m.get('symbol') or '?'} {m.get('name') or ''} [{tag}]"[:250],
            "url": m.get("url") or f"https://dexscreener.com/solana/{m['mint']}",
            "description": "\n".join(lines)[:4000],
            "color": 0x2ECC71 if v[0] == check.OK else 0xF1C40F,
            "footer": {"text": f"{v[0]} {v[1]}"}}


def main():
    log = arg("--log")
    if log:  # 画面なし(pythonw)で動かすときはログファイルに書く
        os.makedirs(os.path.dirname(os.path.abspath(log)), exist_ok=True)
        sys.stdout = sys.stderr = open(log, "a", encoding="utf-8")
    if flag("--test-discord"):
        ok = post_discord({"content": "✅ ミームコイン自動スキャンの通知テストです。"})
        print("送信しました" if ok else "送信できませんでした")
        return
    th = check.load_thresholds()
    now = time.time()
    seen = {k: t for k, t in load_json(SEEN, {}).items() if now - t < SEEN_TTL}
    picks = candidates(seen, arg("--max-check", 10, int))
    print(f"[{time.strftime('%Y-%m-%d %H:%M')}] チェック対象 {len(picks)} 件")
    allow_yellow = arg("--allow-yellow", 2, int)
    hits = []
    for mint, tag in picks:
        m = check.extract(check.fetch(mint))
        checks = check.evaluate(m, th)
        v = check.verdict(checks, m)
        if v[0] == check.NA:
            print(f"  ⚪ {mint} データ不足のため保留")
            continue
        seen[mint] = now  # チェック済み(危険と出たものも24時間は再チェックしない)
        n_yellow = sum(c["sev"] == check.YELLOW for c in checks)
        print(f"  {v[0]} {m.get('symbol')} {v[1]}")
        if v[0] != check.RED and n_yellow <= allow_yellow:
            hits.append((n_yellow, -num(m.get("vol24")), m, checks, v, tag))
        time.sleep(1.0)  # 公開APIの回数制限対策
    save_json(SEEN, seen)

    hits.sort(key=lambda h: (h[0], h[1]))
    hits = hits[:arg("--max-notify", 5, int)]
    if hits:
        report = os.path.join(HOME, "reports", time.strftime("%Y-%m-%d") + ".md")
        os.makedirs(os.path.dirname(report), exist_ok=True)
        with open(report, "a", encoding="utf-8") as fp:
            for _, _, m, _, v, tag in hits:
                fp.write(f"- {time.strftime('%H:%M')} [{tag}] ${m.get('symbol')} {usd(m.get('mcap'))} {v[0]} {v[1]} {m['mint']}\n")
        if flag("--dry-run"):
            for h in hits:
                print(json.dumps(embed(h[2], h[3], h[4], h[5]), ensure_ascii=False, indent=1))
        else:
            post_discord({"content": f"🔎 自動スキャン:{len(hits)} 件(※危険サインの機械チェックのみ。買う前に必ず自分で確認)",
                          "embeds": [embed(m, c, v, tag) for _, _, m, c, v, tag in hits]})
    print(f"  通知 {len(hits)} 件")
    if ERRORS and not picks:
        print("  データ取得エラー: " + " / ".join(dict.fromkeys(ERRORS)))


if __name__ == "__main__":
    main()
