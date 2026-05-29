---
id: TASK-13
title: Full autonomous agent validation
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:21'
updated_date: '2026-05-13 12:47'
labels:
  - testing
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finální validace celého projektu provedená agentem. Tento task je gate před dalším vývojem (skills, kombinace, rozšíření). Agent musí projít celý testovací stack a potvrdit, že základ je pevný.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run test — všechny unit testy procházejí, žádné skipped
- [ ] #2 npm run test:coverage — 100% pokrytí src/game/** (lines, functions, branches, statements)
- [ ] #3 npm run test:e2e — všechny Playwright testy procházejí na iPhone 14 profilu
- [ ] #4 npm run test:design — všechny GameDesignSpec testy procházejí
- [ ] #5 npm run build — build úspěšný, žádné TypeScript chyby
- [ ] #6 Agent manuálně: spustí dev server, zavolá window.__game.getState(), injektuje touch input, ověří hit detection přes game state
- [ ] #7 Žádné console.error ani console.warn během gameplay (ověřit v Playwright)
- [ ] #8 grep -r 'from .phaser' src/game/ vrátí prázdný výsledek (čistota game logic vrstvy)
<!-- AC:END -->
