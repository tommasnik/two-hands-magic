---
id: TASK-53
title: MaskHitDetector refaktor — spriteKey namespacing
status: Done
assignee:
  - '@agent'
created_date: '2026-05-29 12:03'
updated_date: '2026-05-29 12:24'
labels:
  - game-logic
  - refactor
milestone: m-0
dependencies:
  - TASK-52
references:
  - src/game/systems/MaskHitDetector.ts — aktualni implementace
  - src/scenes/BattleScene.ts _initMaskDetector() — inicializace masek
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Prehled

Upravit MaskHitDetector aby podporoval masky vice characteru soucasne. Aktualne klicuje masky jako `animKey:frameIndex` (napr. `idle:3`), coz koliduje kdyz je nahrano 5 characteru.

## Aktualni stav

`src/game/systems/MaskHitDetector.ts` (~100 radku):
- `_masks` = `Map<string, {data, width, height}>` kde klic je `"animKey:frameIndex"`
- `loadMaskData(animKey, frameIndex, data, width, height)` — uklada masku
- `getZone(animKey, frameIndex, frameX, frameY)` — vraci HitZoneName
- `hasMask(animKey, frameIndex)` — kontrola existence

## Zmeny

### Novy format klice: `spriteKey:animKey:frameIndex`

```ts
// Pred:
loadMaskData('idle', 3, data, 128, 128)
getZone('idle', 3, x, y)

// Po:
loadMaskData('stone_giant', 'idle', 3, data, 128, 128)
getZone('stone_giant', 'idle', 3, x, y)
```

### Nove API

```ts
class MaskHitDetector {
  loadMaskData(spriteKey: string, animKey: string, frameIndex: number, data: Uint8Array, width: number, height: number): void
  getZone(spriteKey: string, animKey: string, frameIndex: number, frameX: number, frameY: number): HitZoneName
  hasMask(spriteKey: string, animKey: string, frameIndex: number): boolean
}
```

### Inicializace v BattleScene

Aktualne `_initMaskDetector()` extrahuje RGBA data jen pro stone-giant masky. Upravit aby iteroval pres CharacterRegistry a nactene Phaser textury vsech characteru s maskami, a volal `loadMaskData(spriteKey, animKey, frameIndex, ...)` pro kazdy mask frame.

## Co je OUT OF SCOPE

- Zmeny v Enemy._resolveZoneFromMask() (task 4)
- Odstraneni fallback hit detection (task 4)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 MaskHitDetector.loadMaskData/getZone/hasMask prijimaji spriteKey jako prvni parametr
- [x] #2 Interni klic je 'spriteKey:animKey:frameIndex'
- [x] #3 BattleScene._initMaskDetector() genericky nacita masky vsech characteru z CharacterRegistry
- [x] #4 Existujici unit testy v src/tests/unit/maskHitDetector.test.ts aktualizovany na nove API
- [x] #5 Zadny hardcoded character-specific kod v _initMaskDetector()
- [x] #6 Barvy zon zustavaji stejne: red=head/CRIT, yellow=torso/HIT, green=leftLeg/GRAZE, transparent=none/MISS
<!-- AC:END -->
