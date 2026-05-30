---
id: TASK-61.5
title: 'TASK-61.5: Ice Crystal render — diamantový shard + frozen overlay'
status: Done
assignee: []
created_date: '2026-05-30 18:52'
updated_date: '2026-05-30 19:51'
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
- [x] #1 Diamantový shard se vykresluje a letí k nepříteli (rotovaný ve směru letu)
- [x] #2 Frozen overlay se zobrazí na nepříteli během freeze (50% alpha, modrá)
- [x] #3 Overlay zmizí při odmrazení
- [x] #4 Vykresleno přes Phaser Graphics (bez nových assetů)
- [ ] #5 Vizualizace otestována manuálně v dev serveru
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Vytvoření src/scenes/rendering/SkillRenderer.ts — veškerá skill grafika v samostatném souboru.

**Ice Crystal projektil** (#1, #4): rotovaný kosočtverec (diamond shard) 16px, barva #aaddff, natočen ve směru letu, ice trail za ním. Implementace v SkillRenderer.drawProjectile().

**Frozen overlay** (#2, #3, #4): 6-hrotová hvězda (star burst) přes enemy, fill #88CCFF / stroke #FFFFFF, alpha 0.5. Zobrazí se dokud enemyFrozenUntilMs > elapsedMs, zmizí při odmrazení. Implementace v SkillRenderer.drawFrozenOverlay().

**Přesun fire particles z BattleScene** do SkillRenderer (update + drawFireParticles).

**Oprava ProjectileSystem.speedForSkill()**: přidány chybějící case pro ice_crystal a lightning_blast (způsobovaly TS chybu — missing return path).

BattleScene deleguje na `this._skillRenderer` — žádná skill-specifická kresba v BattleScene.
<!-- SECTION:FINAL_SUMMARY:END -->
