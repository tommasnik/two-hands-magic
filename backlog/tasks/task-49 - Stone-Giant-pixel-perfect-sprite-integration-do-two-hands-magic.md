---
id: TASK-49
title: 'Stone Giant: pixel-perfect sprite integration do two-hands-magic'
status: Done
assignee: []
created_date: '2026-05-29 07:28'
updated_date: '2026-05-29 08:20'
labels:
  - two-hands-magic
  - stone-giant
  - sprite
  - hit-detection
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stone Giant (vygenerovaný přes PixelLab AI) nahrazuje Stone Troll nepřítele v two-hands-magic. Místo procedurálního renderování a kruhových/obdélníkových hit zón přecházíme na pixel-perfect detekci pomocí color-coded PNG masek.

## Architektura

Workflow je dvou-fázový:

**Fáze 1 — Zone editor** (subtask-A): Standalone dev tool v `sites/stone-giant-editor/`. Stáhne framy ze Stone Giant PixelLab animací lokálně, auto-předvyplní hit masky (top/mid/bot 1/3 = crit/body/graze), zobrazí canvas editor kde lze štětcem upravit zóny per frame, exportuje color-coded PNG masky.

**Fáze 2 — Game integrace** (subtask-B): Stone Giant nahradí Stone Troll v `sites/two-hands-magic/`. Přepíše hit detection systém z geometrických tvarů na pixel-perfect lookup do PNG masek. Přidá Stone Giant EnemyDef se spriteKey, animacemi a maskConfig.

## Datový formát masek

Color-coded PNG (128×128px, stejné rozměry jako sprite frame):
- Průhledný pixel = miss (žádný zásah)
- `#ff0000` (červená) = crit zone (hlava)
- `#ffff00` (žlutá) = hit zone (torso/tělo)  
- `#00ff00` (zelená) = graze zone (končetiny)

## Stone Giant data (PixelLab)

Character ID: `457462cf-0337-47fe-89a4-a1c9cc6e51a3`
Base URL: `https://backblaze.pixellab.ai/file/pixellab-characters/10f15a6e-f984-4afa-8be1-b703bfaeb07e/457462cf-0337-47fe-89a4-a1c9cc6e51a3`

Animace k mapování (17 framů celkem):
- **idle**: Throw Heavy animace, framy 0–9 (`animations/7ca1c28b-a1a0-46a7-b277-e80bba207b5a/south/{N}.png`)
- **throw**: Throw animace, framy 0–6 (`animations/f199fe94-5395-4a96-a1df-21dcf766377a/south/{N}.png`)

Rotace (8 směrů): `rotations/{direction}.png` — south, east, north, west, south-east, north-east, north-west, south-west
<!-- SECTION:DESCRIPTION:END -->
