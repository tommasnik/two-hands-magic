---
id: TASK-42
title: 'GlobalUpgradeState — typy, konstanty, strom'
status: Done
assignee: []
created_date: '2026-05-22'
labels:
  - game-logic
  - constants
dependencies:
  - TASK-41
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Definovat celý upgrade strom jako data — typy, konstanty, a pure funkce pro aplikaci upgradů.
Žádná herní logika zde — jen datový model. Ostatní systémy si z něj vezmou hodnoty.

### `types/index.ts` — nové typy

```typescript
type UpgradeNodeId =
  | 'cast_time_1' | 'cast_time_2' | 'cast_time_3'
  | 'crit_dmg_1'  | 'crit_dmg_2'  | 'crit_dmg_3'
  | 'crit_zone_1' | 'crit_zone_2'
  | 'crit_stun_1' | 'crit_stun_2'
  | 'proj_speed_1'| 'proj_speed_2' | 'proj_speed_3'
  | 'quick_chain_1'| 'quick_chain_2'
  | 'spell_area_1'| 'spell_area_2' | 'spell_area_3'

interface GlobalUpgradeState {
  castTimeMultiplier: number        // 1.0 → 0.70  (rotační perioda)
  critDamageMultiplier: number      // 2.0 → 3.2
  critZoneTolerance: number         // 0 → 0.30    (near-miss crit radius fraction)
  critStunChance: number            // 0 → 0.35
  critStunDurationMs: number        // 0 → 2000
  projectileSpeedMultiplier: number // 1.0 → 1.50
  quickChainBonus: number           // 0 → 0.35    (damage multiplier bonus)
  quickChainWindowMs: number        // 0 → 1000
  spellAreaMultiplier: number       // 1.0 → 1.60
  unlockedNodeIds: UpgradeNodeId[]
}

interface UpgradeNodeDef {
  id: UpgradeNodeId
  title: string
  description: string             // 1 věta pro UI
  requires: UpgradeNodeId[]       // prázdné = root node
  applyTo: (s: GlobalUpgradeState) => GlobalUpgradeState
}
```

### `constants.ts` — datová definice stromu

```typescript
export const DEFAULT_GLOBAL_UPGRADE_STATE: GlobalUpgradeState = {
  castTimeMultiplier: 1.0,
  critDamageMultiplier: CRIT_DAMAGE_MULTIPLIER,  // 2.0
  critZoneTolerance: 0,
  critStunChance: 0,
  critStunDurationMs: 0,
  projectileSpeedMultiplier: 1.0,
  quickChainBonus: 0,
  quickChainWindowMs: 0,
  spellAreaMultiplier: 1.0,
  unlockedNodeIds: [],
}

export const UPGRADE_NODES: UpgradeNodeDef[] = [
  // CAST TIME
  { id: 'cast_time_1', title: 'Zrychlení I',    requires: [],            applyTo: s => ({ ...s, castTimeMultiplier: 0.90 }) },
  { id: 'cast_time_2', title: 'Zrychlení II',   requires: ['cast_time_1'], applyTo: s => ({ ...s, castTimeMultiplier: 0.80 }) },
  { id: 'cast_time_3', title: 'Zrychlení III',  requires: ['cast_time_2'], applyTo: s => ({ ...s, castTimeMultiplier: 0.70 }) },
  // CRIT DMG
  { id: 'crit_dmg_1',  title: 'Ostré hroty I',  requires: [],            applyTo: s => ({ ...s, critDamageMultiplier: 2.3 }) },
  { id: 'crit_dmg_2',  title: 'Ostré hroty II', requires: ['crit_dmg_1'], applyTo: s => ({ ...s, critDamageMultiplier: 2.7 }) },
  { id: 'crit_dmg_3',  title: 'Ostré hroty III',requires: ['crit_dmg_2'], applyTo: s => ({ ...s, critDamageMultiplier: 3.2 }) },
  // CRIT ZONE
  { id: 'crit_zone_1', title: 'Rozšířená slabina I',  requires: ['crit_dmg_1'], applyTo: s => ({ ...s, critZoneTolerance: 0.15 }) },
  { id: 'crit_zone_2', title: 'Rozšířená slabina II', requires: ['crit_zone_1'], applyTo: s => ({ ...s, critZoneTolerance: 0.30 }) },
  // CRIT STUN
  { id: 'crit_stun_1', title: 'Omráčení I',  requires: ['crit_dmg_2'], applyTo: s => ({ ...s, critStunChance: 0.20, critStunDurationMs: 1500 }) },
  { id: 'crit_stun_2', title: 'Omráčení II', requires: ['crit_stun_1'], applyTo: s => ({ ...s, critStunChance: 0.35, critStunDurationMs: 2000 }) },
  // PROJECTILE SPEED
  { id: 'proj_speed_1', title: 'Rychlý výstřel I',  requires: [],              applyTo: s => ({ ...s, projectileSpeedMultiplier: 1.15 }) },
  { id: 'proj_speed_2', title: 'Rychlý výstřel II', requires: ['proj_speed_1'], applyTo: s => ({ ...s, projectileSpeedMultiplier: 1.30 }) },
  { id: 'proj_speed_3', title: 'Rychlý výstřel III',requires: ['proj_speed_2'], applyTo: s => ({ ...s, projectileSpeedMultiplier: 1.50 }) },
  // QUICK CHAIN
  { id: 'quick_chain_1', title: 'Řetěz I', requires: ['cast_time_1'],   applyTo: s => ({ ...s, quickChainBonus: 0.20, quickChainWindowMs: 800 }) },
  // NOTE: quick_chain_1 also unlockable via proj_speed_1 — requires() check musí podporovat OR; nebo jako 2 separátní root node verze
  { id: 'quick_chain_2', title: 'Řetěz II',requires: ['quick_chain_1'], applyTo: s => ({ ...s, quickChainBonus: 0.35, quickChainWindowMs: 1000 }) },
  // SPELL AREA
  { id: 'spell_area_1', title: 'Větší dopad I',   requires: [],              applyTo: s => ({ ...s, spellAreaMultiplier: 1.20 }) },
  { id: 'spell_area_2', title: 'Větší dopad II',  requires: ['spell_area_1'], applyTo: s => ({ ...s, spellAreaMultiplier: 1.40 }) },
  { id: 'spell_area_3', title: 'Větší dopad III', requires: ['spell_area_2'], applyTo: s => ({ ...s, spellAreaMultiplier: 1.60 }) },
]
```

