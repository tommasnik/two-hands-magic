---
id: TASK-59
title: Generate beast & outlaw enemy sprites via PixelLab (8 enemies)
status: To Do
assignee: []
created_date: '2026-05-30 08:01'
labels:
  - sprites
  - pixellab
  - assets
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled
Vygenerovat base sprite + idle animaci + attack animaci pro 8 enemies přes PixelLab MCP.
Tato várka jsou realistické bestie a lidští/humanoidní nepřátelé (early/mid-game, "přírodní" téma) — odlišná od fantasy várky v TASK-50.

## ⚠️ Kamera: side view (čelní, v úrovni očí — NE top-down)

Hra je side-scroller. Všechny sprity musí být snímané kamerou **v úrovni očí zepředu**, ne shora.
- **create_character** → vždy `view: "side"` (NE default "low top-down"). Směr animací zůstává `south` = postava čelem ke kameře. `view: side` + `south` = čelní pohled v úrovni očí.
- **create_1_direction_object** (objektová cesta, např. Barn Spider) → `view: "sidescroller"`.

## Postup pro každý subtask

**Nejdřív zvol metodu generování** (CLAUDE.md → "Volba metody generování"): jasný humanoid/čtyřnožec → `create_character`; diskutabilní tvar → NEJDŘÍV se zeptej uživatele (varianta character / object / sada objektů). V této várce je diskutabilní jen Barn Spider.

1. **Vytvoř character/object** v PixelLab (parametry v subtasku)
2. **Pre-check** — stáhni a vizuálně zkontroluj base sprite, uprav action_description podle reálného vzhledu
3. **⚠️ STOP — schválení base spritu uživatelem**: zobraz vygenerovaný base sprite uživateli a POČKEJ na jeho explicitní potvrzení. Bez potvrzení nepokračuj na animace; při zamítnutí přegeneruj base sprite.
4. **Animuj idle** — south direction, v3 mode, 8 framů (seamless loop)
5. **Animuj attack** — south direction, v3 mode, 8 framů
6. **Stáhni framy** do `src/assets/characters/{id}/frames/`
7. **Vytvoř manifest.json** podle šablony v CLAUDE.md
8. **Generuj masky** — `python3 scripts/generate_masks.py src/assets/characters/{id}`
9. **(Volitelné) Zpřesni masky** v sprite-masks-editoru

## Enemies (8)
1. Farm Rat (quadruped, 48px)
2. Barn Spider (object/quadruped fallback, 64px)
3. Wolf (quadruped, 64px)
4. Dire Wolf (quadruped, 96px)
5. Wild Boar (quadruped, 64px)
6. Bandit (humanoid, 64px)
7. Gnoll Raider (humanoid, 64px)
8. Forest Bear (quadruped, 96px)

## Pravidla generování (platí pro všechny subtasky)
Viz CLAUDE.md → "Pravidla generování animací v PixelLabu". Klíčové:
- Pre-check spritu před animací; action_description odvodit od reálného vzhledu
- Idle MUSÍ tvořit seamless loop (první = poslední frame)
- Rich self-contained prompt (materiály, barvy, proporce, srst/peří, zbraně)
- Attack útočí reálnou zbraní/přirozeným útokem viditelným na spritu
- Výběr kandidátů VŽDY dělá uživatel, ne agent
<!-- SECTION:DESCRIPTION:END -->
