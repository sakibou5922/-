#!/usr/bin/env python3
"""X（旧Twitter）の文字数カウンタ。twitter-text v3 の重み付けルールを標準ライブラリだけで再現する。

ルール:
  - 本文は NFC 正規化してから数える
  - U+0000-U+10FF / U+2000-U+200D / U+2010-U+201F / U+2032-U+2037 は 1
  - それ以外（日本語・全角記号など）は 2
  - 絵文字は ZWJ 結合・肌色・異体字セレクタ込みで 1 つにつき 2
  - URL は長さに関係なく 23
  - 上限は 280（日本語だけなら 140 文字）。Premium の長文投稿は 25,000

使い方:
  python3 x/scripts/x_count.py "本文"
  python3 x/scripts/x_count.py -f draft.txt
  python3 x/scripts/x_count.py -f thread.txt --split   # 空行 + '---' 区切りでスレッドを個別に判定
"""
import argparse
import re
import sys
import signal
import unicodedata

signal.signal(signal.SIGPIPE, signal.SIG_DFL)  # head などで出力を途中で切っても落ちないように

LIMIT = 280
LONG_LIMIT = 25000
URL_LEN = 23
LIGHT_RANGES = ((0x0000, 0x10FF), (0x2000, 0x200D), (0x2010, 0x201F), (0x2032, 0x2037))
URL_RE = re.compile(r"https?://[^\s　-ヿ一-鿿]+|(?<![@\w])(?:[a-z0-9-]+\.)+(?:com|net|org|jp|io|co|me|ly|app|dev|link|info)(?:/[^\s　-ヿ一-鿿]*)?", re.I)

EMOJI_RANGES = (
    (0x1F000, 0x1FAFF), (0x2600, 0x27BF), (0x2300, 0x23FF), (0x2B00, 0x2BFF),
    (0x1F1E6, 0x1F1FF), (0x3030, 0x3030), (0x303D, 0x303D), (0x3297, 0x3299),
)
JOINERS = {0x200D, 0xFE0F, 0xFE0E, 0x20E3}


def is_emoji(cp):
    return any(a <= cp <= b for a, b in EMOJI_RANGES)


def is_modifier(cp):
    return 0x1F3FB <= cp <= 0x1F3FF or 0xE0020 <= cp <= 0xE007F or cp in JOINERS


def weight_of(cp):
    return 1 if any(a <= cp <= b for a, b in LIGHT_RANGES) else 2


def count_plain(text):
    total, i, cps = 0, 0, [ord(c) for c in text]
    while i < len(cps):
        cp = cps[i]
        keycap = i + 1 < len(cps) and cps[i + 1] in (0xFE0F, 0x20E3) and chr(cp) in "0123456789#*"
        if is_emoji(cp) or keycap:
            total += 2
            i += 1
            if 0x1F1E6 <= cp <= 0x1F1FF and i < len(cps) and 0x1F1E6 <= cps[i] <= 0x1F1FF:
                i += 1  # 国旗は2コードポイントで1絵文字
            while i < len(cps) and (is_modifier(cps[i]) or (cps[i - 1] == 0x200D and is_emoji(cps[i]))):
                i += 1
            continue
        total += weight_of(cp)
        i += 1
    return total


def count(text):
    text = unicodedata.normalize("NFC", text)
    urls = URL_RE.findall(text)
    stripped = URL_RE.sub("", text)
    return count_plain(stripped) + URL_LEN * len(urls), len(urls)


def report(text, label=""):
    n, urls = count(text)
    rest = LIMIT - n
    status = "OK" if rest >= 0 else ("長文投稿(Premium)なら可" if n <= LONG_LIMIT else "NG")
    head = f"[{label}] " if label else ""
    print(f"{head}{n}/{LIMIT}（残り{rest}・日本語換算 約{n / 2:.0f}字・URL {urls}件） → {status}")
    first = text.strip().splitlines()[0] if text.strip() else ""
    if first:
        fn, _ = count(first)
        print(f"{head}  1行目: {fn}（タイムラインで最初に見える部分。目安は日本語25〜35字＝50〜70）")
    return rest >= 0


def main():
    p = argparse.ArgumentParser(description="X文字数カウンタ（twitter-text v3準拠）")
    p.add_argument("text", nargs="?")
    p.add_argument("-f", "--file")
    p.add_argument("--split", action="store_true", help="'---' 行でスレッドを分割して個別判定")
    a = p.parse_args()
    if a.file:
        body = open(a.file, encoding="utf-8").read()
    elif a.text is not None:
        body = a.text
    else:
        body = sys.stdin.read()
    if a.split:
        parts = [s.strip() for s in re.split(r"^\s*---\s*$", body, flags=re.M) if s.strip()]
        ok = all([report(s, f"{i + 1}/{len(parts)}") for i, s in enumerate(parts)])
    else:
        ok = report(body.rstrip("\n"))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
