---
id: TASK-34.5
title: '34-F: AimSystem — převést třídu bez stavu na pure function'
status: Done
assignee: []
created_date: '2026-05-13 19:47'
updated_date: '2026-05-13 20:04'
labels: []
dependencies: []
parent_task_id: TASK-34
priority: medium
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 computeReticle(touchPoint, dragOffsetX, elapsedMs) je exported pure function (ne metoda třídy)
- [x] #2 Třída AimSystem odstraněna
- [x] #3 Module-level 'const aimSystem = new AimSystem()' v BattleScene odstraněno
- [x] #4 Všechny callsites aktualizovány (BattleScene + GameStateMachine)
- [x] #5 npm run test && npm run test:coverage prochází
<!-- AC:END -->
