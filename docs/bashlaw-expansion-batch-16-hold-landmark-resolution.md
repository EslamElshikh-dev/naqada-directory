# Bashlaw Expansion Batch 16 — HOLD & Landmark Resolution

Date: 2026-09-13

## Scope
Resolve the three highest-priority HOLD/routing items carried from Batch 15 without forcing publication from a single weak source:
1. قهوة الاكس — RP5Q+GP3.
2. مكتبة جرير — RP3Q+3FR on طريق بشلاو - دراو.
3. مقام الشيخ عبد الله البشلاوى — main entrance of Bashlaw.

Publication rule: one aggregator/category-page hit is not enough to create a new visitor-facing business or heritage record when category, locality, or identity is still ambiguous. A second independent source, direct public business profile, reliable phone/social identity, official/press reference, or independently tied photo is required.

## 1) قهوة الاكس — RP5Q+GP3 — HOLD retained
- Cybo category results list `قهوة الاكس` at `RP5Q+GP3، المدخل الرئيسى لقرية بشلاو، الأوسط قمولا، نقادة، قنا` with a 5.0 public rating signal.
- Source: https://yellowpages-ar.cybo.com/EG/naq%C4%81dah/%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6%D8%A9-%D9%88%D8%A7%D9%84%D8%A3%D9%86%D8%B4%D8%B7%D8%A9/?p=2
- The same source files it under a broad sports/recreation category, which is inconsistent with the Arabic business name and does not safely establish whether it is a café, coffee shop, social venue, or another local place type.
- Exact-name, Plus-Code, Bashlaw, Naqada, and Facebook-index searches did not resolve an independent current phone, social page, storefront image, direct map/business profile, or second reliable directory identity.
- Repository-level dedup still finds no existing business with this name/Plus Code.
- Decision: **HOLD — genuine new candidate, not publishable yet**.

## 2) مكتبة جرير — RP3Q+3FR — HOLD retained / corridor ambiguity
- Cybo lists `مكتبة جرير` at `RP3Q+3FR، طريق بشلاو- دراو، الأوسط قمولا، نقادة، قنا` under libraries.
- Source: https://yellowpages-ar.cybo.com/EG/naq%C4%81dah/%D9%85%D9%83%D8%AA%D8%A8%D8%A7%D8%AA/
- Search did not resolve a local public phone, direct map profile, current local social page, or independent address that assigns RP3Q+3FR specifically to Bashlaw rather than the Bashlaw–Daraw corridor / broader Al Awsat Qamoula.
- Facebook results for the well-known Saudi/Egypt regional `Jarir Bookstore` brand are unrelated and were rejected as false matches.
- Decision: **HOLD — do not publish under Bashlaw until locality and independent identity are resolved**.

## 3) مقام الشيخ عبد الله البشلاوى — LANDMARK HOLD retained
- Cybo has an explicit local record titled `مقام الشيخ عبد الله البشلاوى` at `المدخل الرئيسى لقرية بشلاو، الأوسط قمولا، نقادة، قنا` and categorizes it under museums / operation of historical sites and buildings.
- Source: https://www.cybo.com/EG-biz/%D9%85%D9%82%D8%A7%D9%85-%D8%A7%D9%84%D8%B4%D9%8A%D8%AE-%D8%B9%D8%A8%D8%AF-%D8%A7%D9%84%D9%84%D9%87-%D8%A7%D9%84%D8%A8%D8%B4%D9%84%D8%A7%D9%88%D9%89
- Repository scan of `data/landmarks.json` did not find an existing Bashlaw landmark with this name.
- Historical material confirms `البشلاوي` as a local nisba/toponym connected to Bashlaw people in old records, but it does **not** independently prove this specific shrine, its attributed person, date, biography, or heritage significance.
- Exact-name and Facebook-index searches did not resolve an official Awqaf reference, local-history article, press feature, independently identified photograph, or second source for the shrine itself.
- Decision: **LANDMARK HOLD — do not add to landmarks.json yet**.

## Related evidence rejected as non-proof
- Generic historical records containing people described as `البشلاوي` confirm Bashlaw's historical nisba but cannot establish that a specific `عبد الله البشلاوي` is the person commemorated by the mapped shrine.
- Similar shrines or people named Abdullah outside Bashlaw/Naqada are unrelated.
- Brand/social results for `Jarir Bookstore` outside Naqada are unrelated to the local RP3Q+3FR listing.

## Batch 16 result
- New visitor-facing businesses: **0**.
- New landmarks: **0**.
- Existing published records modified: **0**.
- `قهوة الاكس`: HOLD retained.
- `مكتبة جرير`: HOLD retained pending corridor/locality resolution.
- `مقام الشيخ عبد الله البشلاوى`: routed landmark remains HOLD pending a second independent source.
- False cross-city/brand/person matches rejected.
- Production/Main: unchanged.

## Re-open criteria
### قهوة الاكس
Any one strong bridge: direct Maps/business profile, public phone, active local Facebook/social page, trustworthy storefront photo tied to RP5Q+GP3, or a second independent directory with matching name/location and clear place type.

### مكتبة جرير
Independent address/phone/profile that confirms the local entity plus whether RP3Q+3FR belongs to Bashlaw proper, Daraw, or the connecting corridor.

### مقام الشيخ عبد الله البشلاوى
Official/local-history/press source naming the shrine or person, or an independently attributable current photograph/source that confirms the shrine identity. Do not infer biography from the nisba alone.

## Next direction
Continue fresh discovery in categories with low coverage while using repository-first dedup before any write. Prefer candidates with a phone or direct map identity because they are substantially easier to verify and less likely to create duplicate or ambiguous records.
