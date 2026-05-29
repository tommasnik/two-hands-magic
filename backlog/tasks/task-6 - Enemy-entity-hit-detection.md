---
id: TASK-6
title: Enemy entity & hit detection
status: Done
assignee:
  - '@agent'
created_date: '2026-05-13 11:19'
updated_date: '2026-05-13 12:14'
labels:
  - game-logic
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementovat nepřítele s 6 body part hitboxy (hlava, trup, 2 paže, 2 nohy) a hit scoring stejný jako laser-shot: CRIT (hlava), HIT (trup), GRAZE (končetiny), MISS. Rozměry v cm (device-independent) dle laser-shot konstant.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Enemy třída s metodou getHitResult(point: {x, y}): HitResult
- [ ] #2 6 hitzonů: head (CRIT), torso (HIT), leftArm/rightArm (GRAZE), leftLeg/rightLeg (GRAZE)
- [ ] #3 Rozměry odpovídají laser-shot referenci (hlava 1.1cm, trup 2.6×3.6cm, končetiny 0.45cm radius)
- [ ] #4 Kolizní geometrie: circle pro hlavu a končetiny, capsule/rect pro trup
- [ ] #5 Unit testy: přesný zásah každé z 6 zón vrátí správný HitResult
- [ ] #6 Unit testy: zásah mimo všechny zóny vrátí MISS
- [ ] #7 Unit testy: hraniční body (edge cases) každé hitzone
<!-- AC:END -->
