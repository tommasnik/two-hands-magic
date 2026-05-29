---
id: TASK-4
title: Touch point definitions & input abstraction
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:19'
updated_date: '2026-05-13 12:08'
labels:
  - game-logic
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Definovat 6 touch pointů (3 vlevo dole, 3 vpravo dole) jako datové struktury a vytvořit InputManager, který převádí raw InputEventy na herní příkazy. Stejná mechanika jako laser-shot: každý touch point má barvu a různou rychlost rotace laserového paprsku.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TOUCH_POINTS: pole 6 TouchPoint objektů definovaných v src/game/constants.ts nebo src/game/entities/touchPoints.ts
- [ ] #2 Barvy a rotační periody přesně odpovídají laser-shot referenci (zelená/fialová/oranžová vlevo; modrá/červená/žlutá vpravo)
- [ ] #3 InputManager třída: přijímá InputEvent[], vrací pole herních příkazů (AimCommand, FireCommand)
- [ ] #4 InputManager.update(events) je čistá funkce – stejný vstup = stejný výstup
- [ ] #5 Unit testy: press down aktivuje touch point, drag produkuje AimCommand, release produkuje FireCommand
- [ ] #6 Unit testy: simultánní touch na více pointů najednou funguje správně (6 prstů)
- [ ] #7 Žádné Phaser importy v src/game/
<!-- AC:END -->
