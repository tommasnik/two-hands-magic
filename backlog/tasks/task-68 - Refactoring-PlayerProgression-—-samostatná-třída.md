---
id: TASK-68
title: 'Refactoring: PlayerProgression — samostatná třída'
status: In Progress
assignee: []
created_date: '2026-05-31 07:49'
updated_date: '2026-05-31 07:58'
labels:
  - refactoring
  - architecture
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled

Vyčlenit logiku player progression z `GameStateMachine` do samostatné třídy `PlayerProgression`. Toto je první krok série refactoringu, který oddělí globální game state od fight state.

## Motivace

Aktuálně jsou `playerXp`, `playerLevel`, `pendingLevelUp`, `globalUpgrades` a metody `confirmLevelUpUpgrade()` rozptýleny přímo v GSM. `PlayerProgression` je logicky uzavřený celek — má jasný vstup (kill event), jasný výstup (XP, level, upgrade strom) a nepotřebuje vědět nic o probíhajícím fightu.

## Datová struktura

```ts
class PlayerProgression {
  playerXp: number
  playerLevel: number
  pendingLevelUp: boolean
  upgrades: GlobalUpgradeState

  applyKill(): void                            // +1 XP, zkontroluje level-up threshold
  confirmUpgrade(nodeId: UpgradeNodeId): void  // aplikuje upgrade node
  computeMaxHp(): number                       // odvozené z upgradů
  snapshotForFight(): FightInitSnapshot        // kopie hodnot pro nový fight
}
```

`FightInitSnapshot` je nový typ:
```ts
interface FightInitSnapshot {
  upgrades: GlobalUpgradeState  // kopie, ne reference
  playerMaxHp: number
}
```

## Co se přesune

Z `GameStateMachine` do `PlayerProgression`:
- pole: `playerXp`, `playerLevel`, `pendingLevelUp`, `_globalUpgrades`
- metody: logika XP aplikace (po kill), `confirmLevelUpUpgrade()`, výpočet `maxHp` z upgradů

## Co zůstane v GSM / GlobalState

`GlobalState` bude mít `progression: PlayerProgression` jako subfield. GSM volá `this._global.progression.applyKill()` po zabití nepřítele.

## Co je OUT OF SCOPE

- Vytvoření `GlobalState` třídy (to je task B)
- Vytvoření `FightState` třídy (to je task B)
- Změna `getState()` API (to je task D)
- Žádné herní mechaniky se nemění, jen přesun kódu

## Acceptance Criteria
<!-- AC:BEGIN -->
- `PlayerProgression` existuje jako samostatná třída/soubor v `src/game/`
- GSM deleguje XP a upgrade logiku na `progression` instanci
- `FightInitSnapshot` typ existuje v `src/types/`
- `npm run test` projde (unit testy se přizpůsobí nové struktuře)
- `grep -r "playerXp\|playerLevel\|pendingLevelUp" src/game/GameStateMachine.ts` vrátí jen delegaci, ne přímou logiku
<!-- SECTION:DESCRIPTION:END -->

- [x] #1 PlayerProgression existuje jako samostatná třída v src/game/
- [x] #2 GSM deleguje XP/upgrade logiku na progression instanci — žádná inline logika v GSM
- [x] #3 FightInitSnapshot typ definován v src/types/
- [x] #4 npm run test projde
- [x] #5 npm run build projde (žádné TS chyby)
<!-- AC:END -->
