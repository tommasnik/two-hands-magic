---
id: TASK-60.6
title: Konfigurace útoků všech 11 nepřátel — enemyGraphs.ts + konstanty
status: Done
assignee: []
created_date: '2026-05-30 12:43'
updated_date: '2026-05-30 18:06'
labels: []
dependencies:
  - TASK-60.4
  - TASK-60.5
documentation:
  - EnemyAttacks.md
parent_task_id: TASK-60
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nakonfigurovat behaviorGraph pro všech 11 nepřátel z ENEMY_POOL tak, aby každý útočil na hráče. Kontrakt viz EnemyAttacks.md §9.

- Grafy žijí v novém `src/game/enemyGraphs.ts` (pure TS, data). EnemyDef.behaviorGraph (constants.ts) odkazuje import.
- Číselné hodnoty (damage, cooldown/dwell, projectile speed, releaseFrame, overlayConnectMs) = pojmenované konstanty v constants.ts s JSDoc (what/unit/affects). ZERO hardcoded čísel v grafech.
- Většina (9 enemies, mají jen idle+attack): jednoduchý graf idle → attack → combat_idle → idle. Volba doručení dle archetypu: ranged = orb, melee (vlk/medvěd/orc apod.) = overlay (zuby/drápy/úder).
- crystal-spider (attack/attack_mandible/bite) a ice-giant (attack/throw): bohatší multi-attack graf s váženým výběrem mezi útoky. Oba NEMAJÍ idle → klidový uzel použije holdFrame (attack[0]).
- Defaulty damage/cooldown navrhni dle archetypu (slabší early enemies míň, bruiseři víc); ladění hodnot je očekávané a povolené.
- Ověřit, že každý z 11 reálně vyšle útok a sebere hráči HP (přes test bridge / unit-level smoke na runneru+delivery s daným grafem).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 src/game/enemyGraphs.ts obsahuje behaviorGraph pro všech 11 nepřátel z ENEMY_POOL; EnemyDef.behaviorGraph je nastavený u všech
- [ ] #2 Žádná hardcoded čísla v grafech — všechny hodnoty z pojmenovaných konstant v constants.ts s JSDoc; constants.test.ts ověřuje vztahy kde dává smysl
- [ ] #3 Ranged enemies používají orb delivery, melee enemies overlay delivery (dle archetypu)
- [ ] #4 crystal-spider a ice-giant mají multi-attack graf s váženým výběrem a klidový uzel přes holdFrame (chybí jim idle)
- [ ] #5 Každý z 11 nepřátel reálně vyšle útok a sebere hráči HP (ověřeno na runner+delivery úrovni)
- [ ] #6 npm run build, npm run test a npm run test:coverage prochází (100% na src/game/**); grep 'from \'phaser\'' src/game/ nic nevrací
- [ ] #7 1:src/game/enemyGraphs.ts obsahuje behaviorGraph pro všech 11 nepřátel z ENEMY_POOL; EnemyDef.behaviorGraph je nastavený u všech
- [ ] #8 2:Žádná hardcoded čísla v grafech — všechny hodnoty z pojmenovaných konstant v constants.ts s JSDoc; constants.test.ts ověřuje vztahy kde dává smysl
- [ ] #9 3:Ranged enemies používají orb delivery, melee enemies overlay delivery (dle archetypu)
- [ ] #10 4:crystal-spider a ice-giant mají multi-attack graf s váženým výběrem a klidový uzel přes holdFrame (chybí jim idle)
- [ ] #11 5:Každý z 11 nepřátel reálně vyšle útok a sebere hráči HP (ověřeno na runner+delivery úrovni)
- [ ] #12 6:npm run build, npm run test a npm run test:coverage prochází (100% na src/game/**); grep 'from phaser' src/game/ nic nevrací
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Pro tuto featuru se NEPÍŠOU game-design specs (vědomá odchylka od CLAUDE.md DoD) — pouze unit testy runneru a delivery
<!-- DOD:END -->
