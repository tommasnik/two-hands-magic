---
id: TASK-50.12
title: 'Sprite: Titan Lord'
status: To Do
assignee: []
created_date: '2026-05-29 11:53'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Character Creation
- **body_type**: humanoid
- **mode**: v3
- **size**: 128
- **proportions**: `{"type": "preset", "name": "heroic"}`
- **detail**: high detail
- **description**: "Gigantic heavily armored warrior in ancient dark plate armor covered in scratches, battle damage, and engraved runic patterns. Fully enclosed great helm with narrow visor slit glowing faint gold. Massive broad silhouette with thick layered overlapping armor plates on shoulders, torso, and legs. Holds an enormous two-handed greatsword. Heavy imposing proportions. Ancient weathered appearance."

## Idle Animation (south, v3, 10 frames)
**action_description**: "A gigantic heavily armored warrior standing with imposing imperial presence and supreme confidence, an ancient conqueror surveying a conquered battlefield. The massive broad silhouette is encased in ancient heavy plate armor covered in scratches, battle damage, and intricate engraved runic patterns that hint at forgotten power. The fully enclosed great helm features a narrow visor slit with faint golden light glowing steadily from within where eyes would be — an unblinking judgment. One enormous gauntleted hand rests on the pommel of a colossal greatsword planted point-down before the titan like a monument, the other hangs at its side in a heavy armored fist. Thick layered armor plates overlap across massive shoulders, broad torso and column-like legs with visible age, wear and ancient battle damage. The titan breathes with slow deep ponderous rhythm, each breath making the massive ancient armor creak and groan under its own weight. The stance radiates utter dominance — patient, supremely powerful, and absolutely certain that nothing in the world poses a threat. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south, v3, 10 frames)
**action_description**: "Devastating overhead greatsword slam — the titan lord lifts its enormous sword overhead with both gauntleted hands, the blade catching light as it rises, pauses at the apex with immense gathered force, then brings it crashing down in a catastrophic vertical slam that shakes the ground."

## Pravidla generování animací
1. **Pre-check sprite**: Po vytvoření characteru v PixelLab a PŘED generováním animací: stáhni a zkontroluj base sprite (`get_character`). Ověř jak postava skutečně vypadá (brnění, meč, helma, proporce) a uprav `action_description` animací podle reálného vzhledu — ne podle idealizovaného popisu výše.
2. **Idle loop kontinuita**: Idle animace musí tvořit plynulý loop — první a poslední frame musí být vizuálně identické v póze a pozici. Prompt musí explicitně obsahovat instrukci pro seamless loop.
3. **Rich prompt konzistence**: Každý `action_description` musí být self-contained — obsahovat kompletní vizuální popis postavy (brnění, runové vzory, barvy, meč, helma), ne jen popis pohybu. PixelLab generuje framy nezávisle, prompt musí nést všechny vizuální informace pro konzistentní výsledek napříč framy.
4. **Konzistence zbraní v attack**: Titan Lord drží obrovský obouruční meč — attack animace MUSÍ útočit tímto mečem (ne pěstmi/kopáním). Ověřit vizuálně po pre-checku spritu, že greatsword je viditelný.

## Post-processing
- character-id: `titan-lord`
- spriteKey: `titan_lord`
- displayWidth: ~280
- Download frames → `src/assets/characters/titan-lord/frames/`
- Create manifest.json
- Generate masks
<!-- SECTION:DESCRIPTION:END -->
