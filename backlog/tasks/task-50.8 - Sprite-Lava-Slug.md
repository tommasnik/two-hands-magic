---
id: TASK-50.8
title: 'Sprite: Lava Slug'
status: To Do
assignee: []
created_date: '2026-05-29 11:52'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Creation — OBJECT (not character)
Lava Slug nemá humanoid/quadruped tvar. Preferovat `create_1_direction_object` (south only).
Pokud object tools nepodporují animace, zkusit quadruped s bear template a silně modifikovaným popisem.

- **Fallback body_type**: quadruped, template: bear
- **mode**: v3
- **size**: 96
- **detail**: high detail
- **description**: "Massive slug creature made from black volcanic rock with bright glowing orange-red magma visible through deep cracks across entire body surface. Thick bulbous low-to-ground body with no legs or visible eyes. Wide molten glowing mouth at front. Small drips of lava at base. Heat distortion shimmer around the body. Dark volcanic rock texture with bright magma veins."

## Idle Animation (south, v3, 10 frames)
**action_description**: "A massive slug-like creature made from black volcanic rock with bright orange-red magma glowing through deep cracks across its entire body, sitting heavily on the ground in a slow ominous idle state. The thick bulbous form has no visible eyes — just a wide molten mouth at the front that slowly opens and closes, revealing a bright glowing interior. The magma veins across the dark rock surface pulse with a slow rhythmic heartbeat — brightening to intense orange then dimming to deep red in a steady cycle. Small drips and beads of glowing lava seep from the bottom edges and crack seams. Heat shimmer distorts the air above the creature. The enormous body shifts its weight with glacial slowness, undulating almost imperceptibly forward and back. The overall impression is of a living volcano fragment — ancient, ominous, patiently radiating lethal heat, in no hurry because nothing can escape its burning presence. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south, v3, 8 frames)
**action_description**: "The lava slug rears its front section upward, mouth opening wide to reveal a blazing molten interior, then spits a large glob of bright glowing lava forward in a projectile arc."

## Pravidla generování animací
1. **Pre-check sprite**: Po vytvoření objektu v PixelLab a PŘED generováním animací: stáhni a zkontroluj base sprite (`get_object`/`get_character`). Ověř jak slug skutečně vypadá (tvar, magma praskliny, barvy) a uprav `action_description` animací podle reálného vzhledu.
2. **Idle loop kontinuita**: Idle animace musí tvořit plynulý loop — první a poslední frame musí být vizuálně identické v póze a pozici. Prompt musí explicitně obsahovat instrukci pro seamless loop.
3. **Rich prompt konzistence**: Každý `action_description` musí být self-contained — obsahovat kompletní vizuální popis (vulkanická textura, barvy magma žil, tvar těla, ústa), ne jen popis pohybu. PixelLab generuje framy nezávisle, prompt musí nést všechny vizuální informace.
4. **Konzistence útoku**: Lava Slug nemá zbraň — útočí plivnutím lávy z tlamy. Ověřit po pre-checku, že tlama je na spritu viditelná a attack odpovídá reálnému tvaru.

## Post-processing
- character-id: `lava-slug`
- spriteKey: `lava_slug`
- displayWidth: ~200
- Download frames → `src/assets/characters/lava-slug/frames/`
- Create manifest.json
- Generate masks
- **Poznámka**: V manifestu `"type": "object"` pokud vytvořeno jako object
<!-- SECTION:DESCRIPTION:END -->
