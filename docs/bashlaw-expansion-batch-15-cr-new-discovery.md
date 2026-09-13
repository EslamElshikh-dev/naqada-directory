# Bashlaw Expansion Batch 15 — Remaining CR Resolution + New Discovery

Date: 2026-09-13

## Scope
Resolve the remaining high-value Bashlaw commercial-register leads from the carpentry and fruit/vegetable clusters using newer exact Qena notices, then add only genuinely NEW public Bashlaw activities after name/Plus-Code/category dedup.

Integrity rule: a commercial-register number alone is not an identity bridge. Later notices are accepted only when trader name + registry context + chronology match the original Qena record. A public storefront is never assigned to an official proprietor without a direct bridge.

## Newly resolved commercial-register status

### مديحه عبد الحميد ابوالعلا احمد — CR 43399 — CLOSED
- Initial Qena registration: 2023-02-23, fruit/vegetable shop, الأوسط قمولا - بشلاو.
- Newer Qena Commercial Names Journal notice: 2023-09-07, the exact trader and CR 43399 were struck off because the trader permanently left trade.
- Decision: **CLOSED / do not publish as a current business**.
- Sources:
  - Initial registration: https://www.itda.gov.eg/crm/859/CRA79.pdf
  - Closure notice: https://www.itda.gov.eg/CRM/866/CRA79.pdf

## Remaining carpentry leads — VERIFY
No newer exact Qena notice was found in the indexed journal search for these exact trader identities:
- محمد علي خطاب عبد المنعم — CR 99403 — carpentry — Bashlaw.
- سحر حسن الطيب احمد — CR 99020 — carpentry — Bashlaw.
- سحر عبدالصبور حسن احمد — CR 99969 — carpentry — Bashlaw.
- محارب نعيم جوهر صليب — CR 100714 — electric carpentry — Naj Bashlaw.

Important collision exclusions:
- CR 99403 also appears in unrelated registry offices for other traders/companies; those notices are not Bashlaw evidence.
- CR 99020 appears in unrelated later notices for other traders; the Bashlaw trader remains unresolved.
- CR 100714 appears in unrelated offices and years; those records are excluded.

## Remaining fruit/vegetable leads
### إبراهيم محمد عبدالكريم ابراهيم — CR 43398
- Initial Qena registration: 2023-02-23, fruit/vegetable shop, الأوسط قمولا - بشلاو.
- No newer exact Qena notice tied to the same trader identity was resolved.
- Decision: **VERIFY**.

### فوزيه محمد ابوالقاسم محمد — CR 44130
- Initial Qena registration: 2023-06-25, fruit/vegetable shop, Bashlaw.
- No newer exact Qena notice tied to the same trader identity was resolved.
- Decision: **VERIFY**.

Commercial-register numbers 43398 and 44130 also appear in unrelated registry-office records under other names; those are explicitly rejected as non-matches.

## New Bashlaw discovery — visitor-facing candidates

### محلات الفتح إدارة عمار عبد الشافي — NEW
- Current indexed local-business identity: `محلات الفتح ادارة عمار عبد الشافي`.
- Public point: `RP6Q+284`.
- Address: نجع بشلاو، الأوسط قمولا، نقادة، قنا.
- Category signal: Discount Supermarket / retail grocery.
- Source: BizMidEast listing crawled in September 2026.
- No matching name/Plus Code was found in the current directory results during dedup.
- Decision: **READY B+**; no phone or fixed hours invented.

### صالون وليد لحلاقة الرجال — NEW
- Public point: `RP5R+X39`.
- Address: المدخل الرئيسي لقرية بشلاو، الأوسط قمولا، نقادة، قنا.
- Category: barber / hairdresser.
- Public rating signal: 3.5/5 in Cybo category results.
- Sources: BizMidEast + Cybo.
- No matching name/Plus Code was found in the current directory results during dedup.
- Decision: **READY B+**; no phone or hours invented.

### جمعية البدر للتنمية المجتمعية الشاملة والتدريب ببشلاو — NEW
- Independent institutional source: Arab Center for Sustainability of Civil Society / Misr El Kheir network lists the association by this exact name, Qena, Bashlaw, and phone 01001601221; graduation year 2023.
- Public local-business signal: `جمعية البدر الخيرية`, point `RP5V+988`, main entrance of Bashlaw, rating 5.0, phone 01001601221.
- Address context: قنا – نقادة – الأوسط قمولا – بشلاو.
- This is distinct from the already published `كتاب جمعية البدر ببشلاو`; one is the association, the other is its Quran/education activity.
- Decision: **READY A-**.

## HOLD for later specialist pass
- مأذونية الأوسط قمولا بشلاو الشيخ الطيب عبدالله الهواري — RP6R+2R6 — strong map-directory signal but held for a second independent identity source before public-service publication.
- مقام الشيخ عبد الله البشلاوي — exact Bashlaw map-directory signal; route to landmark/heritage workflow rather than ordinary business data.
- Diwan AlYounis And Mayor Of the Village — route to family/landmark verification, not ordinary business publication.

## Batch 15 result
- Newly resolved CLOSED official lead: **1** (Madiha / CR 43399).
- Remaining target CR leads kept VERIFY: **6**.
- New visitor-facing Bashlaw activities approved after dedup: **3**.
- Weak owner→storefront merges: **0**.
- Production/Main: unchanged; this work remains stacked in a Draft PR.
