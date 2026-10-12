"""絵コンテ「ラテは、ネコの手も借りたい」を約90秒の動画にする。

映像: 各コマを切り出してカメラワーク(寄り・引き・パン・揺れ)を付け、字幕を重ねる。
音声: BGMと効果音をnumpyで合成する。
"""
import math
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = sys.argv[1]
OUT = sys.argv[2]
W, H, FPS = 1280, 720, 30
SR = 44100
FONT = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"
XF = 0.5  # クロスフェード秒数

board = Image.open(SRC).convert("RGB")

# 各コマの内側の矩形 (左上の番号バッジは避けて切り出す)
COLS = [(19, 319), (336, 636), (653, 950), (968, 1266), (1283, 1583), (1600, 1897)]
ROWS = [(99, 250), (300, 461)]


def panel_image(i):
    (x0, x1), (y0, y1) = COLS[i % 6], ROWS[i // 6]
    x0 += 44  # 番号バッジを除外
    w, h = x1 - x0, y1 - y0
    if w / h > 16 / 9:
        nw = int(h * 16 / 9)
        x0 += (w - nw) // 2
        w = nw
    else:
        nh = int(w * 9 / 16)
        y0 += (h - nh) // 2
        h = nh
    crop = board.crop((x0, y0, x0 + w, y0 + h))
    # 2段階で拡大してからシャープをかけ、ぼやけを抑える
    big = crop.resize((w * 3, h * 3), Image.LANCZOS)
    big = big.filter(ImageFilter.UnsharpMask(radius=2, percent=80, threshold=2))
    big = big.resize((int(W * 1.4), int(H * 1.4)), Image.LANCZOS)
    big = big.filter(ImageFilter.UnsharpMask(radius=1.5, percent=60, threshold=1))
    return big


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * min(max(t, 0), 1))


# (秒数, 字幕, カメラ: (開始zoom, 終了zoom, 開始中心(x,y), 終了中心(x,y)), 揺れ)
# 中心座標は 0..1 (画像に対する相対位置)、zoom=1 で全体
SHOTS = [
    (5.0, "小さなカフェ、開店。", (1.00, 1.18, (0.50, 0.50), (0.52, 0.48)), 0),            # 引き・外観
    (5.0, "初めてのお客さんだ。", (1.05, 1.20, (0.50, 0.50), (0.50, 0.42)), 0),            # 中景・正面
    (6.0, "ハートまで、あと少し。", (1.05, 1.40, (0.50, 0.50), (0.46, 0.62)), 0),          # 寄り・真上
    (7.0, "そこへ、猫の手。", (1.10, 1.35, (0.40, 0.50), (0.60, 0.42)), 0),                # 寄り・手元
    (8.0, "犯人は、知らん顔。", (1.10, 1.22, (0.45, 0.50), (0.55, 0.50)), 0),              # 中景・二人
    (8.0, "絶対に守るぞ。", (1.00, 1.04, (0.50, 0.50), (0.50, 0.50)), 0),                  # 引き・固定
    (8.0, "壁なんて、おかまいなし。", (1.25, 1.15, (0.35, 0.40), (0.62, 0.50)), 0.3),      # あおり・追従
    (9.0, "守るほど、大さわぎ。", (1.20, 1.20, (0.38, 0.50), (0.62, 0.50)), 1.0),          # 中景・横移動
    (8.0, "あっ。", (1.00, 1.45, (0.50, 0.50), (0.42, 0.45)), 0.4),                        # 寄り・スロー
    (6.0, "なんだか、そっくり。", (1.02, 1.08, (0.50, 0.50), (0.50, 0.50)), 0),            # 真上・固定
    (6.0, "失敗が、いちばん人気。", (1.15, 1.25, (0.42, 0.50), (0.55, 0.48)), 0),          # 中景・切り返し
    (8.0, "新しい相棒、採用。", (1.40, 1.00, (0.50, 0.45), (0.50, 0.50)), 0),              # 引き・ゆっくり後退
]
TITLE_DUR = 4.5
END_DUR = 5.0

CREAM = (250, 246, 238)


