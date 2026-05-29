---
id: TASK-14
title: Touch point arc layout + mechanics alignment
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
Replace zone-based touch point mapping with arc-based layout matching laser-shot. Tasks: 1) Add TOUCHPOINT_ARC_CM/EDGE_X_CM/EDGE_Y_CM/RADIUS to constants.ts. 2) Add computeTouchPointPositions(W,H,pxCm) to touchPoints.ts. 3) Rewrite InputManager to accept positions and use distance-based nearest-point mapping (remove zone thirds). 4) GameStateMachine: compute positions from constants, pass to InputManager, use actual touch point positions (not corners) as projectile origin. 5) Update inputManager.test.ts with new positions near arc points (PIXELS_PER_CM=56: green@(191,733), violet@(150,677), orange@(86,646), blue@(199,733), red@(240,677), yellow@(304,646)). 6) Update gameStateMachine.test.ts: replace GAME_HEIGHT*0.9/0.5/0.1 zone positions with positions near the actual arc touch points. 7) Fix InputManager magic number 844→GAME_HEIGHT (already done by switch to distance-based). Keep AimSystem clamping unchanged.
<!-- SECTION:DESCRIPTION:END -->
