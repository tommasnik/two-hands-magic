---
id: TASK-69
title: 'Refactoring: FightState — fight-local data vyčleněno z GSM'
status: Done
assignee: []
created_date: '2026-05-31 07:50'
updated_date: '2026-05-31 08:09'
labels:
  - refactoring
  - architecture
dependencies:
  - TASK-68
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled

Vytvořit třídu `FightState` která zapouzdří všechna fight-local data. `GameStateMachine` bude mít `private _global: GlobalState` a `private _fight: FightState`. Toto je druhý krok série refactoringu.

## Motivace

Aktuálně jsou fight-local pole (`enemyHp`, `lastPlayerHit`, `_lightningDischargeUntilMs`, `_wasFrozenLastTick`, …) rozptýlena přímo jako private fields GSM. Reset fightu = tucet individuálních přiřazení. Cíl: `reset = new FightState(def, global.progression.snapshotForFight())`.

## Klíčový design princip: snapshot pattern

`FightState` **nemá žádnou referenci na `GlobalState`**. Při inicializaci dostane kopii hodnot (`FightInitSnapshot`) — konkrétně `upgrades` a `playerMaxHp`. Tyto hodnoty se během fightu nemění (upgrady se mění jen mezi fighty), takže snapshot je po celou dobu platný.

```ts
class FightState {
  // Snapshot z GlobalState při initu — žádná živá reference
  private readonly _upgrades: GlobalUpgradeState
  private readonly _playerMaxHp: number

  // Fight-local data
  enemyHp: number
  playerHp: number
  activeProjectiles: Projectile[]
  activeDeliveries: ActiveDelivery[]
  lastHit: HitRecord | null
  lastPlayerHit: PlayerHitEvent | null
  enemyStunnedUntilMs: number
  enemyStatusEffects: StatusEffect[]
  lightningDischargeUntilMs: number
  lightningDischargeResult: HitResult | null
  lightningDischargeTarget: string | null
  statsSnapshot: FightStatsSnapshot | null

  constructor(def: EnemyDef, snapshot: FightInitSnapshot) { … }

  buildResult(): FightResult { … }
}

interface FightResult {
  xpGained: number
  statsSnapshot: FightStatsSnapshot
  playerSurvived: boolean
}
```

## Co se přesune do FightState

Z GSM private fields:
- `enemyHp`, `enemyMaxHp`, `enemyName`, `_enemySpriteKey`, `_enemyManifestId`, `_enemyHitZoneMap`
- `enemyStunnedUntilMs`, `_enemyStatusEffects`, `_wasFrozenLastTick`
- `_lightningDischargeUntilMs`, `_lightningDischargeResult`, `_lightningDischargeTarget`
- `lastPlayerHit`
- Aktivní projektily a delivery (aktuálně v subsystémech — data zůstanou v subsystémech, ale lifetime je řízen FightState)

## GlobalState

```ts
class GlobalState {
  phase: Phase
  currentLevel: number
  progression: PlayerProgression  // viz task A
}
```

## Lifetime a reset

```ts
// GSM
private resetFight(def: EnemyDef): void {
  this._fight = new FightState(def, this._global.progression.snapshotForFight())
}

// Po konci fightu
private onFightEnd(): void {
  const result = this._fight.buildResult()
  this._global.progression.applyFightResult(result)
}
```

## Co je OUT OF SCOPE

- Přesun systémů (CombatSystem, EnemyBehaviorRunner) do FightState — to je task C
- Změna `getState()` return type — to je task D
- Žádné herní mechaniky se nemění

## Acceptance Criteria
<!-- AC:BEGIN -->
- `FightState` a `GlobalState` existují jako samostatné třídy v `src/game/`
- `FightResult` typ definován v `src/types/`
- GSM reset = `new FightState(def, snapshot)` — žádná ruční inicializace fight polí
- FightState nemá import ani referenci na GlobalState
- `npm run test` projde
<!-- SECTION:DESCRIPTION:END -->

- [x] #1 FightState a GlobalState existují jako samostatné třídy
- [x] #2 FightState nemá žádný import ani referenci na GlobalState
- [x] #3 GSM reset = new FightState(def, snapshot) — ne ruční přiřazení fight polí
- [x] #4 FightResult typ definován v src/types/
- [x] #5 npm run test + npm run build projdou
<!-- AC:END -->
