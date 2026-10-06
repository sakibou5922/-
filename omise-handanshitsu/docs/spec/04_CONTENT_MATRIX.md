# Initial Content Matrix

## HOT PEPPER Beauty
Title: `ホットペッパービューティーは本当に必要？掲載する店・しない店の判断基準`
Job: 外部集客媒体の合理性と依存度を判断
Mini Check: 新規客の必要性 / 媒体依存割合 / 月額関連費把握 / 媒体経由新規数把握 / 直接導線有無
States: USE_OR_TEST / USE_AND_BUILD_OWN / MEASURE_FIRST / LOW_PRIORITY
CTA: `自分の店の集客依存度を確認する`
Revenue: INDIRECT
Post metrics: 新規数 / CAC / 再来率 / 6か月顧客価値 / 媒体依存率

## 予約システム
Title: `予約システムは本当に必要？LINE・電話・DMで十分な店との違い`
Mini Check: 予約中心 / 受付経路数 / 営業時間外需要 / 予約漏れ・二重予約 / スタッフ数
States: MANUAL_OK / FREE_STARTER_FIT / SYSTEM_RECOMMENDED / INTEGRATION_REVIEW
CTA: `予約管理の負荷を確認する`
Revenue: freee予約Partner if paid need exists
Guard: Starterで十分な人をBusinessへ押し上げない

## POS
Title: `POSレジは本当に必要？小さなお店で入れる店・まだ不要な店`
Mini Check: 商品/メニュー数 / 在庫 / スタッフ / 分析 / 連携
States: SIMPLE_REGISTER_OK / FREE_POS_FIT / ADVANCED_POS_FIT / INTEGRATION_REVIEW
Revenue: Square if approved; Airレジ Official fallback

## キャッシュレス
Title: `キャッシュレス決済は本当に必要？手数料を払う価値がある店・ない店`
Mini Check: 店頭決済 / 顧客要望 / 客単価 / 月間店頭売上 / 現金管理負荷
States: HIGH_FIT / CONDITIONAL / LOW_PRIORITY
Calculator: monthly_cashless_sales × fee_rate + fixed fee
Revenue: Square if approved; Airペイ Official fallback

## LINE公式
Title: `LINE公式アカウントは本当に必要？小さなお店が作る前に考えたいこと`
Mini Check: 再来頻度 / 顧客数 / 配信目的 / 運用担当 / 予約・再来導線
States: START_FREE / USE_WITH_PURPOSE / SCALE_AFTER_VALUE / NOT_PRIORITY
Revenue: INDIRECT
Post metrics: 友だち純増 / 配信到達 / ブロック / 予約・再来Action / 配信コスト
