# X運用キット（@ROIYAL65 / @dorachan598）

Claude Code で次のコマンドが使えます（本体は `.claude/skills/`）。

| コマンド | 内容 |
|---|---|
| `/x-post` | アイデアから投稿を作成。21種類のフック公式からスコア付きで候補を出し、Xの文字数ルールでチェック |
| `/x-viral` | ニッチで伸びている投稿を「アカウント中央値に対する倍率」でランキング。フック・構造・形式を分解してスワイプファイル化 |
| `/x-thread` | スレッド／長文／単発を判断して組み立て |
| `/x-profile` | プロフィールを100点満点で採点・改善案 |
| `/x-plan` | 1週間の投稿計画 |
| `/x-human` | AIっぽさを消すヒューマナイザー |
| `/x-audit` | 自分の分析データから何が効いたかを評価 |
| `/x-engage` | コメント案、返信対応、DM、再利用 |
| `/x-monetize` | 収益化の設計（商品・導線・数値目標・30日ロードマップ） |

## 最初にやること
1. `x/accounts/<ハンドル>.md` の `？` を埋める（どのコマンドからでも質問されます）。アカウント一覧は `x/account.md`
2. `/x-monetize` → `/x-profile` → `/x-plan` の順に実行

## 文字数チェック
```
python3 x/scripts/x_count.py "本文"
python3 x/scripts/x_count.py -f x/drafts/thread.md --split
```
