---
id: TASK-28
title: Fullscreen při startu hry
status: Done
assignee: []
created_date: '2026-05-13 15:29'
updated_date: '2026-05-13 16:08'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Popis
Po kliknutí na Start se hra přepne do fullscreenu.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Klik/tap na Start button vyvolá requestFullscreen()
- [x] #2 #2 Phaser canvas se přizpůsobí rozměrům fullscreen viewportu
- [x] #3 #3 Fallback: pokud prohlížeč fullscreen odmítne, hra běží normálně bez chyby
- [x] #4 #4 E2E test: po startu je document.fullscreenElement truthy
<!-- SECTION:DESCRIPTION:END -->
<!-- AC:END -->
