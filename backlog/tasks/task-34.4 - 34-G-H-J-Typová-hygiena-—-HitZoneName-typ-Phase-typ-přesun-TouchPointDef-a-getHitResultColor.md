---
id: TASK-34.4
title: >-
  34-G/H/J: Typová hygiena — HitZoneName typ, Phase typ, přesun TouchPointDef a
  getHitResultColor
status: Done
assignee: []
created_date: '2026-05-13 19:47'
updated_date: '2026-05-13 19:58'
labels: []
dependencies: []
parent_task_id: TASK-34
priority: medium
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 HitZoneName = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg' | 'none' exportováno z types/index.ts
- [ ] #2 Všechny výskyty inline union nahrazeny HitZoneName
- [ ] #3 Phase exportován z types/index.ts, lokální redefinice v GameStateMachine odstraněna
- [ ] #4 TouchPointDef interface přesunut z constants.ts do types/index.ts
- [ ] #5 getHitResultColor přesunuta z constants.ts do src/game/utils/hitColors.ts nebo DamageSystem.ts
- [ ] #6 Importy v constants.ts jsou na začátku souboru (ne uprostřed)
- [ ] #7 npm run test && npm run test:coverage prochází
<!-- AC:END -->
