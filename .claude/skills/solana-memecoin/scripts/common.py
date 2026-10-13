"""共通処理: HTTP取得・Solana RPC・表示用フォーマット。標準ライブラリのみ・APIキー不要。"""
import json
import os
import re
import sys
import time
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (solana-memecoin-skill)", "Accept": "application/json"}
RPC_URL = os.environ.get("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
ERRORS = []  # 取得に失敗したソース(レポート末尾に表示する)

DEX = "https://api.dexscreener.com"
RUGCHECK = "https://api.rugcheck.xyz/v1"
GOPLUS = "https://api.gopluslabs.io/api/v1"
PUMP = "https://frontend-api-v3.pump.fun"

# pump.fun ボンディングカーブで売られるトークン量(10億枚のうち 7.931億枚)。graduate 進捗の計算に使う
PUMP_CURVE_TOKENS = 793_100_000 * 10**6

_ADDR = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")


def is_address(s):
    return bool(s) and bool(_ADDR.match(s))


def get_json(url, label=None, timeout=20, tries=2):
    """JSON を取得。失敗時は None を返し ERRORS に記録する(例外は投げない)。"""
    err = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode())
        except Exception as e:  # noqa: BLE001 - 取得失敗はすべて「データなし」として扱う
            err = e
            if getattr(e, "code", None) in (404,):
                break
            time.sleep(1.0 * (i + 1))
    ERRORS.append(f"{label or url}: {str(err)[:100]}")
    return None


def rpc(method, params, tries=3):
    """Solana RPC。公開RPCは429を返しやすいのでリトライする。失敗時は None。"""
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    for i in range(tries):
        try:
            req = urllib.request.Request(RPC_URL, data=body, headers={**UA, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=20) as r:
                j = json.loads(r.read().decode())
            if "error" in j:
                raise RuntimeError(j["error"])
            return j.get("result")
        except Exception:  # noqa: BLE001
            time.sleep(1.5 * (i + 1))
    ERRORS.append(f"Solana RPC {method}: 応答なし")
    return None


def num(x, default=0.0):
    try:
        return float(x)
    except (TypeError, ValueError):
        return default


def usd(x):
    x = num(x, None)
    if x is None:
        return "—"
    for unit, div in (("B", 1e9), ("M", 1e6), ("K", 1e3)):
        if abs(x) >= div:
            return f"${x / div:.1f}{unit}"
    return f"${x:,.0f}" if abs(x) >= 1 else f"${x:.8f}".rstrip("0")


def pct(x, signed=False):
    x = num(x, None)
    if x is None:
        return "—"
    return f"{x:+.1f}%" if signed else f"{x:.1f}%"


def hours(h):
    h = num(h, None)
    if h is None:
        return "—"
    if h < 1:
        return f"{h * 60:.0f}分"
    if h < 48:
        return f"{h:.1f}時間"
    return f"{h / 24:.1f}日"


def short(addr):
    return f"{addr[:4]}…{addr[-4:]}" if addr and len(addr) > 10 else (addr or "—")


def arg(name, default=None, cast=None):
    """--name value 形式の引数を読む(argparse を使わず軽量に)。"""
    a = sys.argv
    if name in a and a.index(name) + 1 < len(a):
        v = a[a.index(name) + 1]
        if cast is None:
            cast = type(default) if default is not None else str
        return cast(v)
    return default


def flag(name):
    return name in sys.argv


def dex_pairs(mint):
    """DexScreener のペア一覧(Solana)。"""
    d = get_json(f"{DEX}/tokens/v1/solana/{mint}", "DexScreener")
    return d if isinstance(d, list) else []


def dex_pairs_bulk(mints):
    """最大30件ずつまとめて取得し {mint: [pairs]} を返す。"""
    out = {}
    for i in range(0, len(mints), 30):
        chunk = mints[i:i + 30]
        d = get_json(f"{DEX}/tokens/v1/solana/{','.join(chunk)}", "DexScreener(bulk)")
        for p in d if isinstance(d, list) else []:
            m = (p.get("baseToken") or {}).get("address")
            if m:
                out.setdefault(m, []).append(p)
    return out


def main_pair(pairs):
    """流動性が最大のペアを代表とする。"""
    return max(pairs, key=lambda p: num((p.get("liquidity") or {}).get("usd"))) if pairs else None


def pump_coin(mint):
    d = get_json(f"{PUMP}/coins/{mint}", "pump.fun")
    return d if isinstance(d, dict) and d.get("mint") else None


def curve_progress(coin):
    """pump.fun のボンディングカーブ進捗(0〜100%)。取れなければ None。"""
    if not coin:
        return None
    if coin.get("complete"):
        return 100.0
    real = coin.get("real_token_reserves")
    if real is None:
        return None
    return max(0.0, min(100.0, (1 - num(real) / PUMP_CURVE_TOKENS) * 100))


def print_errors():
    if ERRORS:
        print("\n⚠ 取得できなかったデータ(判定は残りのデータのみで実施):")
        for e in dict.fromkeys(ERRORS):
            print(f"  - {e}")
