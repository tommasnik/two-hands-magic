---
id: TASK-15
title: Full visual rendering pass — match laser-shot look
status: Done
assignee: []
created_date: '2026-05-13 13:21'
updated_date: '2026-05-13 13:39'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Complete BattleScene rendering to match laser-shot visuals. Must run AFTER TASK-14 (touch points have arc positions). Changes: 1) index.html: add #cmRef div, 4-column HUD overlay (#hud-crit/hit/graze/miss with CSS matching laser-shot), splash screen overlay with title/instructions/START button. CSS: same as laser-shot (Courier New, glow text-shadow, grid layout, overlay). 2) main.ts: change type to Phaser.CANVAS. 3) BattleScene.ts complete rewrite: remove Graphics/Text objects; hook into Phaser Scenes.Events.RENDER event and get canvas 2D context via (this.game.renderer as Phaser.Renderer.Canvas.CanvasRenderer).context; maintain visual-only state (sparks[], floatTexts[], flashUntil, partFlash map); draw: background gradient+grid, enemy with head/torso/capsule arms+legs using colors CRIT=#ff2255 HIT=#ffcc00 GRAZE=#66ff88, shadowBlur glow effects, flash on hit; projectile with glow+trail+white core; touch points with pulsing ring+translucent fill+center dot; laser beam with outer glow+white core+finger glow; reticle with pulsing ring+crosshair+dot; sparks (30/18/12/14 by hit type) + floating text labels; wire GameState lastHit→spawn effects; wire score→HUD DOM updates; wire start button→gameMachine.startBattle().
<!-- SECTION:DESCRIPTION:END -->
