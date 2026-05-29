---
id: TASK-11
title: Battle scene — Phaser rendering
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:20'
updated_date: '2026-05-13 12:36'
labels:
  - rendering
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementovat BattleScene jako thin rendering bridge. Scéna čte stav z GameStateMachine a renderuje ho. Žádná herní logika ve scéně. Zachovává vizuální styl z laser-shot (dark background, colored laser beams, floating hit texts).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 BattleScene volá gameMachine.update(delta, inputs) každý frame v update()
- [ ] #2 InputBridge: Phaser touch/mouse eventy → InputEvent[] → předány do update()
- [ ] #3 Renderuje: 6 touch pointů v dolních rozích, laser beam od touch pointu k reticlu, enemy (placeholder geometrie), aktivní projektily, score HUD
- [ ] #4 Žádná herní logika (podmínky, výpočty skóre) přímo ve scéně – vše přes GameStateMachine
- [ ] #5 60 FPS target, delta capped na MAX_DELTA_MS (z constants.ts)
- [ ] #6 window.__game.getState() je po renderování konzistentní se zobrazením
- [ ] #7 Playwright screenshot test: hra renderuje bez chyb, canvas je viditelný
<!-- AC:END -->
