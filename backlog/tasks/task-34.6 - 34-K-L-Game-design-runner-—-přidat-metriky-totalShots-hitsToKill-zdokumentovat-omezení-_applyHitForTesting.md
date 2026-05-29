---
id: TASK-34.6
title: >-
  34-K/L: Game design runner — přidat metriky totalShots/hitsToKill,
  zdokumentovat omezení _applyHitForTesting
status: Done
assignee: []
created_date: '2026-05-13 19:47'
updated_date: '2026-05-13 20:09'
labels: []
dependencies: []
parent_task_id: TASK-34
priority: medium
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 RunResult.metrics obsahuje: totalShots (počet fireCommands), totalHits (crits+hits+grazes), hitsToKill, damageDealt
- [x] #2 Assertion typy rozšířeny o: minValue, maxValue (pro count-based asserts)
- [x] #3 battleEncounter.spec.ts aktualizován o alespoň jeden count-based assert
- [x] #4 Komentář v runner.ts zdokumentuje: _applyHitForTesting obchází hitboxy — design testy netestují geometrii
- [x] #5 npm run test && npm run test:coverage prochází
<!-- AC:END -->
