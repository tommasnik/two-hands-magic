---
id: TASK-60.4
title: >-
  GameStateMachine integrace — napojit runner + delivery, odstranit starý attack
  path
status: In Progress
assignee: []
created_date: '2026-05-30 12:42'
updated_date: '2026-05-30 14:15'
labels: []
dependencies:
  - TASK-60.2
  - TASK-60.3
documentation:
  - EnemyAttacks.md
parent_task_id: TASK-60
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Propojit `EnemyBehaviorRunner` (TASK-60.3) a `DeliverySystem` (TASK-60.2) do herní smyčky a odstranit zbytky starého `EnemyAttackSystem`. Kontrakt viz EnemyAttacks.md §2 a §6.

V `GameStateMachine.update()`:
- Místo dnešní enemyAttackSystem.update(): tick runner s ctx (aktuální frame, enemyHpPct, isStunned ze _enemyStunnedUntilMs). Když runner emituje AttackSpec → DeliverySystem.spawn().
- DeliverySystem.update() posune deliveries; DeliveryHitEvent → _applyPlayerHit(damage) (zachovat existující game-over přechod při player.isDead()).
- Řídit animaci enemy z runneru: enemy.playAnimation/holdFrame dle aktivního uzlu (nahradit natvrdo `playAnimation('attack')` při spawnu missile).
- _loadLevel: místo setAttacks(enemyDef.attacks) inicializovat runner z enemyDef.behaviorGraph; reset DeliverySystem a runneru.
- Enemy bez behaviorGraph: nic neútočí (runner se neinicializuje) — neútočící enemy je validní stav.
- getState()/test bridge: vystavit aktivní deliveries (getActive) místo getMissiles, ať render i e2e vidí orby/overlaye.
- Odstranit EnemyAttackSystem (a jeho test) pokud po vyčlenění delivery mechaniky nezbyde nic užitečného.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GameStateMachine.update() tickuje runner a spawnuje deliveries při emitovaném AttackSpec; DeliveryHitEvent vede na _applyPlayerHit a zachová game-over při smrti hráče
- [x] #2 Animace enemy se řídí z aktivního uzlu runneru (včetně holdFrame); zmizel natvrdo zadaný playAnimation('attack') při spawnu
- [x] #3 Stun (_enemyStunnedUntilMs) zmrazí runner (tick no-op); již letící deliveries pokračují
- [x] #4 _loadLevel inicializuje runner z enemyDef.behaviorGraph a resetuje DeliverySystem; enemy bez grafu neútočí bez chyby
- [x] #5 getState()/test bridge vystavuje aktivní deliveries (nahrazuje getMissiles)
- [x] #6 Starý EnemyAttackSystem (a jeho weighted-picker logika) je odstraněn nebo redukován bezezbytku; npm run build prochází
- [x] #7 grep 'from \'phaser\'' src/game/ nic nevrací; npm run test a npm run test:coverage prochází (100% na src/game/**)
<!-- AC:END -->
