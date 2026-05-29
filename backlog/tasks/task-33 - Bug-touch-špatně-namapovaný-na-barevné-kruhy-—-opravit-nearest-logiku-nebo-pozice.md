---
id: TASK-33
title: >-
  Bug: touch špatně namapovaný na barevné kruhy — opravit nearest logiku nebo
  pozice
status: Done
assignee: []
created_date: '2026-05-13 18:22'
updated_date: '2026-05-13 18:52'
labels: []
dependencies: []
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Kliknutí na konkrétní barevný kruh vždy aktivuje právě ten kruh, ne jiný
- [x] #2 Nearest logika hledá touchpoint podle stejných souřadnic jako jsou renderované kruhy
- [x] #3 Pozice touch zón v InputManager/BattleScene odpovídají pixelové pozici vizuálních kruhů
- [x] #4 E2E test: inject touch na střed kruhu → aktivuje správný kruh (ne sousední)
<!-- AC:END -->
