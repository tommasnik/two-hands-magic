---
id: TASK-45
title: 'Upgrade tree UI — level-up screen a stun vizuál'
status: Done
assignee: []
created_date: '2026-05-22'
labels:
  - rendering
  - game-logic
dependencies:
  - TASK-41
  - TASK-42
  - TASK-43
  - TASK-44
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vizuální vrstva upgrade systému v `BattleScene.ts`:
1. Level-up screen (upgrade tree picker)
2. Stun ikona nad nepřítelem
3. XP progress indikátor v HUD

### Level-up screen

Triggr: `GameState.pendingLevelUp === true` → BattleScene překryje hru upgrade screeenem.

**Layout upgrade stromu:**
- Sloupce = 4 upgrade cesty: CAST TIME | CRIT DMG | PROJ SPEED | SPELL AREA
- QUICK CHAIN se zobrazí pod stromem jako cross-path node
- Každý node = obdélník s názvem a popisem
- Dependency šipky mezi tiery
- Dostupné (lze vybrat): bílý border, hover efekt
- Zamčené (závislost nesplněna): šedé, nedá se kliknout
- Již odemčené: zelené, nedá se znovu vybrat

**Interakce:**
- Kliknutí / tap na dostupný node → `GameStateMachine.confirmLevelUpUpgrade(nodeId)` → screen zmizí → hra pokračuje

### Stun ikona

Podmínka: `GameState.enemy.stunnedUntilMs > GameState.elapsedMs`

Zobrazit nad enemy sprite: ikona ⚡ nebo `[STUNNED]` text + odpočet v sekundách.
BattleScene v `update()` překreslí ikonu každý frame; při `stunnedUntilMs <= elapsedMs` ikona zmizí.

### XP progress v HUD

Přidat do HUD (vedle HP baru nebo pod ním):
- Text: `Lvl 2` + progress bar `[██░░░░]`
- Progress = `(playerXp - thresholdForCurrentLevel) / (thresholdForNextLevel - thresholdForCurrentLevel)`
- Na levelu 6 (max): zobrazit `Lvl MAX`

## Game Design testy

Tento task je převážně UI — game design testy ověřují herní tok, ne combat metriky.

Scénáře (`src/tests/game-design/upgradeFlow.spec.ts` nebo E2E Playwright):

- **Level-up blokace**: při `pendingLevelUp === true` enemy neútočí a nespawnuje; game loop tick neposune `elapsedMs`
- **Pick → pokračování bez prodlevy**: po výběru upgradu je `pendingLevelUp === false` v témže framu; hra navazuje okamžitě
- **XP bar accuracy**: po N killech odpovídá vizuální procento `(playerXp - thresholdCurrent) / (thresholdNext - thresholdCurrent)` — odvozeno od `XP_LEVEL_THRESHOLDS`
- **Stun timing**: po aplikaci stunu přes `__game` API → enemy sprite zobrazuje stun ikonu; po `critStunDurationMs` ikona zmizí
- Testy závislé na Phaser renderingu patří do E2E (`src/tests/e2e/`); testy herní logiky do game-design
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Po prvním enemy kill se zobrazí upgrade screen
- [x] #2 Dostupné nodes jsou klikatelné, zamčené nodes vizuálně odlišeny
- [x] #3 Výběr node zavře screen a hra pokračuje; stav reflektuje nový upgrade
- [x] #4 Stun ikona se zobrazí po CRIT hit s `crit_stun_1` a zmizí po uplynutí `critStunDurationMs`
- [x] #5 XP bar v HUD roste s každým killem
- [x] #6 E2E test: kill 1 enemy → `playerLevel === 2` a `pendingLevelUp === false` po potvrzení upgradu
- [x] #7 Game design / E2E testy pro upgrade flow procházejí
<!-- AC:END -->
