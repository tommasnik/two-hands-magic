---
id: TASK-50
title: Generate enemy sprites via PixelLab (12 enemies)
status: To Do
assignee: []
created_date: '2026-05-29 11:50'
updated_date: '2026-05-29 11:53'
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
Vygenerovat base sprite + idle animaci + attack animaci pro 12 enemies přes PixelLab MCP.

## Postup pro každý subtask
1. **Vytvoř character/object** v PixelLab (parametry v subtasku)
2. **Animuj idle** — south direction, v3 mode, 8-10 framů
3. **Animuj attack** — south direction, v3 mode, 8-10 framů
4. **Stáhni framy** do `src/assets/characters/{id}/frames/`
5. **Vytvoř manifest.json** podle šablony v CLAUDE.md
6. **Generuj masky** — `python3 scripts/generate_masks.py src/assets/characters/{id}`

## Odhad nákladů
- ~5 gens/character (v3 mode) × 12 = ~60 gens
- ~1 gen/animation (v3, south only) × 24 = ~24 gens
- Celkem: ~84 gens z 1889 dostupných

## Enemies (12)
1. Goblin Scout (humanoid, 48px)
2. Orc Warrior (humanoid, 96px)
3. Iron Golem (humanoid, 128px)
4. Mirror Knight (humanoid, 64px)
5. Ancient Treant (humanoid, 128px)
6. Swarm (object/humanoid fallback, 64px)
7. Shadow Dancer (humanoid, 48px)
8. Lava Slug (object/quadruped fallback, 96px)
9. Stone Drake (quadruped lion, 96px)
10. Thunder Hawk (object/humanoid fallback, 64px)
11. Void Wraith (humanoid, 64px)
12. Titan Lord (humanoid, 128px)

## Pravidla generování animací (platí pro VŠECHNY subtasky)

### 1. Pre-check sprite před animací
Po vytvoření characteru/objektu a **PŘED** generováním jakékoliv animace:
- Stáhni a vizuálně zkontroluj base sprite (`get_character`/`get_object`)
- Ověř jak postava **skutečně** vypadá — póza, zbraně, detaily, barvy, proporce
- Uprav `action_description` idle i attack animací podle **reálného** vzhledu spritu, ne podle idealizovaného popisu v tasku
- Pokud sprite nemá zbraň, kterou task zmiňuje, uprav attack animaci odpovídajícím způsobem

### 2. Idle loop kontinuita
- Idle animace MUSÍ tvořit plynulý loop — první a poslední frame vizuálně identické v póze a pozici
- Žádný viditelný "skok" při opakování
- V `action_description` explicitně uvést: "The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

### 3. Rich prompt konzistence
- Každý `action_description` musí být **self-contained** — obsahovat kompletní vizuální popis (materiály, barvy, proporce, zbraně, vybavení, textury)
- Ne jen popis pohybu — PixelLab generuje framy nezávisle, prompt musí nést VŠECHNY vizuální informace
- Prompt musí být konzistentní s `description` z character creation — stejné barvy, materiály, detaily

### 4. Konzistence zbraní v attack
- Pokud postava drží zbraň (meč, sekeru, dýku, luk...), attack animace MUSÍ útočit **touto** zbraní
- Žádný generic punch/slam pokud má sprite konkrétní zbraň
- Ověřit vizuálně po pre-checku spritu

## Poznámky
- Většina enemies = humanoid character
- Stone Drake = quadruped (lion template)
- Swarm, Lava Slug, Thunder Hawk = PixelLab object (nejsou humanoid/quadruped)
- Všechny idle popisy jsou detailní a reflektují agresivitu enemy
- Všechny animace south-facing only (hra je portrait)
<!-- SECTION:DESCRIPTION:END -->
