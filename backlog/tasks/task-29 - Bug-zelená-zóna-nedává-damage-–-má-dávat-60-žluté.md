---
id: TASK-29
title: 'Bug: zelená zóna nedává damage – má dávat 60 % žluté'
status: Done
assignee: []
created_date: '2026-05-13 15:29'
updated_date: '2026-05-13 15:54'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Popis problému
Střela dopadající do zelené zóny nedělá žádný damage. Má dávat 60 % damage oproti žluté zóně (GRAZE hit).

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Zásah do zelené zóny odečte HP = baseDamage * 0.6
- [x] #2 #2 Konstanta v constants.ts (GREEN_ZONE_DAMAGE_MULTIPLIER = 0.6)
- [x] #3 #3 Unit test: green zone hit → správná hodnota HP odečtena
- [x] #4 #4 Game design test: level encounter se zelenou zónou aktualizován
<!-- SECTION:DESCRIPTION:END -->
<!-- AC:END -->