def card_from_crop(box, scale, extra_text=None, extra_size=34, base=None):
    if base is None:
        img = Image.new("RGB", (W, H), CREAM)
    else:
        img = base.copy()
    piece = board.crop(box)
    piece = piece.resize((int(piece.width * scale), int(piece.height * scale)), Image.LANCZOS)
    # 白背景をクリーム色になじませる (白に近い画素を透過)
    arr = np.asarray(piece).astype(np.float32)
    lum = arr.min(axis=2)
    alpha = np.clip((250 - lum) / 60, 0, 1)
    mask = Image.fromarray((alpha * 255).astype(np.uint8))
    y = H // 2 - piece.height // 2 - (40 if extra_text else 0)
    img.paste(piece, ((W - piece.width) // 2, y), mask)
    if extra_text:
        d = ImageDraw.Draw(img)
        f = ImageFont.truetype(FONT, extra_size)
        tw = d.textlength(extra_text, font=f)
        d.text(((W - tw) / 2, y + piece.height + 40), extra_text, font=f, fill=(90, 70, 55))
    return img


title_card = card_from_crop((22, 2, 830, 92), 1.45, "完璧主義のロボットと、いたずら猫の一杯。")
end_card = card_from_crop((1450, 2, 1900, 60), 1.9, "おわり")

panels = [panel_image(i) for i in range(12)]

# 字幕用フォント
cap_font = ImageFont.truetype(FONT, 40)


def draw_caption(frame, text, alpha):
    if not text or alpha <= 0:
        return frame
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    tw = d.textlength(text, font=cap_font)
    pad_x, pad_y = 34, 16
    bx0, by0 = (W - tw) / 2 - pad_x, H - 110
    bx1, by1 = (W + tw) / 2 + pad_x, H - 110 + 40 + pad_y * 2
    d.rounded_rectangle((bx0, by0, bx1, by1), radius=26, fill=(30, 22, 18, int(150 * alpha)))
    d.text(((W - tw) / 2, by0 + pad_y - 2), text, font=cap_font,
           fill=(255, 250, 240, int(255 * alpha)))
    return Image.alpha_composite(frame.convert("RGBA"), layer).convert("RGB")


def render_shot(idx, t):
    dur, cap, (z0, z1, c0, c1), shake = SHOTS[idx]
    p = ease(t / dur)
    z = z0 + (z1 - z0) * p
    cx = c0[0] + (c1[0] - c0[0]) * p
    cy = c0[1] + (c1[1] - c0[1]) * p
    src = panels[idx]
    sw, sh = src.size
    vw, vh = sw / z, sh / z
    x0 = min(max(cx * sw - vw / 2, 0), sw - vw)
    y0 = min(max(cy * sh - vh / 2, 0), sh - vh)
    if shake:
        amp = shake * 6 * (sw / W)
        x0 += amp * (math.sin(t * 37) + 0.5 * math.sin(t * 71))
        y0 += amp * (math.cos(t * 29) + 0.5 * math.sin(t * 53))
        x0 = min(max(x0, 0), sw - vw)
        y0 = min(max(y0, 0), sh - vh)
    frame = src.transform((W, H), Image.EXTENT, (x0, y0, x0 + vw, y0 + vh), Image.BICUBIC)
    # 字幕: 0.6秒後に表示、終わり0.6秒前に消える
    a = min(1, (t - 0.6) / 0.4, (dur - 0.6 - t) / 0.4)
    return draw_caption(frame, cap, max(0, a))


# タイムライン: [(開始時刻, 長さ, 描画関数)]
timeline = []
t = 0.0
timeline.append((t, TITLE_DUR, lambda lt: title_card))
t += TITLE_DUR
for i, s in enumerate(SHOTS):
    timeline.append((t, s[0], (lambda i: lambda lt: render_shot(i, lt))(i)))
    t += s[0]
timeline.append((t, END_DUR, lambda lt: end_card))
TOTAL = t + END_DUR
SHOT_STARTS = [seg[0] for seg in timeline[1:-1]]

# 外枠のビネット
yy, xx = np.mgrid[0:H, 0:W]
vig = 1 - 0.28 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) ** 1.5
vig = np.clip(vig, 0.6, 1)[..., None].astype(np.float32)


def frame_at(time):
    imgs = []
    for start, dur, fn in timeline:
        # 各セグメントは前後にXF/2ずつはみ出して描画し、重なりをクロスフェード
        if start - XF / 2 <= time < start + dur + XF / 2:
            lt = min(max(time - start, 0), dur)
            w_in = min(1, (time - (start - XF / 2)) / XF)
            w_out = min(1, (start + dur + XF / 2 - time) / XF)
            imgs.append((min(w_in, w_out), fn(lt)))
    if len(imgs) == 1:
        arr = np.asarray(imgs[0][1]).astype(np.float32)
    else:
        tot = sum(w for w, _ in imgs)
        arr = sum(np.asarray(im).astype(np.float32) * (w / tot) for w, im in imgs)
    arr = arr * vig
    # 冒頭のフェードイン / 最後のフェードアウト
    fade = min(1, time / 1.0, (TOTAL - time) / 1.2)
    arr *= max(0, fade)
    return np.clip(arr, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- 音声合成
rng = np.random.default_rng(7)
N = int(TOTAL * SR)
music = np.zeros(N, np.float32)
sfx = np.zeros(N, np.float32)
tt = lambda d: np.arange(int(d * SR)) / SR


def add(buf, t0, sig, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i: i + len(sig)] += sig * gain


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


def pluck(m, d=0.9, bright=1.0):
    x = tt(d)
    f = mtof(m)
    env = np.exp(-x * 4.5) * np.minimum(1, x / 0.004)
    s = (np.sin(2 * np.pi * f * x) + 0.35 * bright * np.sin(4 * np.pi * f * x) * np.exp(-x * 6)
         + 0.12 * bright * np.sin(6 * np.pi * f * x) * np.exp(-x * 9))
    return (s * env).astype(np.float32)


def musicbox(m, d=1.6):
    x = tt(d)
    f = mtof(m)
    env = np.exp(-x * 2.8) * np.minimum(1, x / 0.002)
    s = np.sin(2 * np.pi * f * x) + 0.25 * np.sin(2 * np.pi * f * 3.01 * x) * np.exp(-x * 8)
    return (s * env).astype(np.float32)


def pad(ms, d):
    x = tt(d)
    env = np.minimum(1, x / 0.6) * np.minimum(1, (d - x) / 0.8)
    s = sum(np.sin(2 * np.pi * mtof(m) * x) + 0.3 * np.sin(2 * np.pi * mtof(m) * 2.003 * x) for m in ms)
    return (s * env / len(ms)).astype(np.float32)


def noise(d):
    return rng.standard_normal(int(d * SR)).astype(np.float32)


def smooth_noise(d, k):
    n = noise(d)
    ker = np.ones(k, np.float32) / k
    return np.convolve(n, ker, mode="same") * math.sqrt(k)


CHORDS = {  # Cメジャーの明るい進行
    "C": [48, 52, 55, 60, 64], "G": [43, 50, 55, 59, 62], "Am": [45, 52, 57, 60, 64],
    "F": [41, 48, 53, 57, 60], "Dm": [50, 53, 57, 62, 65], "E": [40, 47, 52, 56, 59],
}
MELODY_A = [72, 74, 76, 79, 76, 74, 72, None, 74, 76, 77, 76, 74, 72, 71, None]
MELODY_B = [79, 77, 76, 74, 76, 77, 79, 81, 79, 76, 74, 72, 74, 76, 72, None]


def section(t0, t1, bpm, progression, melody, mel_inst, busy):
    beat = 60 / bpm
    bar = beat * 4
    n_bars = int((t1 - t0) / bar)
    for b in range(n_bars):
        bt = t0 + b * bar
        ch = CHORDS[progression[b % len(progression)]]
        add(music, bt, pad(ch[1:], bar + 0.3), 0.06)
        add(music, bt, pluck(ch[0] - 12 + 12, 1.2), 0.18)  # ベース
        add(music, bt + 2 * beat, pluck(ch[0], 1.0), 0.14)
        # 刻み
        steps = 8 if busy else 4
        for k in range(steps):
            st = bt + k * bar / steps
            add(music, st + (0 if k % 2 == 0 else 0.02), pluck(ch[2 + k % 3] + 12, 0.35, 0.6), 0.07)
        # メロディ (1小節に4音)
        for k in range(4):
            m = melody[(b * 4 + k) % len(melody)]
            if m is not None:
                add(music, bt + k * beat, mel_inst(m), 0.16)
        if busy:  # 軽いパーカッション
            for k in range(8):
                hit = noise(0.05) * np.exp(-tt(0.05) * 90)
                add(music, bt + k * beat / 2, hit, 0.05 if k % 2 else 0.09)
            add(music, bt, (np.sin(2 * np.pi * 60 * tt(0.25) * np.exp(-tt(0.25) * 8)) * np.exp(-tt(0.25) * 14)).astype(np.float32), 0.35)
            add(music, bt + 2 * beat, (np.sin(2 * np.pi * 60 * tt(0.25) * np.exp(-tt(0.25) * 8)) * np.exp(-tt(0.25) * 14)).astype(np.float32), 0.35)


S = SHOT_STARTS  # 各カットの開始時刻 (index 0 = コマ1)
# 導入: のんびり / 騒動: 速く / 「あっ」で無音 / 結末: あたたかく
section(0.0, S[3] + XF, 96, ["C", "Am", "F", "G"], MELODY_A, musicbox, False)
section(S[3], S[8] + 0.3, 132, ["C", "G", "Am", "E", "F", "C", "Dm", "G"], MELODY_B, pluck, True)
section(S[9], TOTAL, 84, ["F", "G", "C", "Am", "F", "G", "C", "C"], MELODY_A, musicbox, False)

# 「あっ」の瞬間は音楽を落とす / 区切りでフェード
env = np.ones(N, np.float32)


def ramp(t0, t1, v0, v1):
    i0, i1 = int(t0 * SR), int(t1 * SR)
    env[i0:i1] = np.linspace(v0, v1, i1 - i0) * env[i0:i1]


ramp(S[8] - 0.2, S[8] + 0.3, 1, 0)
env[int((S[8] + 0.3) * SR): int((S[9] - 0.2) * SR)] = 0
ramp(S[9] - 0.2, S[9] + 1.5, 0, 1)
ramp(TOTAL - 3.0, TOTAL, 1, 0)
music *= env

# ---- 効果音
def bell(t0):  # ドアベル カランコロン
    for k, f in enumerate([1568, 2093, 1760]):
        x = tt(1.5)
        s = (np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * f * 2.76 * x)) * np.exp(-x * 3.5)
        add(sfx, t0 + k * 0.12, s.astype(np.float32), 0.10)


def birds(t0, n):
    for k in range(n):
        x = tt(0.12)
        f0 = rng.uniform(2800, 4200)
        f = f0 + 1200 * np.sin(np.pi * x / 0.12)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / 0.12)
        add(sfx, t0 + k * rng.uniform(0.15, 0.6), s.astype(np.float32), 0.035)


