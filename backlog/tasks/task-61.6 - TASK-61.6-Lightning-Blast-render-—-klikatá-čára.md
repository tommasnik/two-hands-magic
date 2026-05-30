---
id: TASK-61.6
title: 'TASK-61.6: Lightning Blast render — klikatá čára'
status: Done
assignee: []
created_date: '2026-05-30 18:52'
updated_date: '2026-05-30 20:27'
labels:
  - skills
  - visuals
  - phaser
dependencies:
  - TASK-61.3
  - TASK-61.4
references:
  - src/scenes/BattleScene.ts
parent_task_id: TASK-61
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled
Vizuální vrstva pro Lightning Blast. Klikatá žlutá/bílá čára od bottom-center obrazovky k targetu. Generována Phaser Graphics API.

## UI

### Lightning line
- **Origin**: střed spodní části obrazovky (`canvas.width / 2, canvas.height - 20`)
- **Target**: `state.lightningDischargeTarget` (hit point na enemy)
- **Tvar**: přímka rozbitá na N segmentů (~6–8) s náhodným perpendikulárním offsetem (±20–40px)
- Náhodnost: generovat jednou při spawn (uložit segmenty do render state), ne každý frame (aby čára nekmitala)
- **Barva**: žlutá `0xFFFF00` inner + bílá `0xFFFFFF` thin outline
- **Šířka**: 3px main + 1px glow
- **Alpha**: 1.0 při spawnnutí, fade out na konci (posledních 100ms → alpha 0.0)

### Trvání
- Podmínka: `state.lightningDischargeUntilMs > elapsedMs`
- Po uplynutí: čára zmizí, `lightningDischargeTarget` se vynuluje

### Render priority
- Vykreslovat nad enemy sprite (ale pod UI)

## Co je OUT OF SCOPE
- Zvukové efekty
- Branching lightning (více větví)
- Hit particle efekty
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Kčikatá čára se objeví při lightning_blast releasu
- [x] #2 Čára jde z bottom-center k target bodu na nepříteli
- [x] #3 CRIT = 600ms, HIT = 300ms, GRAZE = 150ms vizualizace
- [x] #4 Fade-out na konci trvání
- [x] #5 Segmenty čáry se negenerují každý frame (statická klikatá čára)
- [x] #6 Otestováno manuálně v dev serveru
<!-- AC:END -->
