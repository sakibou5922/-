# Deterministic Decision Engine

## 8 questions
Q1 stage: PRE_OPEN_90_PLUS / PRE_OPEN_31_90 / PRE_OPEN_0_30 / OPERATING
Q2 business_type: BEAUTY_SALON / HEALTH_TREATMENT / FOOD / RETAIL / LESSON_SCHOOL / FITNESS / PET / OTHER_FACE_TO_FACE
Q3 reservation_model: APPOINTMENT_DOMINANT / MIXED / WALKIN_DOMINANT
Q4 onsite_payment: MOST / SOME / LITTLE
Q5 ops_complexity: SIMPLE / MULTI_LOW_INVENTORY / INVENTORY_IMPORTANT
Q6 staff_count: SOLO / SMALL_2_3 / TEAM_4_PLUS
Q7 repeat_rate: HIGH / MEDIUM / LOW
Q8 existing_services multi: GOOGLE_BUSINESS / EXTERNAL_PLATFORM / LINE / RESERVATION / CASHLESS / POS / ACCOUNTING / WEBSITE / NONE

Conditional:
- Platform existing → dependency HIGH/MEDIUM/LOW/UNKNOWN
- Existing >=3 → manual duplication YES/NO/UNKNOWN
- OPERATING → new customer state NEED_MORE/ENOUGH/CAPACITY_FULL/UNKNOWN

## Areas
GOOGLE_FOUNDATION / EXTERNAL_PLATFORM / RESERVATION / CASHLESS / POS / ACCOUNTING / LINE / WEBSITE / INTEGRATION

## Status
FREE_FOUNDATION / NOW / NEXT / LATER / NOT_PRIORITY / REVIEW_EXISTING / HIDDEN

## Hard rules
- WALKIN_DOMINANT → reservation 原則 NOT_PRIORITY
- onsite LITTLE → cashless 原則 NOT_PRIORITY
- SOLO + SIMPLE → POS 原則 NOT_PRIORITY
- repeat LOW → LINE 原則 NOT_PRIORITY
- LINEは開業前にNOWへ上げない
- external platform新規導入は最大NEXT
- integrationはexisting>=3かつmanual duplication YESで候補
- 既導入サービスを「新規導入」として勧めない

## Internal scores
Reservation: appointment +5 / mixed +2 / walkin -6; staff small +1/team +2; repeat high +1; 0-30 +1; operating +1; service-type +1. >=6 NOW, 3-5 NEXT.
Cashless: most +5 / some +2 / little -6; 0-30 +1; operating +1; onsite-type +1. >=5 NOW, 3-4 NEXT.
POS: inventory important +5 / multi +2 / simple -4; staff small +1/team +2; retail +2; food +1; onsite-most +1. >=6 NOW, 3-5 NEXT.
LINE: repeat high +4 / medium +2 / low -4; operating +2; 31-90 -1; 90+ -2; repeat-business +1. operatingかつ>=6 NOW; >=3 NEXT.
External platform: 31-90 +2; 0-30 +2; operating +1; fit-business +2; need-more +3; enough -2; capacity-full -5. >=5 NEXT.

## Display constraints
- FREE_FOUNDATION別枠
- NOW最大3
- NEXT最大2
- REVIEW_EXISTING別枠
- 点数はユーザーに見せず、理由文を表示
- Affiliate payoutは順位計算に使用禁止
