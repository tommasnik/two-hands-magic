---
id: TASK-26
title: 'Bug: pouze jeden touchpoint střílí najednou – povolit max 2 současně'
status: Done
assignee: []
created_date: '2026-05-13 15:29'
updated_date: '2026-05-13 15:50'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Popis problému
Aktuálně lze střílet pouze jedním touchpointem najednou. Hra by měla umožnit max 2 současné touche (jeden na každé ruce).

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Druhý prst spustí druhou střelu nezávisle na první (souběžně)
- [x] #2 #2 Třetí prst se ignoruje – max 2 aktivní touche najednou
- [x] #3 #3 Každý ze dvou touchpointů udržuje vlastní stav laseru (aiming, firing)
- [x] #4 #4 Unit test: dva simultánní InputEventy vyrobí dvě projectile
- [x] #5 #5 E2E test: dva touche s různými pointerId generují dvě animace střel
<!-- SECTION:DESCRIPTION:END -->
<!-- AC:END -->
