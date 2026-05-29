---
id: TASK-34.3
title: >-
  34-B: Opravit skill type — GameStateMachine fire() předává
  FireCommand.skillType místo hardcoded 'fireball'
status: Done
assignee: []
created_date: '2026-05-13 19:46'
updated_date: '2026-05-13 19:54'
labels: []
dependencies: []
parent_task_id: TASK-34
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 projectileSystem.fire() dostane skillType z FireCommand.skillType (ne 'fireball' natvrdo)
- [ ] #2 DamageSystem.speedForSkill() má case pro slow_shot a fast_shot
- [ ] #3 Game design testy stále prochází (porovnávají slow_shot/fast_shot damage)
- [ ] #4 Level-1 test: 1 slow CRIT (40) + 1 fast CRIT (20) = 60 HP → level_complete stále platí
- [ ] #5 npm run test && npm run test:coverage prochází
<!-- AC:END -->
