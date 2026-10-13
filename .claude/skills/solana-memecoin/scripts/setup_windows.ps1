# ミームコイン自動スキャンの Windows 用セットアップ
#   設定:  powershell -ExecutionPolicy Bypass -File setup_windows.ps1
#   解除:  powershell -ExecutionPolicy Bypass -File setup_windows.ps1 -Remove
# やること: (1) Discord の Webhook URL を保存 (2) テスト通知 (3) 30分ごとの自動実行をタスクスケジューラに登録
param(
    [switch]$Remove,
    [int]$Minutes = 30,
    [string]$Webhook = ""
)
$ErrorActionPreference = "Stop"
$TaskName = "MemecoinAutoscan"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Scan = Join-Path $ScriptDir "autoscan.py"
$DataDir = Join-Path $env:USERPROFILE ".memecoin"
$Config = Join-Path $DataDir "config.json"
$Log = Join-Path $DataDir "autoscan.log"

if ($Remove) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "自動スキャンを解除しました。"
    exit 0
}

# Python を探す(pythonw / pyw は画面を出さずに動く)
function Find-Exe($names) {
    foreach ($n in $names) {
        $c = Get-Command $n -ErrorAction SilentlyContinue
        if ($c) { return $c.Source }
    }
    return $null
}
$Py = Find-Exe @("py", "python")
$PyW = Find-Exe @("pyw", "pythonw")
if (-not $Py -or -not $PyW) {
    Write-Host "Python が見つかりません。https://www.python.org/downloads/ からインストールしてください(インストール時に「Add python.exe to PATH」にチェック)。"
    exit 1
}
$PyArgs = @()
if ((Split-Path -Leaf $Py) -eq "py.exe") { $PyArgs = @("-3") }

# 1) Discord Webhook を保存(BOM なし UTF-8)
New-Item -ItemType Directory -Force $DataDir | Out-Null
if (-not $Webhook) {
    $Webhook = Read-Host "Discord の Webhook URL を貼り付けて Enter(設定済みでそのままにするなら空で Enter)"
}
if ($Webhook) {
    if ($Webhook -notmatch '^https://(discord\.com|discordapp\.com)/api/webhooks/') {
        Write-Host "Discord の Webhook URL ではないようです: $Webhook"
        exit 1
    }
    $json = '{"discord_webhook": "' + $Webhook + '"}'
    [System.IO.File]::WriteAllText($Config, $json, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "保存しました: $Config"
}

# 2) テスト通知
$env:PYTHONIOENCODING = "utf-8"
& $Py @PyArgs $Scan --test-discord

# 3) タスクスケジューラに登録(ログオン中に $Minutes 分ごと、画面なしで実行)
$WArgs = (($PyArgs + @("`"$Scan`"", "--log", "`"$Log`"")) -join " ")
$Action = New-ScheduledTaskAction -Execute $PyW -Argument $WArgs -WorkingDirectory $ScriptDir
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $Minutes)
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 20)
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null

Write-Host ""
Write-Host "✅ 設定完了: $Minutes 分ごとに自動でコインを探して Discord に通知します(1分後に初回実行)。"
Write-Host "   ログ:     $Log"
Write-Host "   レポート: $DataDir\reports\"
Write-Host "   止める:   powershell -ExecutionPolicy Bypass -File `"$($MyInvocation.MyCommand.Path)`" -Remove"