def servo(t0, d=0.5, up=True):
    x = tt(d)
    f = (220 + 260 * (x / d if up else 1 - x / d))
    ph = np.cumsum(f) / SR
    s = 2 * (ph % 1) - 1  # ノコギリ波
    s = s * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * x))
    s *= np.minimum(1, x / 0.03) * np.minimum(1, (d - x) / 0.05)
    add(sfx, t0, s.astype(np.float32) * 0.5, 0.06)


def pour(t0, d):
    n = smooth_noise(d, 6)
    x = tt(d)
    gurgle = 0.6 + 0.4 * np.sin(2 * np.pi * (7 + 3 * np.sin(x * 2)) * x)
    s = n * gurgle * np.minimum(1, x / 0.3) * np.minimum(1, (d - x) / 0.4)
    add(sfx, t0, s.astype(np.float32), 0.05)


def clink(t0, f=2400, g=0.10):
    x = tt(0.6)
    s = sum(np.sin(2 * np.pi * f * r * x) * np.exp(-x * (8 + 6 * j)) for j, r in enumerate([1, 1.52, 2.31, 3.1]))
    add(sfx, t0, s.astype(np.float32), g)


def thump(t0, g=0.4):
    x = tt(0.25)
    s = np.sin(2 * np.pi * (90 * np.exp(-x * 6)) * x * 4) * np.exp(-x * 18)
    add(sfx, t0, s.astype(np.float32), g)


