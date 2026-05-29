---
id: TASK-19
title: 'Touch point layout: 1–3 skills per side, initial 1+1 assignment'
status: Done
assignee: []
created_date: '2026-05-13 14:11'
updated_date: '2026-05-13 14:52'
labels: []
dependencies:
  - TASK-16
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Touch point layout is data-driven: accepts activeLeft[] and activeRight[] arrays (1–3 each)
- [x] #2 Initial config: 1 point per side — left uses slow skill (2200ms period), right uses fast skill (1400ms period)
- [x] #3 Touch point visual positions evenly spaced along arc regardless of count (1, 2, or 3)
- [x] #4 InputManager correctly routes left-side touches → slow_shot, right-side touches → fast_shot
- [x] #5 TOUCH_POINT_DEFS updated: slow touch point gets rotationPeriodMs = SLOW_SKILL_ROTATION_PERIOD_MS, fast gets FAST_SKILL_ROTATION_PERIOD_MS
- [x] #6 Unit tests: skill type correctly assigned per side for 1-point config
- [x] #7 Unit tests: layout positions are within arc bounds for 1, 2, and 3 points per side
<!-- AC:END -->
