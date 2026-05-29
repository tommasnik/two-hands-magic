---
id: TASK-1
title: Project scaffold & dev environment
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:18'
updated_date: '2026-05-13 12:02'
labels:
  - infra
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zprovoznit Phaser 3 + TypeScript + Vite projekt jako plnohodnotný monorepo člen. Cíl: všechny npm scripty fungují, adresářová struktura je správná, build prochází a výstup jde nasadit na Netlify.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run dev spustí Vite dev server na localhost:5173 bez chyb
- [ ] #2 npm run build provede TypeScript check + Vite build a vyprodukuje dist/
- [ ] #3 npm run test spustí Vitest (i bez testů – zero tests je OK)
- [ ] #4 npm run test:e2e spustí Playwright (i bez testů – zero tests je OK)
- [ ] #5 BASE_PATH env var správně nastaví base v Vite configu (pro Netlify monorepo build)
- [ ] #6 Adresářová struktura: src/game/, src/scenes/, src/types/, src/tests/{unit,e2e,game-design,helpers}/
- [ ] #7 window.__game test bridge se nainstaluje v DEV buildu (ověřit v konzoli prohlížeče)
- [ ] #8 npm run build v CI (bez BASE_PATH) produkuje funkční output
<!-- AC:END -->
