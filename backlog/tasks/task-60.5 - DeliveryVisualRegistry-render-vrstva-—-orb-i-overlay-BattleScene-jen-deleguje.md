---
id: TASK-60.5
title: >-
  DeliveryVisualRegistry + render vrstva — orb i overlay, BattleScene jen
  deleguje
status: To Do
assignee: []
created_date: '2026-05-30 12:42'
labels: []
dependencies:
  - TASK-60.4
documentation:
  - EnemyAttacks.md
parent_task_id: TASK-60
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zapouzdřená render vrstva pro delivery vizuály (Phaser-side), aby v BattleScene nebyla žádná render logika per vizuál. Kontrakt viz EnemyAttacks.md §5.

Závislost na TASK-60.4: GameStateMachine vystavuje aktivní deliveries (getActive) s visualKey + kind + pozice/progress.

- `DeliveryVisual` rozhraní: spawn/update/onConnect/destroy.
- `DeliveryVisualRegistry`: visualKey → instance DeliveryVisual.
- Implementace (`src/scenes/rendering/visuals/` nebo obdobně): minimálně procedurální OrbVisual (letící orb — nahradí dnešní inline missile rendering) a procedurální TeethVisual/overlay (zuby se objeví u hráče a klapnou na onConnect, GameBoy styl). Rozhraní musí umožnit i spritesheet implementaci (preset) bez zásahu do scény.
- BattleScene: v render kroku iteruje deliveries a deleguje na registry. Žádný case/kreslení per vizuál ve scéně. Odstranit dosavadní inline rendering enemy missiles.
- Připojit onConnect efekt (klapnutí/dopad) k connect okamžiku z game state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 DeliveryVisual rozhraní (spawn/update/onConnect/destroy) a DeliveryVisualRegistry (visualKey → instance) existují mimo BattleScene
- [ ] #2 Procedurální OrbVisual vykresluje letící orb (nahrazuje dosavadní inline missile rendering)
- [ ] #3 Procedurální overlay vizuál (zuby/drápy) se objeví u hráče a 'klapne' na onConnect
- [ ] #4 Rozhraní prokazatelně umožňuje i spritesheet implementaci vizuálu bez úprav BattleScene (alespoň stub/ukázka nebo dokumentovaný postup)
- [ ] #5 BattleScene jen iteruje deliveries a deleguje na registry — žádný case/kresba per vizuál ve scéně; starý inline missile rendering odstraněn
- [ ] #6 Přidání nového vizuálu = jeden soubor + registrace, nula změn v BattleScene (ověřeno strukturou)
- [ ] #7 npm run build prochází; vizuální smoke přes Playwright/dev server: orb i overlay se vykreslí bez console chyb
<!-- AC:END -->
