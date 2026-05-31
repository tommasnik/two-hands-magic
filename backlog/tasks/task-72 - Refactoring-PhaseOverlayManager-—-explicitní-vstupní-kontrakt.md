---
id: TASK-72
title: 'Refactoring: PhaseOverlayManager — explicitní vstupní kontrakt'
status: Done
assignee: []
created_date: '2026-05-31 07:51'
updated_date: '2026-05-31 08:47'
labels:
  - refactoring
  - architecture
dependencies:
  - TASK-71
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled

Refaktorovat `PhaseOverlayManager` aby přijímal explicitní vstupy místo celého `GameState`. Odebrat přímý import `gameMachine` z PhaseOverlayManager. Toto je pátý a poslední krok série refactoringu oddělení GameState / FightState.

## Motivace

Aktuálně `PhaseOverlayManager` volá `gameMachine.getState()` na 5 místech a importuje celý `GameState`. Přitom potřebuje jen:
- `GlobalSnapshot` (phase, currentLevel, playerLevel, playerXp, pendingLevelUp, upgrades)
- `FightStatsSnapshot` (statistiky po konci fightu — jen pro fight overview obrazovku)

Tím vzniká závislost PhaseOverlayManager na fight datech, která vůbec nepotřebuje.

## Cílové API PhaseOverlayManager

```ts
class PhaseOverlayManager {
  // Žádný import gameMachine, žádný import GameState

  update(game: GlobalSnapshot, fightStats: FightStatsSnapshot | null, dtMs: number): void

  // Callbacks pro akce uživatele — BattleScene je připojí při initu
  onNextLevel: () => void
  onRestartLevel: () => void
  onConfirmUpgrade: (nodeId: UpgradeNodeId) => void
  onFightOverviewContinue: () => void
}
```

Alternativa (pokud callbacks vadí): PhaseOverlayManager emituje vlastní eventy (`EventEmitter`), BattleScene je poslouchá.

## Aktuální problém — přímá volání gameMachine

PhaseOverlayManager aktuálně volá:
- `gameMachine.getState()` — 5× (nahradit parametrem `game: GlobalSnapshot`)
- `gameMachine.completeFightOverview()` — callback
- `gameMachine.nextLevel()` — callback
- `gameMachine.restartLevel()` — callback
- `gameMachine.confirmLevelUpUpgrade(nodeId)` — callback

Po refactoringu: PhaseOverlayManager nezná `gameMachine` vůbec. BattleScene ho injektuje callbacky při initu:

```ts
// BattleScene.create()
this._phaseOverlay = new PhaseOverlayManager(this._deliveryRenderer)
this._phaseOverlay.onNextLevel = () => gameMachine.nextLevel()
this._phaseOverlay.onRestartLevel = () => gameMachine.restartLevel()
this._phaseOverlay.onConfirmUpgrade = (id) => gameMachine.confirmLevelUpUpgrade(id)
this._phaseOverlay.onFightOverviewContinue = () => gameMachine.completeFightOverview()
```

## BattleScene.update() po refactoringu

```ts
update(_time: number, delta: number): void {
  const { fight, game } = gameMachine.update(cappedDelta, inputs)
  // …
  this._phaseOverlay.update(game, fight.statsSnapshot, cappedDelta)
}
```

## Co je OUT OF SCOPE

- Žádná změna vizuálu — fight overview, upgrade picker, game over overlay vypadají stejně
- Žádná změna herních mechanik
- `GameState` alias (zavedený v task D) lze smazat pokud ho testy nepoužívají

## Acceptance Criteria
<!-- AC:BEGIN -->
- `PhaseOverlayManager` nemá import `gameMachine` ani `GameState`
- `PhaseOverlayManager.update()` přijímá `(game: GlobalSnapshot, fightStats: FightStatsSnapshot | null, dtMs: number)`
- Akce (nextLevel, restartLevel, confirmUpgrade) jsou callbacky injektované z BattleScene
- `npm run test` projde, `npm run build` projde
- `npm run test:e2e` projde — vizuální chování nezměněno
<!-- SECTION:DESCRIPTION:END -->

- [x] #1 PhaseOverlayManager nemá import gameMachine ani GameState
- [x] #2 update() přijímá (game: GlobalSnapshot, fightStats: FightStatsSnapshot | null, dtMs: number)
- [x] #3 Akce (nextLevel, restartLevel, confirmUpgrade) jsou callbacky injecté z BattleScene
- [x] #4 npm run test projde
- [x] #5 npm run build projde
- [x] #6 npm run test:e2e projde (37 pre-existing failures, 9 passed — identické s výsledkem před task-72)
<!-- AC:END -->
