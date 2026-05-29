---
id: TASK-21
title: 'Rendering: enemy positioned in upper half of screen'
status: Done
assignee: []
created_date: '2026-05-13 14:11'
updated_date: '2026-05-13 15:08'
labels: []
dependencies:
  - TASK-16
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Default enemy Y position moved to ~GAME_HEIGHT * 0.32 (upper third area)
- [x] #2 Enemy body fully visible in upper ~40% of canvas (head not clipped)
- [x] #3 ENEMY_DEFAULT_Y constant added to constants.ts with JSDoc
- [x] #4 E2E test: enemy torso center Y coordinate is in upper 40% of canvas
<!-- AC:END -->
