# solana-memecoin(Claude Code スキル)

Solana ミームコインの調査用スキルです。次の4つの機能があります。

1. 詐欺チェック
2. 新しいコイン探し
3. 開発者・大口の調査
4. 売買記録と振り返り

使うのは無料の公開APIだけで、APIキーも登録もいりません。読み取り専用なので、ウォレットにはつながず、秘密鍵も使いません。

## インストール(自分のPC)
必要なのは Python 3.8以上だけです。

```bash
# Mac / Linux
mkdir -p ~/.claude/skills
cp -r solana-memecoin ~/.claude/skills/

# Windows(PowerShell)
New-Item -ItemType Directory -Force "$HOME\.claude\skills"
Copy-Item -Recurse solana-memecoin "$HOME\.claude\skills\"
```
コピーしたら Claude Code を再起動します。そのあと「このコイン大丈夫? <CA>」のように話しかけると使えます。

## 動作確認
```bash
cd ~/.claude/skills/solana-memecoin/scripts
python3 discover.py new
```
コインの一覧が出れば成功です。

## 自動でコインを探して Discord に通知する(Windows)
1. **Discord の Webhook URL を作る**
   - 通知を受けたいチャンネルの ⚙ →「連携サービス」→「ウェブフック」→「新しいウェブフック」→「ウェブフックURLをコピー」
2. **PowerShell で次のコマンドを実行する**
   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.claude\skills\solana-memecoin\scripts\setup_windows.ps1"
   ```
   聞かれたら URL を貼り付けます。テスト通知が Discord に届けば設定完了です。
3. あとは PC にログインしている間、30分ごとに自動で探して通知します。

- 間隔を変える: 最後に ` -Minutes 60` を付けて、もう一度実行
- 止める: 最後に ` -Remove` を付けて実行
- ログ: `%USERPROFILE%\.memecoin\autoscan.log`
- 通知履歴: `%USERPROFILE%\.memecoin\reports\`

## ファイル構成
- `SKILL.md`:Claude 向けの使い方(どんな時に・どう使うか)
- `scripts/check.py`:詐欺チェック
- `scripts/discover.py`:新しいコイン探し
- `scripts/dev.py`:開発者・大口の調査(ウォッチリスト対応)
- `scripts/journal.py`:売買記録と振り返り(`~/.memecoin/journal.json` に保存)
- `scripts/autoscan.py`:自動スキャンと Discord 通知
- `scripts/setup_windows.ps1`:自動スキャンを Windows に登録する
- `scripts/thresholds.json`:判定の基準値(自分好みに変えられます)
- `references/`:危険サインの解説と、使っているAPIの一覧

## 注意
- 判定は公開データからの機械的なチェックで、安全を保証するものではありません。
- pump.fun の API は非公式なので、仕様が変わると一部が動かなくなることがあります。
