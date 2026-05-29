---
id: TASK-25
title: 'E2E tests: HP bar, enemy position, damage numbers, level progression'
status: Done
assignee: []
created_date: '2026-05-13 14:12'
updated_date: '2026-05-13 15:29'
labels: []
dependencies:
  - TASK-20
  - TASK-21
  - TASK-22
  - TASK-23
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 HP bar visible after battle start (canvas region or DOM element check)
- [x] #2 HP bar width/fill decrements after a confirmed hit
- [x] #3 Enemy torso center Y < GAME_HEIGHT * 0.45 (upper portion)
- [x] #4 Damage numbers appear on hit (floating text with numeric content)
- [x] #5 Level 2 enemy name appears after level 1 complete
- [x] #6 'victory' phase reached after level 3 enemy is defeated
- [x] #7 Only 1 touch point visible per side initially (not 3)
<!-- AC:END -->