def meow(t0, d=0.55, base=700):
    x = tt(d)
    f = base + 350 * np.sin(np.pi * x / d) - 150 * x / d
    f *= 1 + 0.02 * np.sin(2 * np.pi * 7 * x)
    ph = np.cumsum(f) / SR
    s = np.sin(2 * np.pi * ph) + 0.5 * np.sin(4 * np.pi * ph) + 0.3 * np.sin(6 * np.pi * ph)
    s *= np.sin(np.pi * x / d) ** 0.7
    add(sfx, t0, s.astype(np.float32), 0.06)


def whoosh(t0, d=0.8):
    n = noise(d)
    x = tt(d)
    s = np.convolve(n, np.ones(4) / 4, mode="same") * np.sin(np.pi * x / d) ** 2
    add(sfx, t0, s.astype(np.float32), 0.10)


def splash(t0, d=2.5):
    n = smooth_noise(d, 10)
    x = tt(d)
    s = n * np.exp(-x * 1.6) * np.minimum(1, x / 0.02)
    add(sfx, t0, s.astype(np.float32), 0.22)
    for k in range(14):  # しぶき
        add(sfx, t0 + rng.uniform(0.1, 1.6), (noise(0.04) * np.exp(-tt(0.04) * 80)).astype(np.float32), 0.05)


