---
id: TASK-61.5
title: 'TASK-61.5: Ice Crystal render — diamantový shard + frozen overlay'
status: To Do
assignee: []
created_date: '2026-05-30 18:52'
labels:
  - skills
  - visuals
  - phaser
dependencies:
  - TASK-61.1
  - TASK-61.2
  - TASK-61.4
references:
  - src/scenes/BattleScene.ts
  - src/game/GameStateMachine.ts
parent_task_id: TASK-61
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled
Vizuální vrstva pro Ice Crystal v BattleScene (nebo render systému). Vše generováno přes Phaser Graphics API — žádné nové assety.

## UI

### Projektil — diamantový shard
- Tvar: rotovaný čtverec (kosočtverec / diamond) o velikosti ~16×16 px
- Barva: icy light blue (`0xAADDFF`)
- Rotace: natočen ve směru letu (tangens z velocity vektoru)
- Vykreslován přes Phaser Graphics jako filled polygon se 4 body
- Aktualizuje rotaci každý frame dle direction

### Frozen overlay — crystal přes nepřítele
- Podmínka: `state.enemyFrozenUntilMs > elapsedMs`
- Tvar: 6 špičatých hrotů radiálně kolem středu enemy sprite (jako hexagonal spike burst)
- Barva: `0x88CCFF` fill + `0xFFFFFF` stroke
- Alpha: 0.5
- Velikost: přibližně pokrývá displayWidth nepřítele
- Animace: lehké pulsování alpha (0.4–0.6) nebo jednoduše fixed
- Vykresluje se v BattleScene.update() pokud je frozen state aktivní
- Při odmrazení (frozenUntilMs <= elapsedMs) crystal overlay zmizí

## Co je OUT OF SCOPE
- Particle efekty při dopadu
- Zvukové efekty
- Hurt animace enemy při freeze
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Diamantový shard se vykresluje a letí k nepříteli (rotovaný ve směru letu)
- [ ] #2 Frozen overlay se zobrazí na nepříteli během freeze (50% alpha, modrá)
- [ ] #3 Overlay zmizí při odmrazení
- [ ] #4 Vykresleno přes Phaser Graphics (bez nových assetů)
- [ ] #5 Vizualizace otestována manuálně v dev serveru
<!-- AC:END -->
