---
id: TASK-61.1
title: 'TASK-61.1: Skill types + constants (pure TS)'
status: Done
assignee: []
created_date: '2026-05-30 18:50'
updated_date: '2026-05-30 19:04'
labels:
  - skills
  - constants
  - pure-ts
dependencies: []
references:
  - 'src/types/index.ts:12-16'
  - 'src/game/constants.ts:483-568'
  - 'src/game/systems/DamageSystem.ts:84-102'
parent_task_id: TASK-61
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled
Přidání `ice_crystal` a `lightning_blast` do typového systému a konstant. Čistě pure TS, žádný Phaser.

## Datová struktura
```ts
// src/types/index.ts
export type SkillType = 'fireball' | 'slow_shot' | 'fast_shot' | 'white_shot' | 'ice_crystal' | 'lightning_blast'
```

## Konstanty (src/game/constants.ts)

```ts
/** Ice Crystal projectile speed. Very slow — telegraphed. Unit: cm/s */
export const ICE_CRYSTAL_SPEED_CM = 20

/** Ice Crystal laser rotation period. Same cadence as fireball. Unit: ms */
export const ICE_CRYSTAL_ROTATION_PERIOD_MS = 2000

/** Ice Crystal base damage range (spread). Unit: HP */
export const ICE_CRYSTAL_DAMAGE_MIN = 3
export const ICE_CRYSTAL_DAMAGE_MAX = 5

/** Freeze duration on CRIT (head). Unit: ms */
export const ICE_CRYSTAL_FREEZE_CRIT_MS = 2000

/** Freeze duration on HIT (torso). Unit: ms */
export const ICE_CRYSTAL_FREEZE_HIT_MS = 1000

/** Lightning Blast rotation period. Unit: ms */
export const LIGHTNING_BLAST_ROTATION_PERIOD_MS = 1200

/** Lightning Blast base damage range (spread). Unit: HP */
export const LIGHTNING_BLAST_DAMAGE_MIN = 18
export const LIGHTNING_BLAST_DAMAGE_MAX = 25

/** Lightning Blast visual discharge duration per hit zone. Unit: ms */
export const LIGHTNING_BLAST_DURATION_CRIT_MS = 600
export const LIGHTNING_BLAST_DURATION_HIT_MS = 300
export const LIGHTNING_BLAST_DURATION_GRAZE_MS = 150
```

## DamageSystem
- `rollBaseDamage('ice_crystal', rng)` → random spread ICE_CRYSTAL_DAMAGE_MIN..MAX (jako white_shot)
- `rollBaseDamage('lightning_blast', rng)` → random spread LIGHTNING_BLAST_DAMAGE_MIN..MAX
- GRAZE multiplier pro oba: standardní `GRAZE_DAMAGE_MULTIPLIER` (60%)

## Co je OUT OF SCOPE
- Freeze logika (TASK-61.2)
- Instant hit logika pro lightning (TASK-61.3)
- Visuals (TASK-61.5, 61.6)
- Skill slot konfigurace (TASK-61.4)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SkillType union obsahuje 'ice_crystal' a 'lightning_blast'
- [x] #2 Všechny konstanty exportovány z constants.ts s JSDoc (unit, affects)
- [x] #3 DamageSystem.rollBaseDamage() správně vrátí damage pro oba nové typy
- [x] #4 npm run test projde (žádné broken testy)
<!-- AC:END -->
