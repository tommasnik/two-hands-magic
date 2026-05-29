---
id: TASK-8
title: Game state machine & score tracking
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:19'
updated_date: '2026-05-13 12:20'
labels:
  - game-logic
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementovat GameStateMachine jako orchestrátor celé hry. Toto je centrální třída, kterou volají Phaser scény. Musí být plně testovatelná bez renderingu.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GameStateMachine.update(dt: number, inputs: InputEvent[]): GameState – pure orchestration
- [ ] #2 Stavy: 'loading' | 'battle' | 'game_over' – správné přechody
- [ ] #3 BattleState obsahuje: score, activeProjectiles, enemy, touchStates, elapsedMs, lastHit
- [ ] #4 Score tracking: CRIT +3, HIT +1, GRAZE +0, MISS +0 (konstanty v constants.ts)
- [ ] #5 Delta time capped na MAX_DELTA_MS (50ms) – stejně jako laser-shot
- [ ] #6 GameStateMachine.getState(): GameState vrací serializovatelný snapshot (pro test bridge)
- [ ] #7 Unit testy: celý battle flow – fire → hit → score update v jednom test případu
- [ ] #8 Unit testy: state přechody (loading→battle, battle→game_over)
- [ ] #9 Unit testy: determinismus – stejná sekvence inputů vždy produkuje stejný state
<!-- AC:END -->
