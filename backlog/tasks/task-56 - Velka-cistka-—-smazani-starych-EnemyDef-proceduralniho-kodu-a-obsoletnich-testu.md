---
id: TASK-56
title: >-
  Velka cistka — smazani starych EnemyDef, proceduralniho kodu a obsoletnich
  testu
status: In Progress
assignee:
  - '@agent'
created_date: '2026-05-29 12:04'
updated_date: '2026-05-29 15:32'
labels:
  - cleanup
  - refactor
milestone: m-0
dependencies:
  - TASK-55
references:
  - 'src/game/constants.ts — ~1700 radku, hlavni cil cistky'
  - src/types/index.ts — obsoletni typy
  - src/tests/game-design/ — testy k revizi
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Prehled

Smazat vsechny pozustatky stareho proceduralniho systemu: EnemyDef definice pro enemy bez spritu, stare konstanty, obsoletni typy, a testy pro smazane enemy.

## Co se maze

### constants.ts — EnemyDef pro enemy BEZ spritu (10 z 15)

Smazat:
- `ENEMY_GOBLIN_SCOUT`
- `ENEMY_ORC_WARRIOR`  
- `ENEMY_STONE_TROLL`
- `ENEMY_SHADOW_DANCER`
- `ENEMY_IRON_GOLEM`
- `ENEMY_BLACK_HOLE`
- `ENEMY_STONE_DRAKE`
- `ENEMY_THORNBACK`
- `ENEMY_ANCIENT_TREANT`
- `ENEMY_FROST_ELEMENTAL`
- `ENEMY_LAVA_SLUG`
- `ENEMY_THUNDER_HAWK`
- `ENEMY_MIRROR_KNIGHT`
- `ENEMY_VOID_WRAITH`

Zustavaji jen 5 sprite-based: ENEMY_STONE_GIANT, ENEMY_PLAGUE_RAT, ENEMY_ICE_GIANT, ENEMY_CRYSTAL_SPIDER, ENEMY_EMBER_WISP (s novym minimalnim formatem EnemyDef).

### constants.ts — stare konstanty

- Legacy hit zone geometry: `ENEMY_HEAD_RADIUS_CM`, `ENEMY_TORSO_*`, `ENEMY_ARM_*`, `ENEMY_LEG_*`, `PIXELS_PER_CM` (pokud neni pouzivan jinde)
- `DEFAULT_HIT_ZONE_LAYOUT` a vse kolem HitZoneLayout
- `STONE_GIANT_DISPLAY_WIDTH`, `STONE_GIANT_IDLE_FRAME_COUNT`, `STONE_GIANT_ATTACK_FRAME_COUNT` (presunuto do manifestu)
- Per-enemy shape konstanty

### types/index.ts — obsoletni typy

- `HitZoneLayout` interface
- `MaskConfig` interface (nahrazeno manifestem)
- `EnemyShape` a shape-related typy
- Stare fieldy z `EnemyDef` (shape, hitZoneLayout, hitZoneMap, size, hitZone, critZone, displayWidth, maskConfig)

### Testy k smazani

Game design testy pro smazane enemy (~23 souboru):
- `goblinScoutAttacks.spec.ts`, `emberWisp.spec.ts` (pokud nema sprite-based verzi), `shadowDancer.spec.ts`, `crystalSpider.spec.ts` (nahrazena novou v task 7), `thornback.spec.ts`, `stoneDrake.spec.ts`, `blackHole.spec.ts`, `voidWraith.spec.ts`, `mirrorKnight.spec.ts`, `thunderHawk.spec.ts`, `lavaSlug.spec.ts`, `frostElemental.spec.ts`, `ironGolem.spec.ts`, `ancientTreant.spec.ts`

Game design testy pro game progression (uz neni relevantni pro endless mode):
- `levelEncounters.test.ts`, testy ktere testovaly fixni level→enemy mapping

Unit testy pro legacy hit detection:
- Casti `enemy.test.ts` testujici 6-part body a hitZoneLayout (uz smazano v task 4)
- `hitZoneSystem.test.ts` pokud testuje jen legacy system

### Co ZUSTAVA

- Skill konstanty (SLOW_SKILL_DAMAGE, FAST_SKILL_DAMAGE, CRIT_DAMAGE_MULTIPLIER, atd.)
- Player konstanty (PLAYER_MAX_HP, XP thresholds, level system)
- Touch point konstanty
- Game timing konstanty
- Upgrade tree konstanty
- Vsechny game-design testy pro mechaniky (upgradeEffects, upgradeFlow, playerLeveling, whiteShotAndFireball, spellArea, twoSkillConfig)

## Co je OUT OF SCOPE

- Nove game design testy (task 7)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Zadny EnemyDef pro enemy bez spritu v constants.ts
- [ ] #2 HitZoneLayout, MaskConfig, EnemyShape typy smazany z types/index.ts
- [ ] #3 STONE_GIANT_DISPLAY_WIDTH a per-character frame count konstanty smazany (data v manifestech)
- [ ] #4 Legacy hit zone geometry konstanty smazany (ENEMY_HEAD_RADIUS_CM, ENEMY_TORSO_*, atd.) pokud nejsou pouzivany jinde
- [ ] #5 Game design testy pro smazane enemy smazany
- [ ] #6 Game design testy pro mechaniky (upgradeEffects, playerLeveling, whiteShotAndFireball, atd.) zustavaji a prochazi
- [ ] #7 npm run test prochazi bez chyb
- [ ] #8 npm run build prochazi bez TS chyb
- [ ] #9 grep -r 'GOBLIN_SCOUT\|ORC_WARRIOR\|STONE_TROLL\|SHADOW_DANCER\|IRON_GOLEM\|BLACK_HOLE\|STONE_DRAKE\|THORNBACK\|ANCIENT_TREANT\|FROST_ELEMENTAL\|LAVA_SLUG\|THUNDER_HAWK\|MIRROR_KNIGHT\|VOID_WRAITH' src/ vraci prazdny vysledek
<!-- AC:END -->
