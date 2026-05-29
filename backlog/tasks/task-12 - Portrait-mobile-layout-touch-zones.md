---
id: TASK-12
title: Portrait mobile layout & touch zones
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:20'
updated_date: '2026-05-13 12:38'
labels:
  - rendering
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zajistit, že hra funguje pouze v portrait módu na mobilech, touch zóny jsou správně umístěny v dolních rozích s ohledem na safe area (notch, home indicator). Desktop není podporovaný.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Game canvas vyplní viewport v portrait módu (Phaser Scale.FIT + CENTER_BOTH)
- [ ] #2 CSS media query (orientation: landscape) zobrazí 'Rotujte zařízení' overlay
- [ ] #3 Touch zóny v dolních rozích respektují CSS env(safe-area-inset-bottom/left/right)
- [ ] #4 Phaser input.touch: true, mouse: true (pro desktop testování přes myš)
- [ ] #5 DPR scaling: canvas je ostrý na Retina/high-DPI displejích
- [ ] #6 Playwright test na iPhone 14 profilu (390×844): layout je správný, bez overflow
<!-- AC:END -->
