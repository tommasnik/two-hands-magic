---
id: TASK-60.2
title: DeliverySystem — orb let + overlay connect (pure TS)
status: Done
assignee: []
created_date: '2026-05-30 12:41'
updated_date: '2026-05-30 12:57'
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
Vyčlenit doručovací mechaniku útoků do samostatného `src/game/systems/DeliverySystem.ts` (pure TS, žádný Phaser). Recykluje let projektilů a flight-time výpočet z dnešního `EnemyAttackSystem`. Kontrakt viz EnemyAttacks.md §4.

Závislost na TASK-60.1: poskytuje typy `AttackSpec` (kind orb/overlay/effect, releaseFrame, visualKey, projectileSpeedCmS, castPoint, overlayConnectMs).

API:
- `spawn(spec, enemyCentre, playerCentre)` — vytvoří in-flight delivery.
- `update(dt)` — posune orb po trajektorii (progress dle flight-time) / odpočítá overlay connect; emituje `DeliveryHitEvent { damage }` v okamžiku connect (orb: progress≥1; overlay: overlayConnectMs).
- `getActive()` — serializovatelný snapshot pro render vrstvu (visualKey, kind, origin/target/progress).
- `reset()`.
Deliveries jsou fire-and-forget, nezávislé na stavu grafu; více souběžných je validní.
`kind: 'effect'` — žádný damage, žádný visual, jen hook (zatím no-op / projde bez efektu).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 DeliverySystem v src/game/systems/DeliverySystem.ts je pure TS (grep 'from \'phaser\'' nic nevrátí)
- [x] #2 Orb delivery: progress roste dle flight-time (vzdálenost/speed), DeliveryHitEvent s damage padne při progress>=1
- [x] #3 Overlay delivery: DeliveryHitEvent padne v okamžiku overlayConnectMs od spawnu, ne na sprite framu
- [x] #4 Více současně letících deliveries se aktualizuje nezávisle (fire-and-forget)
- [x] #5 getActive() vrací serializovatelný snapshot včetně visualKey a kind pro render vrstvu
- [x] #6 Unit testy pokrývají orb flight+connect, overlay connect timing, současné deliveries, RNG není potřeba (deterministické); 100% coverage souboru
- [ ] #7 1:DeliverySystem v src/game/systems/DeliverySystem.ts je pure TS (grep 'from 'phaser'' nic nevrátí)
<!-- AC:END -->
