---
id: TASK-40
title: 'Sprite pipeline: AI hit zone extraction from enemy spritesheets'
status: Done
assignee: []
created_date: '2026-05-15 19:42'
labels:
  - tooling
  - sprites
  - pipeline
dependencies: []
references:
  - tools/sprite-pipeline/README.md
  - tools/sprite-pipeline/analyze.js
  - tools/sprite-pipeline/preview.js
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Postavena pipeline v `tools/sprite-pipeline/` pro zpracování enemy spritesheet PNG a automatickou extrakci `HitZoneLayout` pomocí Claude Vision.

## Co bylo vytvořeno

- `generate-sample.js` — generátor pixel-art goblin spritu (4 walk framy, 64×64, pngjs)
- `analyze.js` — Claude Vision analýza každého framu → `output/<name>.hitzone.json` + TS snippet
- `preview.js` — annotovaný PNG preview se zónami CRIT/HIT/GRAZE overlayem (4× upscale)
- `sample/goblin.json` — ukázková konfigurace
- `README.md` — dokumentace procesu

## Jak pipeline funguje

1. Připrav `sample/<name>.json` s frame dimensions a animacemi
2. `node analyze.js sample/<name>.json` — Claude Vision projde každý frame, vrátí JSON souřadnice hit zón
3. `node preview.js sample/<name>.json output/<name>.hitzone.json` — vizuální ověření
4. Zkopíruj TS snippet do `constants.ts` → `EnemyDef.hitZoneLayout`

## Technické detaily

- Závislosti: `pngjs` (pure JS) + `@anthropic-ai/sdk` — žádné native deps, funguje na Node v24
- Souřadnice relativní k středu framu, Y+ dolů — mapuje 1:1 na `HitZoneLayout` v `types/index.ts`
- Průměrování layoutů přes všechny framy animace → `defaultLayout`
- `canvas` package byl vyloučen (nekompatibilní s Node v24)
<!-- SECTION:DESCRIPTION:END -->
