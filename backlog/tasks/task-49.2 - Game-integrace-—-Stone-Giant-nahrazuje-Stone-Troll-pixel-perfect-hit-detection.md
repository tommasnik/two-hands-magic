---
id: TASK-49.2
title: >-
  Game integrace — Stone Giant nahrazuje Stone Troll, pixel-perfect hit
  detection
status: Done
assignee: []
created_date: '2026-05-29 07:29'
updated_date: '2026-05-29 08:20'
labels:
  - two-hands-magic
  - stone-giant
  - hit-detection
  - enemy
dependencies:
  - TASK-49.1
parent_task_id: TASK-49
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Integruj Stone Giant sprite do two-hands-magic (`sites/two-hands-magic/`). Stone Giant nahrazuje stávajícího Stone Troll nepřítele. Hit detection systém se kompletně přepíše z geometrických tvarů (kruhy, obdélníky) na pixel-perfect lookup do PNG masek.

## Závislost

Vyžaduje dokončený TASK-49.1 — zone editor musí být hotový a PNG masky pro všech 17 framů exportovány a uloženy do `sites/two-hands-magic/src/assets/stone-giant/masks/`.

## Co je Stone Giant

PixelLab AI sprite, 128×128px, 8 směrů. Animace:
- **idle**: 10 framů (Throw Heavy f0–9)
- **throw**: 7 framů (Throw f0–6)

Sprite framy stáhnout lokálně do `src/assets/stone-giant/frames/`:
- `idle_00.png` … `idle_09.png` — z URL: `.../animations/7ca1c28b-a1a0-46a7-b277-e80bba207b5a/south/{N}.png`
- `throw_00.png` … `throw_06.png` — z URL: `.../animations/f199fe94-5395-4a96-a1df-21dcf766377a/south/{N}.png`
- Rotace: `rot_south.png`, `rot_east.png` atd. — z URL: `.../rotations/{direction}.png`

Base URL: `https://backblaze.pixellab.ai/file/pixellab-characters/10f15a6e-f984-4afa-8be1-b703bfaeb07e/457462cf-0337-47fe-89a4-a1c9cc6e51a3/`

## Masky (výstup z TASK-49.1)

PNG soubory 128×128px v `src/assets/stone-giant/masks/`:
- `mask_idle_00.png` … `mask_idle_09.png`
- `mask_throw_00.png` … `mask_throw_06.png`

Kódování: průhledný = miss, `#ff0000` = crit, `#ffff00` = hit/body, `#00ff00` = graze

## Pixel-perfect hit detection — jak funguje

Stávající systém (soubory `Enemy.ts`, `HitZoneSystem.ts`, `constants.ts`) používá kruhy a obdélníky. Ten celý **přepisujeme** pro Stone Giant:

1. **Při inicializaci**: Načti všechny masky jako `ImageData` do paměti (jeden `OffscreenCanvas` per maska, nebo předalokovaný Uint8Array).

2. **Při zásahu** (projektil dopadne na souřadnice `[worldX, worldY]`):
   - Zjisti aktuální animaci a frame index Stone Gianta
   - Převeď world souřadnice na frame-space: `frameX = Math.floor((worldX - enemy.x + 64) * (128 / enemy.displayWidth))`, analogicky Y
   - Zkontroluj bounds (0–127)
   - Načti pixel z příslušné `ImageData` na pozici `[frameX, frameY]`
   - Rozhodnutí podle RGBA: alpha=0 → miss, R>200 & G<50 → crit, R>200 & G>200 → hit, G>200 & R<50 → graze

3. **Výsledek** vrať jako `HitZoneName` (`'head'` / `'torso'` / `'leftLeg'` / `'none'`) pro kompatibilitu se zbytkem hry.

## Stone Giant EnemyDef

Přidej do `constants.ts` (nebo nový soubor `stone-giant-def.ts`):
```ts
STONE_GIANT: {
  name: 'Stone Giant',
  maxHp: 280,           // stejně jako Stone Troll (104) × ~2.7, nebo dle game balance
  critZoneScale: 1.0,
  spriteKey: 'stone_giant',
  maskConfig: {
    idle:  { frameCount: 10, prefix: 'mask_idle_'  },
    throw: { frameCount: 7,  prefix: 'mask_throw_' },
  },
  behavior: { type: 'static' },
  attacks: [ /* převzít z Stone Troll nebo upravit */ ],
}
```

Stone Troll ENEMY_STONE_TROLL def nahradit nebo aliasovat na STONE_GIANT.

## Phaser integrace

- Načti sprite framy jako Phaser texture atlas (nebo individuální textury) v preload fázi BattleScene
- Animace `stone_giant_idle` (loopuje framy 0–9) a `stone_giant_throw` (play once, pak zpět na idle)
- Trigger throw animace při enemy útoku

## Poznámka k architektuře

Existující `hitZoneLayout` / `hitZoneMap` systém nemazat — ostatní nepřátelé ho stále používají. Stone Giant dostane vlastní detekční větev v `Enemy.getHitZone()` podmíněnou přítomností `maskConfig` v EnemyDef.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Stone Giant se zobrazí ve hře místo Stone Troll s animovaným spritem (idle loop, throw při útoku)
- [x] #2 Pixel-perfect hit detection správně rozliší crit/hit/graze/miss podle PNG masky pro aktuální frame
- [x] #3 Zásah do oblasti hlavy (crit) dává crit damage, tělo = normální, kočetiny = graze, mimo = miss
- [x] #4 Ostatní nepřátelé (goblin, orc, ...) funkčí bez změny — starý hitzone systém je zachován
- [x] #5 Masky jsou přednatažené do paměti při startu scény, ne načítány per-frame
- [x] #6 Stone Giant HP a stats jsou balance-vhodné (ověř proti game-design testům v backlogu)
<!-- AC:END -->
