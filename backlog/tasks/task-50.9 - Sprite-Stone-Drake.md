---
id: TASK-50.9
title: 'Sprite: Stone Drake'
status: To Do
assignee: []
created_date: '2026-05-29 11:52'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Character Creation
- **body_type**: quadruped
- **template**: lion
- **mode**: v3
- **size**: 96
- **detail**: high detail
- **description**: "Medium-sized draconic creature with rough rocky gray-brown scales. Low wide body on four powerful legs with thick clawed feet. Short muscular neck with broad reptilian head, slitted amber eyes. Wing-like structures of layered stone plates folded on back. Thick stone tail. Cracked rock texture across all scales with small mineral deposits."

## Idle Animation (south, v3, 8 frames)
**action_description**: "A medium-sized draconic creature with rough rocky gray-brown scales crouching in a low alert predatory stance on four powerful legs. The wide heavy body rests close to the ground, thick clawed feet gripping firmly. A short muscular neck holds a broad reptilian head with slitted amber eyes scanning steadily ahead. Folded stone-plate wings on the back shift slightly. The thick stone tail sweeps slowly side to side behind the body with deliberate weight. Cracked stone textures and mineral deposits catch faint light across the scales. The drake shifts its low center of gravity with subtle muscular adjustments, powerful haunches tensed and ready to spring. Alert, watchful, territorial — a apex predator guarding its domain, confident in its armored bulk and ready to strike at any provocation. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south, v3, 8 frames)
**action_description**: "Lunging forward bite attack — the stone drake launches its heavy body forward on powerful hind legs, jaws opening wide to reveal rows of rocky teeth, snapping shut in a devastating crushing bite, then settling back to its crouching stance."

## Pravidla generování animací
1. **Pre-check sprite**: Po vytvoření characteru v PixelLab a PŘED generováním animací: stáhni a zkontroluj base sprite (`get_character`). Ověř jak drak skutečně vypadá (póza, tvar hlavy, ocas, křídla) a uprav `action_description` animací podle reálného vzhledu — ne podle idealizovaného popisu výše.
2. **Idle loop kontinuita**: Idle animace musí tvořit plynulý loop — první a poslední frame musí být vizuálně identické v póze a pozici. Prompt musí explicitně obsahovat instrukci pro seamless loop.
3. **Rich prompt konzistence**: Každý `action_description` musí být self-contained — obsahovat kompletní vizuální popis tvora (šupiny, barvy, proporce nohou, hlava, ocas), ne jen popis pohybu. PixelLab generuje framy nezávisle, prompt musí nést všechny vizuální informace.
4. **Konzistence útoku**: Stone Drake nemá zbraň — útočí kousnutím čelistmi. Ověřit po pre-checku, že tvar hlavy/čelistí na spritu odpovídá popisu attack animace.

## Post-processing
- character-id: `stone-drake`
- spriteKey: `stone_drake`
- displayWidth: ~200
- Download frames → `src/assets/characters/stone-drake/frames/`
- Create manifest.json
- Generate masks
<!-- SECTION:DESCRIPTION:END -->
