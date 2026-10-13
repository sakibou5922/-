# 使っている API(すべて無料・キー不要・読み取りのみ)

| ソース | URL | 主に使う項目 |
|---|---|---|
| DexScreener | `https://api.dexscreener.com/tokens/v1/solana/<CA>`(カンマ区切りで最大30件) | priceUsd, marketCap, liquidity.usd, volume.h24, txns.h24, priceChange, pairCreatedAt, info.socials |
| DexScreener | `https://api.dexscreener.com/token-profiles/latest/v1`, `/token-boosts/latest/v1` | chainId, tokenAddress(新着・広告中のトークン) |
| DexScreener | `https://api.dexscreener.com/orders/v1/solana/<CA>` | DEX 広告の支払い状況 |
| RugCheck | `https://api.rugcheck.xyz/v1/tokens/<CA>/report` | mintAuthority, freezeAuthority, transferFee, topHolders, knownAccounts, insider, graphInsidersDetected, creator, creatorTokens, markets[].lp.lpLockedPct, risks, rugged |
| GoPlus | `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=<CA>` | mintable, freezable, closable, holders, holder_count(RugCheck が取れないときの代わり) |
| pump.fun | `https://frontend-api-v3.pump.fun/coins/<CA>` | creator, created_timestamp, complete, usd_market_cap, real_token_reserves, is_banned, reply_count, twitter/telegram/website |
| pump.fun | `https://frontend-api-v3.pump.fun/coins?offset=0&limit=50&sort=<created_timestamp/market_cap/last_trade_timestamp>&order=DESC` | 一覧 |
| pump.fun | `https://frontend-api-v3.pump.fun/coins/user-created-coins/<ウォレット>?offset=0&limit=50` | 開発者の過去作 |
| Solana RPC | `https://api.mainnet-beta.solana.com`(`SOLANA_RPC_URL` で変更可) | getBalance, getSignaturesForAddress, getTokenAccountsByOwner, getTokenSupply |

pump.fun の API は非公式なので、仕様が変わることがある。項目名が変わったら、ブラウザで URL を開いて返ってくる JSON を確認し、`scripts/` 内の該当箇所を直す。
