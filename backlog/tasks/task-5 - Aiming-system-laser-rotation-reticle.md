---
id: TASK-5
title: Aiming system (laser rotation & reticle)
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:19'
updated_date: '2026-05-13 12:10'
labels:
  - game-logic
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementovat mířící mechaniku identickou s laser-shot: laser sweepuje svisle nahoru rytmem daným rotationPeriodMs touch pointu, horizontální drag koriguje aim s násobičem AIM_GAIN. Výstup je pozice reticlu v herních souřadnicích.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AimSystem.computeReticle(touchPoint, dragOffsetX, elapsedMs): vrací {x, y} v game-world souřadnicích
- [ ] #2 Vertikální sweep: pozice = sin/linear funkce elapsedMs % rotationPeriodMs (zkontrolovat laser-shot logiku)
- [ ] #3 Horizontální korekce: dragOffsetX * AIM_GAIN, clampováno na šířku hracího pole
- [ ] #4 Unit testy: sweep timing – po N ms je reticle na správné Y pozici
- [ ] #5 Unit testy: drag gain – drag 10px horizontálně posouvá reticle o 10*AIM_GAIN px
- [ ] #6 Unit testy: boundary clamping – reticle nepřekročí okraje hracího pole
- [ ] #7 Unit testy: různé rotationPeriodMs produkují různé sweep rychlosti
<!-- AC:END -->