### Pure funkce `applyUpgradeNode()` (`GameStateMachine.ts` nebo `upgrades.ts`)

```typescript
function applyUpgradeNode(
  state: GlobalUpgradeState,
  nodeId: UpgradeNodeId
): GlobalUpgradeState {
  const node = UPGRADE_NODES.find(n => n.id === nodeId)!
  const newState = node.applyTo(state)
  return { ...newState, unlockedNodeIds: [...state.unlockedNodeIds, nodeId] }
}

function getAvailableNodes(state: GlobalUpgradeState): UpgradeNodeDef[] {
  return UPGRADE_NODES.filter(node =>
    !state.unlockedNodeIds.includes(node.id) &&
    node.requires.every(dep => state.unlockedNodeIds.includes(dep))
  )
}
```

### Poznámky k designu

- `quick_chain_1` má OR závislost (cast_time_1 nebo proj_speed_1). Dvě možnosti:
  a) `requires` pole = OR sémantika (pokud alespoň 1 je splněn)
  b) Duplikovat node jako `quick_chain_1a` a `quick_chain_1b`
  → Doporučení: řešení (a), `getAvailableNodes` zkontroluje `requires.some(...)` místo `requires.every(...)`

## Game Design testy

Tento task je čistý datový model — neovlivňuje přímo gameplay a **nevyžaduje** game design testy v `src/tests/game-design/`.

Game design testy pro upgrade systém patří do:
- **task-43** (DamageSystem) — crit multiplier, stun, quick chain efekty na combat
- **task-44** (ProjectileSystem) — spell area a projectile speed na encounter flow
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `DEFAULT_GLOBAL_UPGRADE_STATE` obsahuje správné výchozí hodnoty
- [x] #2 `applyUpgradeNode('crit_dmg_1', ...)` vrátí `critDamageMultiplier: 2.3` a node v `unlockedNodeIds`
- [x] #3 `getAvailableNodes` vrátí jen root nodes pro čistý stav; po odemčení `crit_dmg_1` vrátí i `crit_dmg_2` a `crit_zone_1`
- [x] #4 Aplikovat všechny tiery jedné cesty = správné finální hodnoty (cast_time_3 → 0.70)
- [x] #5 Unit testy pro `applyUpgradeNode` a `getAvailableNodes`
<!-- AC:END -->
