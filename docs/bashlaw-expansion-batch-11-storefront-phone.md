# Bashlaw Expansion Batch 11 — Storefront & Phone Resolution

Checked: 2026-09-13

## Goal
Resolve old Bashlaw VERIFY/HOLD records using current storefront identity, public phone, Google Maps/Cybo schema, current app-publisher identity, and indexed social/business evidence. Do not merge proprietor records to storefronts by surname, trade, or locality alone.

## Resolved / publishable

### مكتبة أبو عمر الجعفري
- Previous state: HOLD because the word «مكتبة» made the business type ambiguous.
- Decision: READY / A-
- Current identity: `مكتبه ابو عمر الجعفري`
- Point: RP5Q+PX7, الأوسط قمولا, نقادة, قنا.
- Phone from current Cybo category result: 01009220198.
- Cybo schema type: `HardwareStore`.
- Google Maps CID surfaced by Cybo: `3036362318339954224`.
- Classification decision: `البناء والصيانة` → `متجر أدوات ومواد بناء`; do **not** classify as bookstore merely from the trade name.
- Locality decision: الأوسط قمولا only. The source does not explicitly prove Bashlaw-core.
- Sources:
  - https://yellowpages-ar.cybo.com/EG/naq%C4%81dah/%D9%85%D8%A8%D9%8A%D8%B9%D8%A7%D8%AA-%D9%85%D9%88%D8%A7%D8%AF-%D8%A7%D9%84%D8%A8%D9%86%D8%A7%D8%A1-%D8%A8%D8%A7%D9%84%D8%AC%D9%85%D9%84%D8%A9/
  - https://yellowpages-ar.cybo.com/EG/naq%C4%81dah/%D9%85%D8%AA%D8%AC%D8%B1-%D8%A3%D8%AC%D9%87%D8%B2%D8%A9/

### FAMASIA - خالد فتح الباب محمد علي
- Decision: READY / A-
- Type: app/software publisher; current digital service identity rather than a physical storefront.
- Current Google Play publisher/app support page identifies developer `خالد فتح الباب محمد علي`.
- Public support email on the page: `bangar3001@gmail.com`.
- Published developer address: `الاوسط قمولا - بشلاو بجوار مسجد فاطمة الزهراء مركز نقاده قنا 85881 Egypt`.
- Google Play also surfaces other apps under FAMASIA, supporting a persistent publisher identity rather than a one-off mention.
- No phone was invented.
- Source: https://play.google.com/store/apps/details?id=com.phone.background

## Unresolved owner → storefront bridges
No trustworthy identity bridge was found for:
- كريمة حشمت اللايق محمد → tailoring storefront unknown.
- هشام سليم محمد الزهري → clothing storefront unknown.
- عائشة سقف نجدي سقاف → not merged with النوبي للأدوات الصحية.
- محمد عبدالرحيم تهامي عبدالرحيم → not merged with بابو للإلكترونات or تهامي للأثاث.
- مواهب سلام شكلي سلام → not merged with معرض الشكيلي or أولاد شكلي merely because of surname similarity.
- carpentry CR owners from Batch 9 → not merged with ورشة مشمش or ورشة الإخوة الثلاثة.
- fruit/vegetable owners → no current storefront/phone identity bridge.

## Additional current evidence checked
- `النوبي للأدوات الصحية` remains a current separate الأوسط قمولا business at RQ56+7MW with public phone 01021297794; this strengthens the reason **not** to merge it into Aisha's CR without ownership evidence.
- `ورشة مشمش للنجارة` remains independently listed at RP6R+7R2 on Omar Ibn Al-Khattab School Street; no proprietor bridge to the official carpentry records was found.
- `مواهب سلام شكلي سلام` CR 45651 remains an official Bashlaw supermarket registration, but no current storefront identity was resolved.

## Integrity rule
A shared family/surname token (`شكلي`, `تهامي`, etc.) is not an ownership bridge. Promotion from VERIFY requires one of: matching public phone, explicit proprietor statement, exact current map identity tied to the owner, or a current official/social source naming both owner and storefront.
