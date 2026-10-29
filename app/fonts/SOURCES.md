# Font sources

Noto Kufi Arabic uses Google Fonts sources; see NotoKufiArabic-OFL.txt. IBM Plex Sans Arabic WOFF2 files are unmodified complete fonts from IBM/plex, packages/plex-sans-arabic/fonts/complete/woff2 (master, retrieved 2026-10-27). Regular blob: 695d303cc25104463a86fa0b42bad47b27d187bf; Medium: ced3646c77cdd8a054e0647ff46dc533e5419fa9; SemiBold: eda08d3bb808cc95a73244992a8cee8ad7fbcb59; Bold: 08e2028e2971a41251f29046cdc15ccd229487a6.

Readex Pro: google/fonts, ofl/readexpro/ReadexPro[HEXP,wght].ttf, blob 563b89d182a98521152f7d5fc904bd646b058880. Converted to WOFF2 without changing outlines, names or variation axes. License and reserved name notice are in OFL-Readex-Pro.txt.

All families are loaded from local WOFF2 assets with next/font/local. Builds do not request Google Fonts; only the selected family is used on normal pages. IBM and Readex licenses are copied from their Google Fonts distributions.

UI subsets are generated with scripts/subset-fonts.py from the licensed originals in commit 598a7d9. Arabic letters and marks U+064B–U+0652/U+0670, digits, ASCII Latin, basic punctuation and joiners are retained with layout-features=*. UI weights: Plex 400/600 and Kufi 700. Preload: Plex 400 and Kufi 700 only. The full Plex 400 TTF is server-only for Arabic social-card shaping.
