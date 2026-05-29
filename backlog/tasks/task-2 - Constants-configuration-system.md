---
id: TASK-2
title: Constants & configuration system
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:18'
updated_date: '2026-05-13 12:04'
labels:
  - game-logic
  - constants
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vytvořit src/game/constants.ts jako jediné místo pro všechny herní konstanty. Každá konstanta musí být zdokumentovaná a odvozené konstanty musí být vyjádřeny jako násobek/součet rodičovské konstanty – nikdy jako samostatné magic number. Toto platí pro VŠECHNY budoucí tasky: pokud přidáváš konstantu, patří sem.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Všechny herní konstanty jsou v src/game/constants.ts, nikde jinde
- [ ] #2 Každá konstanta má JSDoc: co je, jednotka, co ovlivňuje
- [ ] #3 Odvozené konstanty jsou vyjádřeny jako PARENT * MODIFIER (žádné magic numbers)
- [ ] #4 src/tests/unit/constants.test.ts ověřuje matematické vztahy odvozených konstant
- [ ] #5 Přeneseny konstanty z laser-shot referenční implementace: AIM_GAIN, PROJECTILE_SPEED_CM, TOUCHPOINT rotační časy (6 touch pointů), ENEMY rozměry, delta cap
- [ ] #6 Žádná konstanta v src/game/constants.ts není odvozena od Phaser nebo DOM
<!-- AC:END -->
