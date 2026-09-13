# Bashlaw Expansion Batch 17 — Fresh Discovery with Source-Freshness Gate

Date: 2026-09-13

## Goal
Run a fresh Bashlaw discovery pass without inflating the directory. A candidate is eligible for publication only when it has at least one strong current identity signal (direct map/place identity, a public phone tied to the same local identity, or two independent sources) and the locality is specific enough to assign it safely.

## Repository / public-site dedup findings

### Existing — do not duplicate
- مركز شباب الأوسط قمولا ببشلاو: already represented in the Bashlaw stack. External checks additionally resolve the public point `RP5Q+QQ5` at the main entrance of Bashlaw and multiple press sources explicitly place مركز شباب الأوسط قمولا in Bashlaw. This strengthens the existing record but is not a new activity.
- سوبر ماركت أبو جمال: already visible on the current public directory as a Bashlaw listing on شارع مدرسة عمر بن الخطاب. Do not create a second record from external discovery.
- Existing Bashlaw names surfaced again during category scans: معرض الشكيلي للأدوات المنزلية، أولاد شكلي للأدوات الكهربية، صالون وليد، مكتبة الأمراء عمر & حمد، مكتبة الإسراء، جمعية البدر، ورشة أبو عبد العزيز، محمد الشكلي لتجارة الأخشاب، Center Ms. Precious، ورشة الإخوة الثلاثة، ستديو البرنس، حضانة المهندس / عبدالصبور سمري. All are dedup-only hits.

## New candidates that fail the publication gate

### سنتر الاسطوره — HOLD locality
- Cybo currently exposes a clothing-store identity named `سنتر الاسطوره`.
- Public phone: `01019459117`.
- Address: `شارع الوحده، Al Awsat Qamoula, Naqada, Qena Governorate 1423121`.
- Rating signal: 5.0 / 1 review.
- The source does not say Bashlaw explicitly and no second source was resolved tying this exact phone/store to Bashlaw.
- Decision: **HOLD**. The business may be in the same broader Awsat Qamoula/Bashlaw commercial zone, but that is not enough to assign it to Bashlaw.
- Source: https://yellowpages-ar.cybo.com/EG-biz/%D8%B3%D9%86%D8%AA%D8%B1-%D8%A7%D9%84%D8%A7%D8%B3%D8%B7%D9%88%D8%B1%D9%87_2t

### Reproductive-health service map entry — HOLD unnamed facility
- A current reproductive-services map crawled in September 2026 contains the pair `الاوسط قمولا` / `بشلاو`.
- The surfaced result does not expose a distinct facility name, phone, or direct place identity for the Bashlaw entry.
- Decision: **HOLD as a service lead only**. Do not create a generic “health unit” record from locality text alone.
- Source: https://barahaamen.org/map/services-map

### قهوة الاكس — remains HOLD
- Exact public point remains `RP5Q+GP3` at the main entrance of Bashlaw with a 5.0 signal.
- Still only one resolved directory source and the category is returned as generic sports/recreation rather than an unambiguous cafe category.
- Decision: **HOLD**; no category invention.

### مكتبة جرير — remains HOLD corridor
- Public point remains `RP3Q+3FR` on طريق بشلاو–دراو.
- No second phone/profile/current source was resolved that fixes the point to Bashlaw rather than the corridor.
- Decision: **HOLD**.

### Abed children Grocery fruit and vegetable — remains VERIFY/HOLD
- Public point `RP6R+39G` at the main entrance of Bashlaw still appears in Cybo category results.
- No phone, owner bridge, or second independent current identity was resolved.
- Decision: keep separate from official fruit/vegetable proprietors and do not publish/merge from name similarity.

## Official freshness / closure lead

### بائع فول وفلافل — محمد عطيتو عادلي — REOPEN VERIFY
- Qena Governorate published an administrative-closure decision dated 2025-12-17 covering food establishments that had not yet regularized their status / completed required health conditions.
- The decision explicitly includes a `بائع فول وفلافل` in `الأوسط قمولا بشلاو` with the responsible person named `محمد عطيتو عادلي`.
- No newer indexed reopening or current storefront identity was resolved in this pass.
- Decision: **do not publish as OPEN**. Keep as a closure/reopening-verification lead until a later official or direct current source proves reopening.
- Source: https://www.qena.gov.eg/Goffice/orders/Lists/List/AllItems.aspx

## Freshness conflict retained
- An older Dezone result still describes محل حمو لقطع غيار الموتوسيكلات والتوكتوك at Bashlaw as OPEN.
- Batch 16 already resolved newer sources tying the identity to a different current point and marking it closed since 2025.
- Decision: newer closure/location evidence wins; do not resurrect it as a Bashlaw listing.

## Batch 17 result
- New visitor-facing records: **0**.
- New HOLD/service candidates: **2** (سنتر الاسطوره; unnamed reproductive-service map lead).
- New official closure/reopen-verification lead: **1** (محمد عطيتو عادلي — فول وفلافل).
- Existing records strengthened/deduped: **multiple**, especially مركز شباب الأوسط قمولا.
- Weak locality assumptions: **0**.
- Weak owner→storefront merges: **0**.
- Production/Main: unchanged.

## Next useful pass
Prioritize phone-first discovery around Bashlaw and Awsat Qamoula where an exact public phone can be searched across social/business indexes, then accept only identities whose address explicitly names Bashlaw or whose direct map point is independently tied to Bashlaw. In parallel, check official/local reopening evidence for the 2025 administratively closed Bashlaw food-service lead before treating it as current.