def sparkle(t0):
    for k, m in enumerate([84, 88, 91, 96]):
        add(sfx, t0 + k * 0.08, musicbox(m, 1.2), 0.07)


def shutter(t0):
    add(sfx, t0, (noise(0.03) * np.exp(-tt(0.03) * 120)).astype(np.float32), 0.25)
    add(sfx, t0 + 0.09, (noise(0.04) * np.exp(-tt(0.04) * 90)).astype(np.float32), 0.18)


def purr(t0, d):
    x = tt(d)
    n = smooth_noise(d, 40)
    am = (0.5 + 0.5 * np.sin(2 * np.pi * 24 * x)) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * x))
    s = n * am * np.minimum(1, x / 0.5) * np.minimum(1, (d - x) / 1.0)
    add(sfx, t0, s.astype(np.float32), 0.12)


birds(S[0] + 0.2, 8)
bell(S[0] + 2.8)
servo(S[1] + 0.8, 0.45, True); servo(S[1] + 1.5, 0.35, False); clink(S[1] + 2.4, 1800, 0.08)
pour(S[2] + 0.6, 4.2)
thump(S[3] + 2.0, 0.35); meow(S[3] + 3.2, 0.4, 820)
meow(S[4] + 3.0, 0.7, 650); servo(S[4] + 4.8, 0.3, True); servo(S[4] + 5.2, 0.3, True)
for k in range(9):  # カップを積み上げる
    clink(S[5] + 0.6 + k * 0.55, 2000 + 120 * k, 0.07)
servo(S[5] + 5.6, 0.6, False)
whoosh(S[6] + 0.8, 1.0); meow(S[6] + 1.0, 0.45, 900)
for k in range(10):
    clink(S[6] + 2.0 + rng.uniform(0, 4), rng.uniform(1600, 2800), 0.05)
for k in range(5):
    servo(S[7] + 0.4 + k * 1.4, 0.4, k % 2 == 0)
for k in range(22):  # ガシャガシャ
    clink(S[7] + rng.uniform(0.5, 7.8), rng.uniform(1300, 3200), 0.06)
thump(S[7] + 3.5, 0.3); thump(S[7] + 6.0, 0.3)
whoosh(S[8] + 0.5, 1.2)
splash(S[8] + 1.2, 3.0)
meow(S[8] + 2.2, 0.35, 1000)
sparkle(S[9] + 1.2)
shutter(S[10] + 1.6); shutter(S[10] + 3.4); sparkle(S[10] + 3.6)
purr(S[11] + 0.3, 7.5)
meow(S[11] + 3.5, 0.6, 600)
# タイトル/エンドの音
add(sfx, 0.4, musicbox(84, 2.0), 0.08); add(sfx, 0.55, musicbox(88, 2.0), 0.08)
for k, m in enumerate([72, 76, 79, 84]):
    add(sfx, S[11] + 8.0 + 0.4 + k * 0.15, musicbox(m, 2.5), 0.10)

mix = music * 0.9 + sfx
# 簡易ステレオ (効果音を少し揺らす)
left = mix + 0.15 * np.roll(sfx, 200)
right = mix + 0.15 * np.roll(sfx, -200)
st = np.stack([left, right], axis=1)
st /= max(1e-6, np.abs(st).max()) / 0.89
pcm = (st * 32767).astype(np.int16)
wav_path = OUT + ".wav"
with wave.open(wav_path, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(pcm.tobytes())
print(f"audio done, total {TOTAL:.1f}s", flush=True)

# ---------------------------------------------------------------- 映像書き出し
cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
       "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
       "-i", wav_path,
       "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
nframes = int(TOTAL * FPS)
for f in range(nframes):
    proc.stdin.write(frame_at(f / FPS).tobytes())
    if f % 300 == 0:
        print(f"frame {f}/{nframes}", flush=True)
proc.stdin.close()
proc.wait()
print("done", OUT)
