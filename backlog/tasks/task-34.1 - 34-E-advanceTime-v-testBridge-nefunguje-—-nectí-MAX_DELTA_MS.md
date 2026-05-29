---
id: TASK-34.1
title: '34-E: advanceTime() v testBridge nefunguje — nectí MAX_DELTA_MS'
status: Done
assignee: []
created_date: '2026-05-13 19:46'
updated_date: '2026-05-13 19:49'
labels: []
dependencies: []
parent_task_id: TASK-34
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 advanceTime(ms) postupuje herním časem přesně o ms milisekund
- [x] #2 Implementace používá smyčku s MAX_DELTA_MS kroky (stejně jako runner.ts)
- [x] #3 Test ověřuje: advanceTime(500) → elapsedMs se zvýší o 500 (ne jen 50)
- [x] #4 npm run test && npm run test:coverage prochází
<!-- AC:END -->
