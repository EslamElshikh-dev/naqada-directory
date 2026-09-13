# Bashlaw Expansion Batch 20 — Media & Listing Enrichment

Date: 2026-09-13
Base: Batch 19 fresh-only discovery

## Goal
Audit images and listing enrichment for the confirmed Bashlaw records after the fresh-only pass. Prefer target-specific storefront/business imagery. Never import a generic or unrelated photo as if it represented a real local business.

## New Batch 19 listing
### حورس لخدمات الكمبيوتر
- Visitor-facing identity is published in Batch 19 at `RP6R+4V8`, شارع مدرسة عمر بن الخطاب, Bashlaw/Awsat Qamoula.
- No trustworthy target-specific storefront image was resolved in the image-search pass.
- Search results for the business name were dominated by unrelated businesses/locations and generic electronics imagery outside Naqada.
- Decision: **no business-media entry added**.
- Existing category fallback is safe and explicit: `الإلكترونيات والهواتف` maps to `/images/categories/tech.webp` with alt text describing it as an illustrative scene, not a photograph of the business.

## Existing Bashlaw image spot-check
Exact-name image searches were run for a sample of existing records including:
- Center Ms. Precious للأقمشة والمفروشات والملابس
- محل بابو للالكترونات
- معرض الشكيلي للأدوات المنزلية
- صالون وليد لحلاقة الرجال

Returned imagery was unrelated/generic or from other places and could not be independently tied to the exact Bashlaw storefront. None was imported.

## Media integrity rules applied
1. No stock/generic web photo is attached to a named local business as if it were its storefront.
2. No photo is accepted from image similarity alone.
3. Business-specific media requires a stable identity bridge: exact business page, exact phone/place identity, or independently tied storefront source.
4. When no trustworthy target image exists, the site's category illustration remains the fallback and its alt text must stay explicitly illustrative.
5. Generated imagery is not used as a claimed real storefront photo.

## Outcome
- Real target-specific images added: **0**.
- Rejected mismatched/generic image results: **multiple**.
- New misleading media associations: **0**.
- Data/business-media changes: **0**.
- Batch 19 visitor-facing listing remains unchanged.
- Production/Main: unchanged.

## Completion state
Batch 19 and Batch 20 together complete the requested cycle: fresh discovery → full dedup → cautious publication of qualified NEW records → image/media audit → safe fallback behavior. Future Bashlaw discovery should start from fresh signals only and should not recycle FINAL HOLD records without genuinely new evidence.
