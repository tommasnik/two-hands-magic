---
id: TASK-61.7
title: 'TASK-61.7: E2E testy — Ice Crystal & Lightning Blast'
status: To Do
assignee: []
created_date: '2026-05-30 18:52'
labels:
  - skills
  - testing
  - e2e
dependencies:
  - TASK-61.2
  - TASK-61.3
  - TASK-61.4
  - TASK-61.5
  - TASK-61.6
references:
  - src/tests/e2e/
  - src/tests/helpers/gameApi.ts
parent_task_id: TASK-61
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled
Playwright E2E testy pro oba nové skilly. Používají `window.__game` test bridge.

## Ice Crystal testy (src/tests/e2e/icecrystal.spec.ts)
1. **Freeze on HIT** — inject ice_crystal shot na torso, advanceTime(flight_time + 50), getState() → `enemyFrozenUntilMs > 0`
2. **Freeze on CRIT** — inject ice_crystal shot na head, assert `enemyFrozenUntilMs >= 2000`
3. **No freeze on GRAZE** — inject ice_crystal shot na legs, assert `enemyFrozenUntilMs === 0`
4. **Behavior stops during freeze** — freeze enemy, advanceTime(500), assert no new deliveries spawned
5. **Freeze expires** — freeze enemy, advanceTime(ICE_CRYSTAL_FREEZE_HIT_MS + 100), assert frozen = false

## Lightning Blast testy (src/tests/e2e/lightning.spec.ts)
1. **Instant hit** — inject lightning_blast release, no advanceTime needed, getState() → enemy.hp decreased immediately
2. **Discharge state** — after release, `lightningDischargeUntilMs > 0`
3. **CRIT discharge** — hit head → lightningDischargeUntilMs = ~600ms
4. **Discharge expires** — advanceTime(700), assert lightningDischargeUntilMs <= elapsedMs

## Co je OUT OF SCOPE
- Game design testy (nechtěné)
- Visual assertion (screenshot comparison)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run test:e2e projde včetně nových testů
- [ ] #2 Ice Crystal: freeze on HIT/CRIT, no freeze on GRAZE
- [ ] #3 Ice Crystal: behavior runner se zastaví během freeze
- [ ] #4 Lightning Blast: okamžité snížení HP
- [ ] #5 Lightning Blast: discharge state v GameState
<!-- AC:END -->
