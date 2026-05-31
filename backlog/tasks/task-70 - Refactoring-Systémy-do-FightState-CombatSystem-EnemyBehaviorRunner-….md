---
id: TASK-70
title: 'Refactoring: Systémy do FightState (CombatSystem, EnemyBehaviorRunner, …)'
status: Done
assignee: []
created_date: '2026-05-31 07:50'
updated_date: '2026-05-31 08:17'
labels:
  - refactoring
  - architecture
dependencies:
  - TASK-69
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled

Přesunout fight-local systémy (`CombatSystem`, `EnemyBehaviorRunner`, `ProjectileSystem`, `DeliverySystem`, `StatusEffectSystem`) z GSM do `FightState`. Toto je třetí krok série refactoringu.

## Motivace

Po task B má `FightState` fight-local data, ale systémy jsou stále private fields GSM. Tím GSM stále ví o fight internals. Cíl: `FightState` zapouzdří i systémy — GSM jen zavolá `this._fight.update(dt, inputs, this._global)` a dostane zpět výsledek.

## Proč systémy patří do FightState

Všechny tyto systémy jsou **výhradně fight-local**:
- `CombatSystem` — score, fightStats, lastHit, lastCastBySlot — vše se zahodí při resetu
- `EnemyBehaviorRunner` — aktuální uzel grafu, timery — vše fight-local
- `ProjectileSystem` — aktivní projektily v letu
- `DeliverySystem` — enemy útoky v letu
- `StatusEffectSystem` — aktivní statusy enemy (frozen, shocked…)

Reset = `new FightState(def, snapshot)` zničí všechny systémy najednou.

## Jak se řeší závislost na GlobalUpgradeState

`CombatSystem.processHit()` potřebuje `GlobalUpgradeState` (multipliery). Přístup: GSM předá upgrades jako parametr volání — **FightState nemá stored referenci na GlobalState**.

```ts
// FightState.update() dostane upgrades jako parametr od GSM
update(dt: number, inputs: InputEvent[], upgrades: GlobalUpgradeState): FightUpdateResult

// Nebo: GSM předá snapshot při initu (viz task B) a FightState ho drží lokálně
// Tento přístup je preferovaný — snapshot pattern z task B
```

Preferovaný přístup je snapshot pattern (upgrades jsou zkopírovány do FightState při initu a drží se po celou dobu fightu — to je safe, protože upgrady se mění jen mezi fighty).

## Cílová struktura FightState

```ts
class FightState {
  // Snapshot (z task B)
  private readonly _upgrades: GlobalUpgradeState
  private readonly _playerMaxHp: number

  // Systémy — fight-local lifetime
  readonly combat: CombatSystem
  readonly runner: EnemyBehaviorRunner
  readonly projectiles: ProjectileSystem
  readonly delivery: DeliverySystem
  readonly statusEffects: StatusEffectSystem

  // Data
  enemyHp: number
  playerHp: number
  // ...

  constructor(def: EnemyDef, snapshot: FightInitSnapshot) {
    this._upgrades = snapshot.upgrades
    this._playerMaxHp = snapshot.playerMaxHp
    this.combat = new CombatSystem()
    this.runner = new EnemyBehaviorRunner(def.behaviorGraph)
    this.projectiles = new ProjectileSystem()
    this.delivery = new DeliverySystem()
    this.statusEffects = new StatusEffectSystem()
    this.enemyHp = def.maxHp
    this.playerHp = snapshot.playerMaxHp
  }
}
```

## GSM po refactoringu

GSM přestane vlastnit `_combat`, `_runner`, `_projectileSystem`, `_deliverySystem`, `_statusEffects` jako private fields. Tyto jsou dostupné přes `this._fight.*` pokud GSM orchestraci potřebuje, nebo jsou volány přes `this._fight.update()`.

## Co je OUT OF SCOPE

- Změna `getState()` return type — to je task D
- Žádné herní mechaniky se nemění
- AimSystem a InputManager zůstanou v GSM (nejsou fight-exclusive — InputManager zpracovává input bez ohledu na fight, AimSystem spravuje rotaci per slot)

## Acceptance Criteria
<!-- AC:BEGIN -->
- `FightState` konstruktor vytváří všechny fight-local systémy
- GSM nemá private fields `_combat`, `_runner`, `_projectileSystem`, `_deliverySystem`, `_statusEffects`
- FightState nemá stored referenci na GlobalState (upgrades jsou snapshot z initu)
- `npm run test` projde, `npm run build` projde
<!-- SECTION:DESCRIPTION:END -->

- [x] #1 FightState konstruktor vytváří CombatSystem, EnemyBehaviorRunner, ProjectileSystem, DeliverySystem, StatusEffectSystem
- [x] #2 GSM nemá private fields _combat, _runner, _projectileSystem, _deliverySystem, _statusEffects
- [x] #3 FightState nemá stored referenci na GlobalState
- [x] #4 npm run test projde
- [x] #5 npm run build projde
<!-- AC:END -->
