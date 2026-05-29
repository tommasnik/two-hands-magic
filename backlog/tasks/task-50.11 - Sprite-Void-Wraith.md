---
id: TASK-50.11
title: 'Sprite: Void Wraith'
status: To Do
assignee: []
created_date: '2026-05-29 11:52'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Character Creation
- **body_type**: humanoid
- **mode**: v3
- **size**: 64
- **proportions**: `{"type": "custom", "head_size": 0.8, "arms_length": 1.5, "legs_length": 1.0, "shoulder_width": 0.8, "hip_width": 0.6}`
- **detail**: medium detail
- **description**: "Floating humanoid entity made from swirling black smoke and dark purple-black energy. Body lacks solid edges — constantly dissolving into mist at boundaries. Long distorted arms with elongated claw-like fingers. Two bright pale glowing eyes inside the darkness. Lower body fades into trailing smoke wisps. No legs visible — hovers above ground."

## Idle Animation (south, v3, 10 frames)
**action_description**: "A floating humanoid entity composed of swirling black smoke and dark purple-black energy hovering motionless above the ground in an eerie supernatural stillness. The form lacks solid edges — the silhouette constantly dissolves and reforms at every boundary, wisps of dark mist trailing away from shoulders, arms and head before being slowly reabsorbed into the mass. Long distorted arms end in elongated claw-like fingers that drift and flex with slow predatory intent in the empty air. Two bright pale glowing eyes — the only solid coherent feature — stare forward from within the churning dark mass with cold ancient malevolent intelligence, unblinking and utterly focused. The lower body fades entirely into trailing smoke tendrils that drift downward and dissipate before reaching the ground. The entire form undulates slowly as if made of thick liquid shadow stirred by an invisible current. An entity of concentrated darkness hovering between existence and void — deeply wrong, deeply patient. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south, v3, 8 frames)
**action_description**: "The void wraith surges forward with sudden violent speed, both elongated claw-hands reaching out as dark energy tendrils extend from the fingers like grasping shadowy tentacles, the entire smoke body stretching and elongating toward the target before snapping back to hovering form."

## Pravidla generování animací
1. **Pre-check sprite**: Po vytvoření characteru v PixelLab a PŘED generováním animací: stáhni a zkontroluj base sprite (`get_character`). Ověř jak entita skutečně vypadá (tvar kouře, prsty, oči, barvy) a uprav `action_description` animací podle reálného vzhledu — ne podle idealizovaného popisu výše.
2. **Idle loop kontinuita**: Idle animace musí tvořit plynulý loop — první a poslední frame musí být vizuálně identické v póze a pozici. Prompt musí explicitně obsahovat instrukci pro seamless loop.
3. **Rich prompt konzistence**: Každý `action_description` musí být self-contained — obsahovat kompletní vizuální popis entity (kouř, barvy, svítící oči, prsty, absence nohou), ne jen popis pohybu. PixelLab generuje framy nezávisle, prompt musí nést všechny vizuální informace.
4. **Konzistence útoku**: Void Wraith nemá zbraň — útočí drápovitými prsty a temnými chapadly. Ověřit po pre-checku, že tvar rukou/prstů na spritu odpovídá popisu attack animace.

## Post-processing
- character-id: `void-wraith`
- spriteKey: `void_wraith`
- displayWidth: ~160
- Download frames → `src/assets/characters/void-wraith/frames/`
- Create manifest.json
- Generate masks
<!-- SECTION:DESCRIPTION:END -->
