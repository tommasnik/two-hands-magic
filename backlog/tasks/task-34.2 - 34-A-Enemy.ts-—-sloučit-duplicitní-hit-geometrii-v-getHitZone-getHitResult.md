---
id: TASK-34.2
title: '34-A: Enemy.ts — sloučit duplicitní hit geometrii v getHitZone + getHitResult'
status: Done
assignee: []
created_date: '2026-05-13 19:46'
updated_date: '2026-05-13 19:52'
labels: []
dependencies: []
parent_task_id: TASK-34
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Privátní metoda _resolveZone(point) obsahuje veškerou hitbox geometrii (headCY, armCY...)
- [ ] #2 getHitResult() deleguje na _resolveZone() — žádná duplicita geometrie
- [ ] #3 getHitZone() deleguje na _resolveZone() — žádná duplicita geometrie
- [ ] #4 Všechny existující unit testy pro Enemy prochází
- [ ] #5 npm run test:coverage prochází (100 % src/game/**)
<!-- AC:END -->
