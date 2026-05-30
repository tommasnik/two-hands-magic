---
id: TASK-60.3
title: EnemyBehaviorRunner — graf runner (pure TS)
status: Done
assignee: []
created_date: '2026-05-30 12:41'
updated_date: '2026-05-30 13:06'
labels: []
dependencies:
  - TASK-60.1
documentation:
  - EnemyAttacks.md
parent_task_id: TASK-60
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
„Mozek" frameworku: `src/game/systems/EnemyBehaviorRunner.ts` (pure TS, žádný Phaser). Vykonává `BehaviorGraph` — drží aktivní uzel, vyhodnocuje exit triggery, guardy a vážený výběr hran, hlásí kdy se má vyslat útok (release frame) a jakou animaci hrát. Kontrakt viz EnemyAttacks.md §3 a §6.

Závislost na TASK-60.1: typy BehaviorGraph/Node/Edge/ExitTrigger/Guard/AttackSpec.

Chování:
- `tick(dtMs, ctx)` kde ctx poskytuje aktuální frame animace, enemyHpPct, isStunned, a callback/event pro „spawn delivery" (runner sám delivery neletí — to dělá DeliverySystem; runner jen emituje AttackSpec na release framu).
- Exit triggery: animationComplete (one-shot anim dohraje), afterMs (dwell), condition (guard začne platit).
- Při exitu uzlu: vyber hrany s platným guardem → vážený random (RNG injektovatelné pro testy).
- Guardy: always, enemyHpBelow, enemyHpAbove, attackCountAtLeast. Runner inkrementuje attackCount při každém vyslaném útoku.
- Release frame: na daném framu animace uzlu emituje AttackSpec právě jednou.
- Stun: tick = no-op (zmrazí uzel i časovače), žádné vyhodnocení hran.
- holdFrame: uzel může místo přehrávání držet jeden frame jiné animace (chybějící idle).
- Terminální uzel (bez hran) → restart do start uzlu.
- Vystavuje aktuální animKey + frameIndex pro renderer (přes GameStateMachine).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 EnemyBehaviorRunner v src/game/systems/ je pure TS (žádný import z 'phaser')
- [x] #2 Exit triggery fungují: animationComplete, afterMs(dwell), condition(guard) — každý přejde na vyhodnocení hran ve správný okamžik
- [x] #3 Guardy always/enemyHpBelow/enemyHpAbove/attackCountAtLeast se vyhodnotí správně; vybírají se jen hrany s platným guardem
- [x] #4 Vážený výběr hran je deterministický při injektovaném RNG; rozložení odpovídá váhám
- [x] #5 Na release framu uzlu se AttackSpec emituje právě jednou; attackCount se inkrementuje
- [x] #6 Stun: tick je no-op (uzel i exit-trigger časovač zamrznou), po skončení pokračuje z místa
- [x] #7 holdFrame fallback funguje pro uzel bez vlastní loop animace; terminální uzel restartuje graf do start
- [x] #8 Unit testy pokrývají všechny výše; 100% coverage souboru
<!-- AC:END -->
