---
id: TASK-24
title: 'Game design tests: level 1, 2, 3 encounter scenarios'
status: Done
assignee: []
created_date: '2026-05-13 14:11'
updated_date: '2026-05-13 15:23'
labels: []
dependencies:
  - TASK-18
  - TASK-19
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Level 1 power user: fires 1 crit slow + 1 crit fast → enemy HP = 0, phase = level_complete
- [x] #2 Level 1 verification: total damage = 40 + 20 = 60 = Goblin Scout maxHp
- [x] #3 Level 2 power user: fires 2 crits slow (2×40=80) → Orc Warrior HP = 0
- [x] #4 Level 2 alt path: fires 4 crits fast (4×20=80) → Orc Warrior HP = 0
- [x] #5 Level 3 power user: fires enough crits to deplete Stone Troll HP 104
- [x] #6 Each level test validates that zone multipliers and skill damages produce expected HP reduction
- [x] #7 Tests drive GameStateMachine directly (no Phaser), deterministic simulation
<!-- AC:END -->
