---
id: TASK-59.5
title: 'Sprite: Wild Boar'
status: To Do
assignee: []
created_date: '2026-05-30 08:01'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-59
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Character Creation
- **body_type**: quadruped
- **view**: side  (kamera v úrovni očí, čelní pohled — NE top-down)
- **mode**: v3
- **size**: 64
- **proportions**: `{"type": "preset", "name": "stylized"}`
- **detail**: medium detail
- **description**: "Stocky wild boar with a low center of gravity and thick muscular body. Dark brown coarse bristly fur covering most of the body. Large head with a long snout and curved ivory tusks jutting upward. Small dark eyes, short sturdy legs, and a raised bristled ridge of stiff hair running along the spine. Mud stains and old scars across the tough hide. Heavy front shoulders, narrow hindquarters."

## Idle Animation (south facing / side view, v3, 8 frames)
**action_description**: "A stocky wild boar with a low heavy center of gravity and thick muscular body covered in dark brown coarse bristly fur, standing on short sturdy legs with its heavy front shoulders lowered. The large head with its long snout swings slowly side to side, the curved ivory tusks jutting upward catching the light, and small dark eyes glare forward. The raised bristled ridge of stiff hair along the spine quivers. The boar snorts and huffs, its flanks expanding with heavy breaths, and it paws and scrapes the ground with a front hoof, kicking up a little dirt, as if preparing to charge. Mud stains and old scars mark the tough hide. The short tail flicks. The overall impression is a powerful, irritable, territorial animal ready to charge at any provocation. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south facing / side view, v3, 8 frames)
**action_description**: "The wild boar lowers its head and charges forward in a goring tusk attack — it scrapes the ground, then drives its heavy body toward the target at speed with the head down, slamming its curved ivory tusks upward into the target with a violent toss of the head, then pulling back into a low huffing stance, dirt scattering from its hooves."

## Pravidla generování animací

> ⚠️ **STOP — schválení base spritu uživatelem**: Po vygenerování base spritu a PŘED jakoukoli animací zobraz sprite uživateli (`get_character`/`get_object` s `include_preview`), popiš ho a POČKEJ na jeho explicitní potvrzení. Bez potvrzení negeneruj idle ani attack. Pokud uživatel sprite zamítne, přegeneruj base sprite a znovu si vyžádej potvrzení.
1. **Pre-check sprite**: stáhni a zkontroluj base sprite (`get_character`). Ověř tvar těla, kly, hřbetní hřeben, srst a uprav action_description.
2. **Idle loop kontinuita**: seamless loop — první a poslední frame identické.
3. **Rich prompt konzistence**: self-contained popis (srst, kly, svaly, jizvy, hřeben).
4. **Konzistence útoku**: útok je charge + gore kly (tusks) — žádné zbraně, přirozený útok.

## Post-processing
- character-id: `wild-boar`
- spriteKey: `wild_boar`
- displayWidth: ~230
- Download frames → `src/assets/characters/wild-boar/frames/`
- Create manifest.json + generate masks
<!-- SECTION:DESCRIPTION:END -->
