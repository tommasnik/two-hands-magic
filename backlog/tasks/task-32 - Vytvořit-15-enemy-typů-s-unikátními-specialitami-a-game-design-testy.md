---
id: TASK-32
title: Vytvořit 15 enemy typů s unikátními specialitami a game design testy
status: Done
assignee: []
created_date: '2026-05-13 15:48'
updated_date: '2026-05-13 20:35'
labels: []
dependencies: []
priority: high
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Každý enemy má vlastní soubor src/tests/game-design/<enemy_name>.spec.ts (ne level_X.spec.ts)
- [x] #2 Enemy: Ember Wisp — malinký, velmi malá hit zone, test ověří že casual player potřebuje výrazně více hitů než na standardního enemye
- [x] #3 Enemy: Iron Golem — obrovský, velká hit zone, ale extra vysoké HP; test ověří poměr HP vs hit zone size
- [x] #4 Enemy: Crystal Spider — malý s velkým crit fieldem; test ověří že i casual player snadno crittuje, ale potřebuje víc hitů kvůli nízkému HP
- [x] #5 Enemy: Shadow Dancer — pohybuje se ze strany na stranu; test ověří že power user trefí víc critů díky předvídání pohybu
- [x] #6 Enemy: Plague Rat — extrémně malý a rychle se pohybující; test ověří že damage není high ale obtížnost tkví v přesnosti
- [x] #7 Enemy: Black Hole — 3 malí enemies najednou (každý s malým HP); test ověří multi-target pattern
- [x] #8 Enemy: Stone Drake — pomalu se přibližuje (urgency); test ověří že power user ho zabije dřív než dosáhne blízkosti
- [x] #9 Enemy: Thornback — cikcak pohyb; test ověří že casual player má nižší hit rate než na statickém enemy
- [x] #10 Enemy: Ancient Treant — enormní velikost, enormní HP; test ověří že je potřeba sustained DPS (mnoho hitů)
- [x] #11 Enemy: Frost Elemental — lehce větší než medium, ale slabší na slow skills; test ověří damage multiplier na slow skill
- [x] #12 Enemy: Lava Slug — pomalý pohyb doleva/doprava, vysoké HP; test ověří poměr čas vs damage
- [x] #13 Enemy: Thunder Hawk — střední velikost, rychlý diagonální pohyb; test ověří že window na hit je kratší
- [x] #14 Enemy: Mirror Knight — střední, ale na určité zóně reflektuje (nižší damage); test ověří že power user hází do správné zóny
- [x] #15 Enemy: Void Wraith — velký ale průhledný (malý crit window); test ověří načasování critu
- [x] #16 Enemy: Titan Lord — boss-type, obrovský, kombinuje pohyb + vysoké HP; test ověří celý encounter jako victory condition
- [x] #17 Každý spec soubor je pojmenovaný podle jména enemye, NIKOLIV podle pořadí levelu — testy jsou nezávislé na řazení
- [x] #18 EnemyDef pro každého enemye je přidán do constants.ts s plnými parametry (name, maxHp, size, movementPattern, hitZone, critZone)
- [x] #19 Testy nevyužívají hardcoded čísla — vše odvozeno z constants.ts (EnemyDef a damage konstanty)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Všechny AC jsou zaškrtnuty
- [x] #2 npm run test:design prochází (všech 15 enemy spec souborů)
- [x] #3 npm run test prochází
- [x] #4 Žádný spec soubor se nejmenuje level_X.spec.ts — pouze <enemy_name>.spec.ts
<!-- DOD:END -->
