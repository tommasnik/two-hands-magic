---
id: TASK-17
title: Damage calculation system
status: Done
assignee: []
created_date: '2026-05-13 14:11'
updated_date: '2026-05-13 14:41'
labels: []
dependencies:
  - TASK-16
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pure function calculateDamage(hitResult: HitResult, skillType: SkillType): number in src/game/systems/DamageSystem.ts
- [x] #2 Returns base skill damage × zone multiplier (CRIT×2, HIT×1, GRAZE×0.3, MISS×0)
- [x] #3 Uses only constants, no magic numbers
- [x] #4 Unit tests cover all hitResult × skillType combinations (2×4 = 8 cases)
- [x] #5 Unit tests cover boundary: MISS always returns 0 regardless of skill
- [x] #6 100% coverage on DamageSystem.ts
<!-- AC:END -->
