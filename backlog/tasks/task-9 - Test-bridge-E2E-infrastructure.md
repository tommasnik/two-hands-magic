---
id: TASK-9
title: Test bridge & E2E infrastructure
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:20'
updated_date: '2026-05-13 12:29'
labels:
  - testing
  - infra
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zprovoznit window.__game test bridge (DEV only) a Playwright E2E infrastrukturu. Toto je základ pro autonomní agent testování. Cíl: agent může plně ovládat hru a číst stav bez dotyku UI, jen přes JavaScript API.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 window.__game.getState() vrací aktuální GameState snapshot
- [ ] #2 window.__game.injectInput(InputEvent) simuluje touch event a hra na něj reaguje
- [ ] #3 window.__game.advanceTime(ms) deterministicky posouvá game loop
- [ ] #4 Test bridge je dostupný POUZE v DEV buildu (import.meta.env.DEV guard)
- [ ] #5 V production buildu (npm run build) není window.__game přítomno
- [ ] #6 src/tests/helpers/gameApi.ts exportuje gameApi(page) helper pro Playwright
- [ ] #7 gameApi helper wrappuje page.evaluate() volání do typed funkcí
- [ ] #8 Playwright E2E test: otevře hru, zavolá getState(), ověří že scéna je 'BattleScene'
- [ ] #9 Playwright E2E test: injectInput simuluje touch down + up, getState() ukazuje reakci
- [ ] #10 src/tests/e2e/README.md dokumentuje jak agent má testovat (step-by-step protokol)
<!-- AC:END -->
