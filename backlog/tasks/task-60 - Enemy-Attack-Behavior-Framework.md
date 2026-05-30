---
id: TASK-60
title: Enemy Attack & Behavior Framework
status: Done
assignee: []
created_date: '2026-05-30 12:40'
updated_date: '2026-05-30 18:09'
labels: []
dependencies: []
documentation:
  - EnemyAttacks.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Každý nepřítel má útočit na hráče přes deklarativní graf stavů (enemy = konfigurace, ne kód). Jeden mechanismus řídí animace, útoky i jejich sekvence/větvení. Nahrazuje dnešní bezstavový weighted-picker (`EnemyAttackSystem` + `EnemyDef.attacks[]`), který neumí per-útok animaci, sekvence, větvení, podmíněné přechody, melee ani načasování zásahu na frame.

Závazná architektura: `EnemyAttacks.md` (v rootu repa, prolinkováno z CLAUDE.md). Tento parent zastřešuje 6 subtasků (typy → delivery → runner → integrace → render → konfigurace 11 nepřátel).

Klíčová rozhodnutí (detail v doku):
- State-graph runner (`EnemyBehaviorRunner`, pure TS): uzel = animace + volitelný útok; hrana = váha + volitelný guard; hybrid exit triggery (animationComplete / afterMs / condition).
- Sjednocený delivery model: útok na release framu sprite-animace vyšle delivery (orb / overlay), damage padne na „connect". Melee = overlay efekt u hráče (GameBoy „zuby klapnou"), nezávislý na sprite animaci.
- Render vrstva přes `DeliveryVisualRegistry` (visualKey → DeliveryVisual), mimo BattleScene, podporuje procedurální i spritesheet vizuál.
- Stun zmrazí celý graf. Chybějící idle (crystal-spider, ice-giant) → holdFrame fallback.
- Grafy v `src/game/enemyGraphs.ts`, čísla v `constants.ts` (zero hardcoded).

MIMO SCOPE (vědomě): status efekty / curse (jen hook `kind:'effect'`, bez implementace), game-design specs (jen unit testy — odchylka od DoD v CLAUDE.md), dogenerování idle animací.
<!-- SECTION:DESCRIPTION:END -->
