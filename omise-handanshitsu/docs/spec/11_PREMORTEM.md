# Pre-mortem

失敗したと仮定した主要原因と対策。

1. 「本当に必要？」がクリックベイト化
- Signal: 記事読了後も判断できない / 直後にランキング
- Prevention: Usefulness Gate必須

2. ASP都合でNeed判定が歪む
- Signal: Affiliate対象だけNOW比率が異常上昇
- Prevention: Decision EngineとOffer Layer分離

3. 情報が古い
- Signal: 料金改定後も旧価格表示
- Prevention: verified_at / valid_until / stale fail-closed

4. 業種一般化が乱暴
- Signal: 美容だから予約必須等
- Prevention: 業種は弱いmodifier、実態変数を優先

5. 診断が長く完了されない
- Signal: starts>=100でcompletion<50%
- Prevention: conditional質問、entry prefill、再質問禁止

6. SEO競合に埋もれる
- Signal: impressionsは出るがCTR/engagement弱い
- Prevention: 記事+Mini Check+Decision Result+post-adoption review

7. SMASK営業サイトに見える
- Signal: Cold流入から相談CTAが目立つ
- Prevention: SMASK exit default disabled / 条件付き

8. Revenue Evidenceが出ないまま記事増殖
- Signal: CVなしで10本以上追加
- Prevention: 初期7主要PageでLearning Gate
