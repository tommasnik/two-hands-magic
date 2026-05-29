---
id: TASK-50.5
title: 'Sprite: Ancient Treant'
status: To Do
assignee: []
created_date: '2026-05-29 11:51'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Character Creation
- **body_type**: humanoid
- **mode**: v3
- **size**: 128
- **proportions**: `{"type": "custom", "head_size": 0.8, "arms_length": 1.4, "legs_length": 0.8, "shoulder_width": 1.5, "hip_width": 1.3}`
- **detail**: high detail
- **description**: "Huge ancient walking tree creature. Thick trunk-like torso with massive gnarled branch arms. Bark surface deeply cracked and covered with green moss, hanging vines, and clusters of small mushrooms. Deep glowing green eyes set in knots in the wood. Large tangled root system forming the feet. Heavy ancient weathered appearance. Leaves and small twigs growing from shoulders and head."

## Idle Animation (south, v3, 10 frames)
**action_description**: "An enormous ancient tree creature standing with slow ponderous weight in a state of patient stillness. Its thick trunk-torso is covered in deeply cracked bark with patches of green moss, hanging vines draping from branch-arms, and clusters of small mushrooms growing in every crevice. The massive gnarled branch-arms hang low and sway with glacial slowness like ancient boughs in the faintest breeze. Deep glowing green eyes peer out from dark knots in the wood with timeless patient wisdom — blinking very slowly, if at all. The large tangled root-feet grip the ground with immovable organic stability. Small leaves drift and settle, tiny twigs creak. The breathing is the deep slow groan of old wood expanding and contracting over centuries. Everything about the creature communicates immense dormant power held in check by ancient patience — a primordial forest guardian at rest who has watched civilizations rise and fall without stirring. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south, v3, 8 frames)
**action_description**: "Massive sweeping branch arm strike — one enormous gnarled branch-arm draws back slowly then sweeps forward in a wide devastating horizontal arc, leaves and bark fragments flying from the force of the blow."

## Pravidla generování animací
1. **Pre-check sprite**: Po vytvoření characteru v PixelLab a PŘED generováním animací: stáhni a zkontroluj base sprite (`get_character`). Ověř jak postava skutečně vypadá (póza, zbraně, detaily, barvy) a uprav `action_description` animací podle reálného vzhledu — ne podle idealizovaného popisu výše.
2. **Idle loop kontinuita**: Idle animace musí tvořit plynulý loop — první a poslední frame musí být vizuálně identické v póze a pozici. Prompt musí explicitně obsahovat instrukci pro seamless loop.
3. **Rich prompt konzistence**: Každý `action_description` musí být self-contained — obsahovat kompletní vizuální popis postavy (materiály, barvy, proporce, zbraně, vybavení), ne jen popis pohybu. PixelLab generuje framy nezávisle, prompt musí nést všechny vizuální informace pro konzistentní výsledek napříč framy.
4. **Konzistence zbraní v attack**: Ancient Treant nemá zbraň — útočí větvemi/rameny. Ověřit po pre-checku, že attack odpovídá reálnému tvaru ramen/větví na spritu.

## Post-processing
- character-id: `ancient-treant`
- spriteKey: `ancient_treant`
- displayWidth: ~260
- Download frames → `src/assets/characters/ancient-treant/frames/`
- Create manifest.json
- Generate masks
<!-- SECTION:DESCRIPTION:END -->
