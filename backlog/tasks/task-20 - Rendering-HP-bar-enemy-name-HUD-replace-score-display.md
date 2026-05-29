---
id: TASK-20
title: 'Rendering: HP bar + enemy name HUD (replace score display)'
status: Done
assignee: []
created_date: '2026-05-13 14:11'
updated_date: '2026-05-13 15:05'
labels: []
dependencies:
  - TASK-18
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Score display (total, crits, hits, grazes, misses) removed from HUD
- [x] #2 HP bar rendered at top of screen: shows enemyHp / enemyMaxHp as fill ratio
- [x] #3 Enemy name displayed above or alongside HP bar
- [x] #4 HP bar depletes smoothly as damage is dealt (or immediately — not animated for now)
- [x] #5 E2E test: HP bar element/canvas region visible after battle start
- [x] #6 E2E test: HP bar width decreases after a confirmed hit
- [x] #7 E2E test: enemy name text matches level 1 enemy name
<!-- AC:END -->
