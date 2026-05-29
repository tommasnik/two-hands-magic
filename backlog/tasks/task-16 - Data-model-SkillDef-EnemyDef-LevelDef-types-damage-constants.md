---
id: TASK-16
title: 'Data model: SkillDef, EnemyDef, LevelDef types + damage constants'
status: Done
assignee: []
created_date: '2026-05-13 14:10'
updated_date: '2026-05-13 14:39'
labels: []
dependencies: []
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SkillType union expanded: 'slow_shot' | 'fast_shot'
- [x] #2 SkillDef interface: type, damage, rotationPeriodMs, side
- [x] #3 EnemyDef interface: name, maxHp, critZoneScale (1.0 = default head radius)
- [x] #4 LevelDef interface: level number, enemyDef, leftSkill, rightSkill
- [x] #5 GameState extended: enemyHp, enemyMaxHp, enemyName, currentLevel; phase adds 'level_complete' | 'victory'
- [x] #6 SLOW_SKILL_DAMAGE = 20, FAST_SKILL_DAMAGE = 10
- [x] #7 SLOW_SKILL_ROTATION_PERIOD_MS = 2200 (Green-speed), FAST_SKILL_ROTATION_PERIOD_MS = 1400 (Orange-speed)
- [x] #8 CRIT_DAMAGE_MULTIPLIER = 2.0, HIT_DAMAGE_MULTIPLIER = 1.0, GRAZE_DAMAGE_MULTIPLIER = 0.3
- [x] #9 3 enemy defs: Goblin Scout (HP 60, critScale 1.0), Orc Warrior (HP 80, critScale 0.7), Stone Troll (HP 104, critScale 0.55)
- [x] #10 LEVELS array: LevelDef[3] with correct slow/fast skill assignments
- [x] #11 All constants have JSDoc with unit and what-it-affects
- [x] #12 All derived constants use formula expressions (no standalone magic numbers)
<!-- AC:END -->
