---
id: TASK-36
title: Enemy behavior system — pohyb a definice chování
status: Done
assignee: []
created_date: '2026-05-14 13:13'
updated_date: '2026-05-14 13:52'
labels:
  - game-logic
dependencies: []
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Každý enemy typ má EnemyBehaviorDef (pohyb: statický, LR, cikcak, diagonální, přibližující se, …)
- [x] #2 EnemyBehaviorDef je součástí EnemyDef v constants.ts — ne samostatný soubor
- [x] #3 BehaviorSystem (pure TS, bez Phaseru) aktualizuje pozici enemye každý tick dle jeho EnemyBehaviorDef
- [x] #4 MovementPattern je typovaný union (static | lr_oscillate | zigzag | diagonal | approach) — rozšiřitelný pro budoucí patterny
- [x] #5 Architektura počítá s budoucím rozšířením: enemy může v budoucnu střílet nebo reagovat na hráče — žádné předčasné implementace, ale žádné anti-patterns které by to znemožnily
- [x] #6 Všech 15 stávajících enemy typů (task-32) má přiřazený pohybový pattern dle svého designu
- [x] #7 BehaviorSystem je unit testovaný — pozice po N tickech je deterministická
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Všechny AC jsou zaškrtnuty
- [x] #2 BehaviorSystem: 100% pokrytí unit testy
- [x] #3 Game design test: shadow dancer (LR) — power user trefí víc critů než casual player díky předvídání pohybu
- [x] #4 npm run test + npm run test:coverage prochází
- [x] #5 grep 'from .phaser' src/game/ vrátí prázdný výstup
<!-- DOD:END -->
