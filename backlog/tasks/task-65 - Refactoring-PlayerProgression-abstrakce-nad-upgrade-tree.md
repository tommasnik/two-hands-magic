---
id: TASK-65
title: 'Refactoring: PlayerProgression abstrakce nad upgrade tree'
status: In Progress
assignee: []
created_date: '2026-05-30 22:28'
updated_date: '2026-05-30 23:04'
labels:
  - refactoring
dependencies:
  - TASK-62
references:
  - DependencyMap.md#2.5
  - GameDesign.md#7.2
documentation:
  - DependencyMap.md
  - GameDesign.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Před implementací přečti
`GameDesign.md` §7.2 (PlayerStats cílový stav, STR/DEX/INT/ENERGY vize) a `DependencyMap.md` §2.5.

## Přehled
Aktuální `GlobalUpgradeState` je natvrdo propojený se systémy. Až přijde STR/DEX/INT/ENERGY refactoring (mimo scope tohoto tasku), musí být možné ho provést bez změny konzumentů. Cíl: čistá abstrakce `PlayerStats` jako jediný výstup progression systému.

## PlayerStats interface
```ts
interface PlayerStats {
  /** Násobič damage při CRIT zásahu. Default: 2.0 */
  critDamageMultiplier: number
  /** Násobič periody rotace zaměřovače. Default: 1.0, <1 = rychlejší */
  castTimeMultiplier: number
  /** Násobič rychlosti projektilu. Default: 1.0 */
  projectileSpeedMultiplier: number
  /** Násobič poloměru projektilu (spell area). Default: 1.0 */
  spellAreaMultiplier: number
  /** Max HP hráče. */
  maxHp: number
}
```

### quickChainBonus — nepatří do PlayerStats
`quickChainBonus` je timing-závislá mechanika (zasáhni do 800 ms cross-slot), ne atribut hráče.
Zůstává jako separátní parametr `DamageSystem.calculateDamage()`. Do `PlayerStats` nepatří.
`PlayerStats` nese pouze `quickChainEnabled: boolean` a `quickChainWindowMs: number` (co upgrade odemkl),
`DamageSystem` sám vyhodnotí timing.

## computePlayerStats
```ts
/** Čistá funkce — snadno testovatelná, snadno nahraditelná. */
function computePlayerStats(state: GlobalUpgradeState): PlayerStats
```

Všechny systémy čtou `PlayerStats`, ne `GlobalUpgradeState` přímo:
- `DamageSystem` — critDamageMultiplier, quickChainEnabled/WindowMs
- `AimSystem` — castTimeMultiplier
- `ProjectileSystem` — projectileSpeedMultiplier, spellAreaMultiplier
- `Player` entity — maxHp

`GlobalUpgradeState` zůstává jako interní stav `PlayerProgression` — žádný systém ho neimportuje přímo.

## Budoucí rozšíření (OUT OF SCOPE)
Až přijde STR/DEX/INT/ENERGY: stačí změnit `computePlayerStats()`. Konzumenti se nemění.

## Co je OUT OF SCOPE
- Žádný nový UI
- Žádný redesign upgrade tree
- STR/DEX/INT/ENERGY není implementováno
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PlayerStats interface existuje v src/game/types.ts nebo src/game/systems/PlayerProgression.ts
- [x] #2 computePlayerStats(GlobalUpgradeState): PlayerStats je čistá funkce pokrytá unit testy
- [x] #3 DamageSystem, AimSystem, ProjectileSystem neimportují GlobalUpgradeState — čtou jen PlayerStats
- [x] #4 quickChainBonus zůstává timing-parametr v DamageSystem, PlayerStats nese jen quickChainEnabled + quickChainWindowMs
- [x] #5 npm run test prochází, coverage 100 % na src/game/**
- [x] #6 npm run test:e2e prochází beze změn
<!-- AC:END -->
