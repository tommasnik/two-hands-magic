---
id: TASK-71
title: 'Refactoring: getState() → { fight: FightSnapshot, game: GlobalSnapshot }'
status: Done
assignee: []
created_date: '2026-05-31 07:50'
updated_date: '2026-05-31 08:17'
labels:
  - refactoring
  - architecture
dependencies:
  - TASK-70
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled

Změnit return type `GameStateMachine.getState()` z plochého `GameState` na strukturovaný objekt `{ fight: FightSnapshot, game: GlobalSnapshot }`. Aktualizovat všechny callery. Toto je čtvrtý krok série refactoringu.

## Motivace

Po taskech A–C jsou `FightState` a `GlobalState` oddělené interně. Ale `getState()` stále vrací plochý merge — BattleScene a PhaseOverlayManager importují typ který obsahuje pole ze dvou domén promíchaná dohromady.

Cíl: každý caller dostane jen to, co potřebuje. PhaseOverlayManager závisí jen na `GlobalSnapshot` — nemůže náhodou začít číst fight pole.

## Nový return type

```ts
interface GameStateResult {
  fight: FightSnapshot    // serializovatelný snapshot FightState
  game: GlobalSnapshot    // serializovatelný snapshot GlobalState
}

// GameStateMachine
getState(): GameStateResult
update(dt, inputs): GameStateResult
```

`FightSnapshot` a `GlobalSnapshot` jsou plain data objekty (jako dnešní GameState) — serializovatelné, bez metod.

## Callery a co potřebují

**BattleScene:**
```ts
const { fight, game } = gameMachine.update(cappedDelta, inputs)
// renderers
enemyRenderer.update(dtS, fight)
skillRenderer.update(dtS, fight.activeProjectiles)
hudRenderer.update(cappedDelta, fight, game)   // HUD potřebuje oboje: HP (fight) + XP/level (game)
phaseOverlay.update(game, fight.statsSnapshot) // overlay potřebuje phase/pendingLevelUp (game) + stats (fight)
```

**BattleScene.onRender():**
```ts
const { fight, game } = gameMachine.getState()
// canvas renderers čtou z fight
```

**PhaseOverlayManager:**
Přijme jen `GlobalSnapshot` + volitelně `FightStatsSnapshot` — viz task E.

## Typy

Původní `GameState` v `src/types/index.ts` se rozdělí (nebo zůstane jako alias pro zpětnou kompatibilitu testů):

```ts
// Nové typy
export interface FightSnapshot { … }    // enemy, player, projectiles, deliveries, effects, …
export interface GlobalSnapshot { … }   // phase, currentLevel, playerXp, playerLevel, pendingLevelUp, upgrades

// Alias pro postupnou migraci (smazat po task E)
export type GameState = FightSnapshot & GlobalSnapshot
```

## Co je OUT OF SCOPE

- Refactoring PhaseOverlayManager API — to je task E
- Žádné herní mechaniky se nemění

## Acceptance Criteria
<!-- AC:BEGIN -->
- `getState()` vrací `{ fight: FightSnapshot, game: GlobalSnapshot }`
- `update()` vrací stejný typ
- BattleScene destrukturuje `{ fight, game }` a předává správné části rendererům
- `FightSnapshot` a `GlobalSnapshot` typy definovány v `src/types/`
- `npm run test` projde, `npm run build` projde
- E2E testy projdou (`npm run test:e2e`) — testBridge se přizpůsobí
<!-- SECTION:DESCRIPTION:END -->

- [x] #1 getState() vrací { fight: FightSnapshot, game: GlobalSnapshot }
- [x] #2 BattleScene destukturuje { fight, game } a předává správné části rendererům
- [x] #3 FightSnapshot a GlobalSnapshot typy definovány v src/types/
- [x] #4 npm run test projde
- [x] #5 npm run build projde
- [x] #6 npm run test:e2e projde
<!-- AC:END -->
