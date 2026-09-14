# CSS Architecture V2.1

This branch is the isolated follow-up to Project Hygiene V2.

## Goal

Reduce cross-file selector ownership and late-cascade overrides without changing the rendered UI.

## Rules

- Preserve the current visual contract at desktop, 430px, and 390px.
- Prefer one clear owner for shared selectors.
- Keep page-specific styles in CSS Modules where practical.
- Do not increase the `!important` budget.
- Treat `stability-overrides.css` as a temporary safety layer, not a general feature stylesheet.
- Run CSS audit, build, and representative visual QA before proposing merge.

## Baseline

Base commit: `882b4af201685cf856a93db0ed472fb65adcb25f`.

No Production changes are part of this branch until an explicit merge decision.
