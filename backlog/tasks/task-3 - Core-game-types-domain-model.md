---
id: TASK-3
title: Core game types & domain model
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:19'
updated_date: '2026-05-13 12:06'
labels:
  - game-logic
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Definovat sdílené TypeScript typy pro celou herní doménu. Typy jsou kontraktem mezi game logikou a renderingem – žádné Phaser typy sem nepatří. Všechny ostatní game-logic tasky na toto závisí.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 src/types/index.ts exportuje: GameState, TouchPoint, TouchPointId, InputEvent, Projectile, Enemy, HitZone, HitResult (CRIT|HIT|GRAZE|MISS), Score, SkillType
- [ ] #2 Žádné importy z Phaser v src/types/
- [ ] #3 Každý typ má JSDoc popis
- [ ] #4 TouchPoint obsahuje: id, color, rotationPeriodMs, cornerAnchor (LEFT|RIGHT), position index
- [ ] #5 InputEvent obsahuje: pointerId, action ('down'|'move'|'up'), x, y, timestamp
- [ ] #6 GameState je snapshot stavu – serializovatelný do JSON (no class instances, no functions)
<!-- AC:END -->
