---
id: TASK-57
title: Game design testy pro 5 sprite-based characteru
status: To Do
assignee: []
created_date: '2026-05-29 12:05'
updated_date: '2026-05-30 12:54'
labels:
  - testing
  - game-design
milestone: m-0
dependencies: []
references:
  - src/tests/game-design/README.md — guide pro psani game design testu
  - src/game/constants.ts — zdrojove konstanty pro aserce
priority: high
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Prehled

Nove game design testy pro kazdeho z 5 sprite-based characteru. Testy overuji difficulty intent, damage kalkulace a mask-based hit detection pro kazdy character zvlast.

## 5 characteru k testovani

| Character | manifestId | Animace | Specifika |
|---|---|---|---|
| Stone Giant | stone-giant | idle(loop) + attack | Rucne malovane masky s presnou zonaci (red/yellow/green) |
| Plague Rat | plague-rat | idle(loop) + attack | Auto-generated zelene masky (cely sprite = GRAZE) |
| Ice Giant | ice-giant | attack + throw | Zadna loop animace, default = attack. Dva utocne typy. |
| Crystal Spider | crystal-spider | attack + attack_mandible + bite | 3 utocne animace, zadna loop. Nejvic animaci. |
| Ember Wisp | ember-wisp | attack | Jedina animace. PixelLab object, ne character. |

## Struktura testu

Pro kazdeho character jeden soubor v `src/tests/game-design/`:
- `stoneGiantSprite.spec.ts`
- `plagueRatSprite.spec.ts`
- `iceGiantSprite.spec.ts`
- `crystalSpiderSprite.spec.ts`
- `emberWispSprite.spec.ts`

### Kazdy test pokryva

1. **Difficulty intent** — kolik zasahu (CRIT/HIT/GRAZE) je potreba k zabiti
2. **Mask-based hit detection** — overeni ze mask lookup vraci spravne zony pro dany character (spriteKey namespacing)
3. **Animace** — overeni ze AnimationController spravne cykli animace pro daneho chara (loop vs oneshot, default fallback)
4. **Power user** — optimalni hrac zabije chara v minimalnich zasazich
5. **Casual player** — prumerny hrac (vic GRAZE, min CRIT) zabije chara v rozumnem case

### Pravidla (z CLAUDE.md)

- Zero hardcoded numbers — vsechny hodnoty odvozene z constants.ts
- Test name = difficulty intent (napr. 'stone giant dies after 2 slow CRITs + 1 fast HIT')
- Testy musi prezit zmenu konstanty game designerem

```ts
// Derived helpers
const SLOW_CRIT = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const FAST_CRIT = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER
const FAST_GRAZE = FAST_SKILL_DAMAGE * GRAZE_DAMAGE_MULTIPLIER
```

## Co je OUT OF SCOPE

- Zmeny v game logice nebo renderovani
- Integracni testy (pokryto E2E)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 5 novych test souboru v src/tests/game-design/ — jeden per sprite character
- [ ] #2 Kazdy test pokryva: difficulty intent, mask hit detection, animace, power user, casual player
- [ ] #3 Zero hardcoded cisel v asercich — vse odvozeno z constants.ts
- [ ] #4 Testy preziji zmenu konstanty (napr. zmena maxHp nerozbi test, jen zmeni ocekavany pocet zasahu)
- [ ] #5 npm run test:design prochazi vsechny nove testy
- [ ] #6 Testy pouzivaji novy minimalni EnemyDef (manifestId, maxHp, critZoneScale)
<!-- AC:END -->
