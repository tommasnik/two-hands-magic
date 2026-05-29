---
id: TASK-30
title: >-
  Zóny se nezobrazují při dopadu střely – damage čísla barevná, crit s
  vykřičníkem
status: Done
assignee: []
created_date: '2026-05-13 15:30'
updated_date: '2026-05-13 16:16'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Popis změny
Původní zadání (zóny blikají při hitu) se mění. Zóny zůstávají vždy skryté. Místo toho:
- Barva floating damage čísla indikuje typ hitu
- Crit hit má za číslem vykřičník

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Zóny (zelená / žlutá / červená) se nikdy nezobrazují – ani při dopadu
- [x] #2 #2 Floating damage číslo má barvu odpovídající zóně (zelená / žlutá / červená nebo ekvivalent)
- [x] #3 #3 Crit hit zobrazí číslo s '!' na konci (např. '42!')
- [x] #4 #4 Task-22 (flash zón) odstraněn nebo refaktorován – flash logika smazána ze scény
- [x] #5 #5 Unit test: getHitResult vrací správný typ, renderer dostane správnou barvu
- [x] #6 #6 E2E test: po hitu není žádná viditelná změna zón, damage číslo má správnou barvu
<!-- SECTION:DESCRIPTION:END -->
<!-- AC:END -->
