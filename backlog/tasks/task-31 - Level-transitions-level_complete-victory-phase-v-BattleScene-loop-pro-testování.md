---
id: TASK-31
title: >-
  Level transitions: level_complete + victory phase v BattleScene, loop pro
  testování
status: Done
assignee: []
created_date: '2026-05-13 15:32'
updated_date: '2026-05-13 15:45'
labels: []
dependencies: []
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 BattleScene detekuje phase='level_complete' a po 1.5s pauze zobrazí 'Level X Complete!' a zavolá game.nextLevel()
- [x] #2 BattleScene detekuje phase='victory' a zobrazí 'Victory!' a po 2s restartuje od levelu 1 pro testování
- [x] #3 Renderování HUD zobrazuje aktuální číslo levelu a jméno nepřítele
- [x] #4 Po přechodu na nový level se HP bar a jméno nepřítele správně aktualizují
- [x] #5 Všechny 3 levely jsou hratelné za sebou: Goblin Scout → Orc Warrior → Stone Troll
- [x] #6 Unit testy pro GameStateMachine level transitions stále procházejí
- [x] #7 E2E test ověří, že po zabití goblina hra nepřestane reagovat a zobrazí nového nepřítele
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Všechny AC jsou zaškrtnuty [x]
- [x] #2 `npm run test` prochází
- [x] #3 `npm run test:coverage` — 100 % coverage na `src/game/**`
- [x] #4 `npm run test:e2e` prochází
- [x] #5 Game design test pro level transitions: ověří, že každý ze 3 nepřátel má správnou obtížnost (kolik hitů ho zabije) — **žádná hardcoded čísla**, vše odvozeno z `constants.ts`
- [x] #6 Game design test přežije změnu damage konstanty (design intent, ne math check)
- [x] #7 Žádné Phaser importy v `src/game/`: `grep -r "from 'phaser'" src/game/` vrátí prázdno
- [x] #8 Git commit vytvořen
<!-- DOD:END -->
