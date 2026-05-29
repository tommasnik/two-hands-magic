---
id: TASK-22
title: 'Rendering: hit zones hidden by default, flash briefly on hit'
status: Done
assignee: []
created_date: '2026-05-13 14:11'
updated_date: '2026-05-13 15:16'
labels: []
dependencies:
  - TASK-18
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Enemy body parts drawn without zone-color fill by default (neutral/flat appearance)
- [x] #2 On hit: the specific zone that was hit flashes with its type color for ~400ms then fades
- [x] #3 Existing spark effects retained unchanged
- [x] #4 Zone flash reuses existing partFlash map mechanism (extend if needed)
- [x] #5 E2E test: enemy has no colored zones before first hit
- [x] #6 E2E test: after a hit, the struck zone briefly shows color
<!-- AC:END -->
