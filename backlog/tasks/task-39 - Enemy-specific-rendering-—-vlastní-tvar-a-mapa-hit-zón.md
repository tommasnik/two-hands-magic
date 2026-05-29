---
id: TASK-39
title: Enemy-specific rendering — vlastní tvar a mapa hit zón
status: Done
assignee: []
created_date: '2026-05-15 08:28'
updated_date: '2026-05-15 08:49'
labels:
  - rendering
  - enemy
  - game-design
dependencies:
  - TASK-32
  - TASK-37
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Každý enemy typ má vlastní vizuální podobu a vlastní rozvržení crit/yellow/green hit zón. Aktuálně sdílí všichni enemyové stejný generický shape a jednotnou mapu zón.

## Cíl
- Každý `EnemyDef` definuje svůj vlastní tvar (sprite nebo procedurálně kreslený shape)
- Každý enemy má unikátní mapu hit zón (poloha, velikost, tvar crit/yellow/green oblastí)
- Rendering hit zón se generuje z dat v `EnemyDef`, ne z hardcoded geometrie

## Technický rozsah
- Rozšířit `EnemyDef` o `shape` descriptor (typ tvaru + parametry) a `hitZoneLayout` (pozice + poloměry pro crit/yellow/green)
- Upravit enemy renderer (TASK-37 základ) aby používal shape a hitZoneLayout z def
- Aktualizovat existujících 15 enemy typů (TASK-32) o individuální layouts
- Hit detection v `Enemy.ts` číst geometrii z def místo fixed konstant
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Každý ze 15 enemy typů má unikátní shape descriptor v EnemyDef
- [x] #2 Každý enemy má vlastní hitZoneLayout (crit/yellow/green) lišící se pozicí nebo velikostí
- [x] #3 Enemy renderer kreslí tvar a zóny výhradně z dat v EnemyDef — žádná hardcoded geometrie per-enemy
- [x] #4 Hit detection používá hitZoneLayout z def, výsledky odpovídají vizuálnímu zobrazení
- [x] #5 Game design testy pro existující encountery (level 1–3) projdou bez změny
<!-- AC:END -->
