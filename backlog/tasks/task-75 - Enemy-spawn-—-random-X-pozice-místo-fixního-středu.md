---
id: TASK-75
title: Enemy spawn — random X pozice místo fixního středu
status: To Do
assignee: []
created_date: '2026-05-31 14:37'
labels:
  - gameplay
  - enemy
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled
Každý nepřítel se při startu kola zobrazí na náhodné X pozici, ne vždy ve středu obrazovky. Tím se každé kolo vizuálně liší a hráč nemůže slepě mířit na střed.

## Pravidla pro X pozici
- Pozice se volí náhodně v bezpečném rozsahu: `[halfDisplayWidth + margin, screenWidth - halfDisplayWidth - margin]`
- `margin` je konstanta v `constants.ts` (navrhovaná hodnota: 16 px)
- `displayWidth` se bere z manifestu příslušného nepřítele (přes `CharacterRegistry`)
- Výsledek musí být integer (nebo zaokrouhlený float)

## Pohyb závislý na spawn pozici
Nepřátelé s pohybem (nyní pouze `insect-swarm`, pattern `lr_oscillate`) musí používat spawn X jako střed oscilace, ne hardcoded střed obrazovky. Amplituda oscilace se přizpůsobí tak, aby nepřítel nepřekročil okraje obrazovky (clamp na stejný bezpečný rozsah).

## Rozsah změn
- `constants.ts` — nová konstanta `ENEMY_SPAWN_X_MARGIN`
- `src/game/` — logika výpočtu spawn X (pure TS, bez Phaser), uložená do `GameState`
- `GameStateMachine._loadLevel` nebo ekvivalent — použije novou X při inicializaci enemy pozice
- `EnemyBehaviorRunner` nebo pohybový systém — `lr_oscillate` počítá střed od spawn X, ne od středu obrazovky
- Pohybové systémy nesmí předpokládat X = střed obrazovky

## Co je OUT OF SCOPE
- Y pozice (enemy zůstává na stávající Y)
- Více nepřátel najednou
- Animace příletu/spawn efekt
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Každé kolo se enemy zobrazí na jiné X (náhodné, ne vždy střed) — viditelné v gameplay
- [ ] #2 Enemy je vždy celý na obrazovce (žádný ořez u okrajů) pro všechny enemy s různými displayWidth
- [ ] #3 insect-swarm osciluje kolem své spawn X, ne kolem středu obrazovky; amplituda se clampe tak, aby nepřekročil okraje
- [ ] #4 Nová konstanta ENEMY_SPAWN_X_MARGIN je v constants.ts s JSDoc (unit: px, what it affects)
- [ ] #5 Výpočet spawn X je v src/game/ (pure TS, žádný Phaser import)
- [ ] #6 Unit testy pokrývají: spawn X je v bezpečném rozsahu, lr_oscillate respektuje spawn X jako střed
- [ ] #7 npm run test a npm run build projdou bez chyb
<!-- AC:END -->
