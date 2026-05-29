---
id: TASK-23
title: 'Rendering: damage numbers as floating text (replace CRIT/HIT/GRAZE labels)'
status: Done
assignee: []
created_date: '2026-05-13 14:11'
updated_date: '2026-05-13 15:20'
labels: []
dependencies:
  - TASK-17
  - TASK-18
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 FloatText now shows damage number (e.g. '40', '10', '3') instead of 'CRIT!'/'HIT'/'GRAZE'
- [x] #2 Font size scales with damage: CRIT hit = largest, GRAZE = smallest (3 tiers)
- [x] #3 Color scheme retained (CRIT pink, HIT gold, GRAZE green)
- [x] #4 MISS produces no floating text
- [x] #5 GameState.lastHit must include damage value (from TASK-18)
- [x] #6 E2E test: after a CRIT hit, a large number appears at the hit location
- [x] #7 E2E test: after a GRAZE, a small number appears
<!-- AC:END -->
