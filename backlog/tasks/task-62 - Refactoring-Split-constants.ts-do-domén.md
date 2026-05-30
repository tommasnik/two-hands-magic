---
id: TASK-62
title: 'Refactoring: Split constants.ts do domén'
status: In Progress
assignee: []
created_date: '2026-05-30 22:27'
updated_date: '2026-05-30 22:39'
labels:
  - refactoring
dependencies: []
references:
  - DependencyMap.md#3
  - GameDesign.md#10.2
documentation:
  - DependencyMap.md
  - GameDesign.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Před implementací přečti
`DependencyMap.md` §3 (přehled co importuje z constants.ts a proč).

## Přehled
`constants.ts` má 1029 řádků a obsahuje vše dohromady — canvas, input, skilly, enemies, upgrady, leveling. Každý modul v projektu importuje z jednoho souboru. Cíl: rozdělit na doménové soubory, žádná funkční změna.

## Cílová struktura
```
src/game/constants/
  canvas.ts        ← GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM, MAX_DELTA_MS
  input.ts         ← MAX_SIMULTANEOUS_TOUCHES, AIM_GAIN, TP_* pozice touch pointů
  player.ts        ← PLAYER_MAX_HP, PLAYER_START_LEVEL, PLAYER_MAX_LEVEL, XP_LEVEL_THRESHOLDS
  upgrades.ts      ← UPGRADE_NODES, applyUpgradeNode, getAvailableNodes
  enemies/
    index.ts       ← ENEMY_POOL (re-export)
    stone-giant.ts ← ENEMY_STONE_GIANT + jeho specifické konstanty
    plague-rat.ts
    … (jeden soubor per enemy, viz ENEMY_POOL v původním constants.ts)
  skills/
    index.ts       ← DEFAULT_SKILL_CONFIG, SKILL_ROTATION_PERIOD_MS, společné konstanty
    fireball.ts    ← FIREBALL_DAMAGE_*, FIREBALL_SPEED_CM, atd.
    ice-crystal.ts
    lightning-blast.ts
    white-shot.ts
```

## Barrel re-export a cleanup
Stávající `src/game/constants.ts` se přemění na **re-export barrel**:
```ts
export * from './constants/canvas'
export * from './constants/input'
// …atd.
```
Barrel zajistí, že žádný existující import se nerozbije. Barrel se **neodstraňuje** v rámci tohoto tasku — to je práce navazujících tasků (TASK-63+), které budou importovat přímo z doménových souborů.

## Co je OUT OF SCOPE
- Žádné přejmenovávání konstant
- Žádné změny hodnot
- Žádné změny v kódu, který konstanty používá
- Odstranění barrel souboru
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Každá doménová skupina konstant je ve vlastním souboru pod src/game/constants/
- [x] #2 src/game/constants.ts existuje jako barrel re-export všech doménových souborů
- [x] #3 Žádný existující import v projektu se nerozbil — grep -r "from.*constants" src/ vrací stejné výsledky
- [x] #4 npm run test prochází beze změn
- [x] #5 npm run test:e2e prochází beze změn
- [x] #6 npm run build prochází beze změn
<!-- AC:END -->
