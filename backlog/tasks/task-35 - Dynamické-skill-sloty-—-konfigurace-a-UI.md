---
id: TASK-35
title: Dynamické skill sloty — konfigurace a UI
status: Done
assignee: []
created_date: '2026-05-14 13:13'
updated_date: '2026-05-14 13:42'
labels:
  - game-logic
  - rendering
dependencies: []
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Player má konfiguraci se 2–6 skilly, každý namapovaný na slot (index 0–5)
- [x] #2 Vždy je alespoň 1 slot zaplněný na levé straně a 1 na pravé straně
- [x] #3 Skill se spouští přes touch point asociovaný se slotem
- [x] #4 UI zobrazuje aktivní sloty; výchozí poloha pro 1 skill je tam, kde je teď prostřední button
- [x] #5 SkillSlotConfig je definovaná v constants.ts (typ, pozice, strana)
- [x] #6 GameStateMachine akceptuje skill konfiguraci a správně routuje FireCommand.skillType dle aktivního slotu
- [x] #7 Při 1 skilu se UI neliší od současného stavu (zpětná kompatibilita)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Všechny AC jsou zaškrtnuty
- [x] #2 Unit testy pro skill slot routing v GameStateMachine
- [x] #3 Game design test: power user s 2-skill konfigurací odpálí oba skilly a hit rate odpovídá očekávání
- [x] #4 npm run test + npm run test:coverage prochází
<!-- DOD:END -->
