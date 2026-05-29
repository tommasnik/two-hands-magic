---
id: TASK-47
title: UX flow — kill → toast → fight overview → next enemy
status: Done
assignee: []
created_date: '2026-05-27 11:23'
updated_date: '2026-05-27 13:36'
labels:
  - two-hands-magic
  - ux
  - phase-transitions
dependencies:
  - TASK-46
references:
  - src/scenes/BattleScene.ts
  - src/game/GameStateMachine.ts
  - src/types/index.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Přepsat UX flow po zabití enemyho. Aktuálně: kill → okamžitě level_complete overlay (1500ms auto-advance). Nový flow:

```
Kill enemy
  → poslední dmg floater je vidět (žádný okamžitý overlay)
  → toast "Victory!" (malý, přes canvas)
  → po 1s: přechod na phase 'fight_overview'
  → FightOverviewOverlay (blocking DOM overlay)
  → uživatel klikne "Next enemy" → nextLevel()
    nebo "Play again" (poslední level) → restartGame()
```

## Konkrétní změny

### Nová fáze v GameStateMachine
- Přidat `'fight_overview'` do `Phase` union typu
- `_applyHit()`: po kill → phase = `'fight_overview'` (ne `'level_complete'`)
- `GameStateMachine` uložit snapshot `fightStats` před resetem (overview ho potřebuje zobrazit)
- Přidat `completeFightOverview()` metodu → volá `nextLevel()` nebo `restartGame()`

### BattleScene — phase transition handling
- Odebrat auto-advance timer pro `level_complete`
- Přidat handling pro `fight_overview`: po 1s zobrazit `FightOverviewOverlay`
- Toast "Victory!" — jednoduchý DOM element nebo rozšíření stávajícího overlay systému

### Victory screen
- Odstranit nebo zjednodušit na pouhý toast — fight overview je nový konec každého levelu včetně posledního
- `phase = 'victory'` zůstane v kódu, ale chování = stejné jako `fight_overview`

## Edge case
Na posledním levelu tlačítko "Next enemy" → "Play again" (nebo "Restart"). Zjistit logiku z `LEVELS.length` vs `currentLevel`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Po kill enemy zůstane poslední dmg floater viditelný (overlay ho neprekryje okamžitě)
- [x] #2 Toast 'Victory!' se objeví na canvas/DOM
- [x] #3 Po 1s se spustí FightOverviewOverlay (blokující)
- [x] #4 Tlačítko Next enemy volá nextLevel() a přejde na další souboj
- [x] #5 Na posledním levelu tlačítko volá restartGame()
- [x] #6 Auto-advance 1500ms timer je odebrán
- [x] #7 Victory screen (starý overlay) je odebrán nebo nahrazen toustem
<!-- AC:END -->
