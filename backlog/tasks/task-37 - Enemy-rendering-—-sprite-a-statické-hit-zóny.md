---
id: TASK-37
title: Enemy rendering — sprite a statické hit zóny
status: Done
assignee: []
created_date: '2026-05-14 13:13'
updated_date: '2026-05-14 14:04'
labels:
  - rendering
dependencies: []
priority: medium
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Každý enemy má v EnemyDef odkaz na svůj sprite (klíč/textura)
- [x] #2 EnemyDef obsahuje statickou mapu hit zón: crit (hlava), mid (tělo), low (nohy) jako relativní bounding rect (0–1 space)
- [x] #3 BattleScene renderuje správný sprite dle EnemyDef.spriteKey
- [x] #4 Hit zone overlay se renderuje na základě EnemyDef.hitZoneMap — testovatelné přes window.__game
- [x] #5 Architektura hitZoneMap je rozšiřitelná na dynamické zóny (štít, pohybující se bloky) v budoucnu — pole zón s volitelným 'active' flagem, nyní vždy true
- [x] #6 Pokud sprite pro daný enemy chybí, použije se placeholder (žádný crash)
- [x] #7 Hit zone mapa je korektně škálovaná na aktuální rozměry enemye na obrazovce
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Všechny AC jsou zaškrtnuty
- [x] #2 Unit test: hitZoneMap správně mapuje relativní coords na absolutní screen coords pro různé velikosti enemye
- [x] #3 npm run test + npm run test:coverage prochází
- [x] #4 E2E test ověří že canvas renderuje sprite (screenshot diff nebo existence canvas elementu bez JS erroru)
<!-- DOD:END -->
