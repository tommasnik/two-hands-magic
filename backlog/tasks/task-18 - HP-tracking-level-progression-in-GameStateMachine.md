---
id: TASK-18
title: HP tracking + level progression in GameStateMachine
status: Done
assignee: []
created_date: '2026-05-13 14:11'
updated_date: '2026-05-13 14:47'
labels: []
dependencies:
  - TASK-16
  - TASK-17
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GameStateMachine initializes enemy HP from current LevelDef on startBattle()
- [x] #2 On projectile hit: apply calculateDamage(), clamp HP to 0
- [x] #3 HP reaches 0 → phase transitions to 'level_complete'
- [x] #4 After level 3 'level_complete' → phase transitions to 'victory'
- [x] #5 nextLevel() method loads next LevelDef (new enemy name, HP, critZoneScale)
- [x] #6 GameState.enemyHp, enemyMaxHp, enemyName, currentLevel all correctly populated
- [x] #7 lastHit extended: includes damage number dealt
- [x] #8 Unit tests: HP depletion, crit kill, level transition to 2, transition to 3, victory after level 3
- [x] #9 Unit tests: HP never goes below 0
<!-- AC:END -->
