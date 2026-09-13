# Bashlaw Expansion Batch 15 — Remaining CR Resolution + New Discovery

Date: 2026-09-13

## Scope
Resolve the remaining high-value Bashlaw commercial-register leads from the carpentry and fruit/vegetable clusters using newer exact Qena notices, then perform a fresh public-web discovery pass for genuinely NEW Bashlaw activities.

Integrity rule: a commercial-register number alone is not an identity bridge. Later notices are accepted only when trader name + registry context + chronology match the original Qena record. A public storefront is never assigned to an official proprietor without a direct bridge. Discovery candidates must also pass repository-level dedup against the published business shards and enrichment layer, not only search-engine dedup.

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

## Remaining fruit/vegetable leads — VERIFY
### إبراهيم محمد عبدالكريم ابراهيم — CR 43398
- Initial Qena registration: 2023-02-23, fruit/vegetable shop, الأوسط قمولا - بشلاو.
- No newer exact Qena notice tied to the same trader identity was resolved.
- Decision: **VERIFY**.

### فوزيه محمد ابوالقاسم محمد — CR 44130
- Initial Qena registration: 2023-06-25, fruit/vegetable shop, Bashlaw.
- No newer exact Qena notice tied to the same trader identity was resolved.
- Decision: **VERIFY**.

Commercial-register numbers 43398 and 44130 also appear in unrelated registry-office records under other names; those are explicitly rejected as non-matches.

## Repository-level dedup correction
A first external-search pass surfaced several convincing Bashlaw businesses, but repository-level inspection proved that they are already published in the existing `businesses-01.json` through `businesses-12.json` data stack / Bashlaw enrichment layer. They were therefore **not** added again:

- `محلات الفتح إدارة عمار عبد الشافي` — existing ID `directory:bashlaw-mahallat-alfath`.
- `صالون وليد لحلاقة الرجال` — existing ID `directory:bashlaw-waleed-barber`.
- `جمعية البدر للتنمية المجتمعية الشاملة والتدريب ببشلاو` — existing ID `directory:bashlaw-albadr-association`.
- `مأذونية الأوسط قمولا بشلاو – الشيخ الطيب عبدالله الهواري` — existing ID `directory:bashlaw-mazouniya`.
- `صيدلية دكتور عبدالباسط إدريس` — already present in the base Google/Maps shard as `google:ChIJd0_sc15HSRQRRjrNNg-h-hg`.
- Existing Bashlaw listings such as صالون محمود، ورشة أبو عبد العزيز، ورشة مشمش، مكتبة الأمراء، مكتبة الإسراء، مركز الشباب and other previously enriched records were also protected from duplicate creation.

This correction is important: search-engine absence is not proof that a listing is absent from the repository. Dedup must inspect source shards/IDs before any new record is committed.

## Genuine new public candidate — HOLD
### قهوة الاكس — RP5Q+GP3
- Cybo currently lists `قهوة الاكس` at `RP5Q+GP3، المدخل الرئيسى لقرية بشلاو، الأوسط قمولا، نقادة، قنا` with a 5.0 public rating signal.
- Source: https://yellowpages-ar.cybo.com/EG/naq%C4%81dah/%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D8%A9-%D9%88%D8%A7%D9%84%D8%A3%D9%86%D8%B4%D8%B7%D8%A9/?p=2
- Full repository scan of the currently imported 12 business shards found no existing record with the same name or Plus Code.
- However, the only resolved source currently places it under a generic `sports/recreation` category, which conflicts with the semantic meaning of the business name and is not enough to safely assign a visitor-facing café/food category.
- No second independent source, public phone, current social page, or exact direct business profile was resolved in this pass.
- Decision: **HOLD / NEW candidate, do not publish yet**.

## Other new/nearby candidates — route, do not publish in this batch
### مكتبة جرير — RP3Q+3FR
- Public directory signal exists on `طريق بشلاو - دراو` in Al Awsat Qamoula.
- Locality is a boundary/corridor label rather than an explicit Bashlaw-core address.
- Decision: **HOLD for corridor/locality resolution**; do not force into Bashlaw.

### مقام الشيخ عبد الله البشلاوى
- Public Cybo identity is explicit at the main entrance of Bashlaw and classifies the place as a museum/historical-site type.
- Source: https://www.cybo.com/EG-biz/%D9%85%D9%82%D8%A7%D9%85-%D8%A7%D9%84%D8%B4%D9%8A%D8%AE-%D8%B9%D8%A8%D8%AF-%D8%A7%D9%84%D9%84%D9%87-%D8%A7%D9%84%D8%A8%D8%B4%D9%84%D8%A7%D9%88%D9%89
- Decision: **route to landmark/heritage verification**, not ordinary business data.

### Diwan / family-place results
- Any result whose primary identity is a family diwan, mayoral house, or social landmark is routed to the family/landmark workflow and not counted as a new commercial business.

## Batch 15 result
- Newly resolved CLOSED official lead: **1** — مديحه عبد الحميد ابوالعلا احمد / CR 43399.
- Remaining target CR leads kept VERIFY: **6**.
- External-search candidates rejected as already published duplicates: **5+**, including the three strongest initial candidates.
- Genuine new Bashlaw candidate retained as HOLD: **1** — قهوة الاكس / RP5Q+GP3.
- Boundary candidate retained as HOLD: **1** — مكتبة جرير / RP3Q+3FR.
- Heritage candidate routed away from business data: **1** — مقام الشيخ عبد الله البشلاوى.
- New visitor-facing business records added by Batch 15: **0**.
- Weak owner→storefront merges: **0**.
- Duplicate visitor-facing records introduced: **0**.
- Production/Main: unchanged; this work remains stacked in a Draft PR.

## Next recommended pass
1. Resolve `قهوة الاكس` with a second independent source, direct map identity, social page, phone, or storefront evidence.
2. Resolve `مكتبة جرير` corridor locality before assigning it to Bashlaw or another village page.
3. Move `مقام الشيخ عبد الله البشلاوى` into a dedicated Bashlaw landmark/heritage verification batch.
4. Continue NEW discovery using repository-first dedup: external candidate → check all raw shards + enrichment IDs → only then create data.
