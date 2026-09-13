# Bashlaw Expansion Batch 19 — Fresh-Only Discovery

Date: 2026-09-13

## Goal
Run a fresh-only Bashlaw discovery pass after Batch 18 closed the recycled HOLD loop. Search restaurants/food, grocery, mobile/electronics, clothing and barbers first; deduplicate against all 12 published business shards and the Bashlaw enrichment/override layer before creating any visitor-facing record.

## Repository-first dedup
The scan re-surfaced several records already present in the current stack, including Center Ms. Precious, Salon Waleed, Salon Mahmoud, Awlad Shakly Electrical, Al-Shakily Homeware, Abu Omar Al-Jaafari Library, Babo Electronics, Al-Hoot Metalworks, Al-Badr Association and other Bashlaw records. They are not counted as NEW.

The repository override layer also confirmed that Salon Mahmoud and Al-Hoot Metalworks were already published/enriched even when a shallow filename/code search did not surface them. This is why repository-first dedup is mandatory before web discovery is promoted.

## NEW accepted
### Horus Computer Services — حورس لخدمات الكمبيوتر
- Public identity: `حورس لخدمات الكمبيوتر`.
- Public point: `RP6R+4V8`.
- Public street: `شارع مدرسة عمر بن الخطاب`.
- Public locality from external index: Al Awsat Qamoula, Naqada, Qena.
- Category signal: computer repair / electronics repair.
- Bashlaw locality bridge: the current directory independently documents شارع مدرسة عمر بن الخطاب as part of Bashlaw's commercial corridor, and multiple already-verified Bashlaw points occupy the same RP6R cluster.
- No reliable public phone, fixed hours or Google Place ID was resolved in this pass, so none were invented.
- Decision: **PUBLISH B+ / ready_with_caution** as a Bashlaw/Awsat Qamoula service listing.
- Source: https://yellowpages-ar.cybo.com/EG/naq%C4%81dah/%D8%A5%D8%B5%D9%84%D8%A7%D8%AD-%D9%83%D9%85%D8%A8%D9%8A%D9%88%D8%AA%D8%B1/

## Fresh candidates held back
### Awlad El-Hajj Abdel Sattar Basry Bakery — HOLD
- Point: `RP6R+46M`, Al Awsat Qamoula.
- Only one current directory source resolved; no public phone or independent Bashlaw bridge tied specifically to this bakery.
- Decision: HOLD, do not infer Bashlaw from the RP6R prefix alone.
- Source: https://yellowpages-ar.cybo.com/EG/naq%C4%81dah/%D8%A7%D9%84%D9%85%D8%AE%D8%A7%D8%A8%D8%B2/

### Crocodile Cafe — HOLD
- Point: `RP6R+63G`, Al Awsat Qamoula.
- Cafe category is clear, but only one current directory source resolved and no phone/second identity tied the exact point to Bashlaw.
- Decision: HOLD.
- Source: https://yellowpages-ar.cybo.com/EG/naq%C4%81dah/%D9%85%D9%82%D8%A7%D9%87%D9%8A/?p=2

### مكتب المحامى عبدالله طيب الهوارى — HOLD data-quality conflict
- Point: `RP6R+2RF`, شارع مدرسة عمر بن الخطاب, Al Awsat Qamoula.
- Cybo exposes a phone as `+20 2 25729669`; the `02` area code is inconsistent with the Qena location and no independent profile confirmed the number.
- Decision: HOLD rather than publish a suspicious contact field or silently discard a material conflict.
- Source: https://yellowpages-ar.cybo.com/EG/naq%C4%81dah/%D9%85%D8%AD%D8%A7%D9%85%D9%88%D9%86/

## Previously final HOLD records
Batch 18 FINAL HOLD / REOPEN VERIFY records were excluded from generic rediscovery unless a genuinely new identity signal appeared. No such signal appeared for سنتر الأسطورة, قهوة الاكس, مكتبة جرير, Abed children Grocery fruit and vegetable, or the closed/reopen-verify محمد عطيتو عادلي lead.

## Data changes
- `data/businesses-09.json`: +1 visitor-facing record (`directory:bashlaw-horus-computer-services`).
- `data/catalog.json`: business count 326 → 327; الإلكترونيات والهواتف 13 → 14; بشلاو / الأوسط قمولا 27 → 28.
- New public records: **1**.
- Rejected duplicate records: multiple.
- New HOLD candidates: **3**.
- Invented phones/coordinates/owners: **0**.

## Next
Run Batch 20 as a media/listing-enrichment audit. Use only target-specific storefront/business imagery. If image search returns generic or unrelated imagery, import nothing and retain the site's category fallback rather than misrepresenting a local business.
