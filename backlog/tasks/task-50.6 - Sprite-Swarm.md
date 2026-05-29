---
id: TASK-50.6
title: 'Sprite: Swarm'
status: To Do
assignee: []
created_date: '2026-05-29 11:51'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Creation — OBJECT (not character)
Swarm nemá humanoid/quadruped tvar. Použít `create_1_direction_object` nebo `create_8_direction_object`.
Pokud object tools nepodporují animace dobře, zkusit humanoid character s popisem "amorphous swarm cloud shaped vaguely like a humanoid figure".

- **Fallback body_type**: humanoid
- **mode**: v3
- **size**: 64
- **detail**: medium detail
- **description**: "Dense dark cloud mass made from hundreds of tiny flying insect-like creatures forming a roughly oval amorphous shape. Dark chaotic interior with rapid movement of tiny wings and dark fragments visible at edges. Wisps of dark particles trail from the bottom. No distinct body parts — just a pulsing organic mass of tiny parasitic flying creatures."

## Idle Animation (south, v3, 10 frames)
**action_description**: "A dense amorphous dark cloud of hundreds of tiny flying creatures hovering in place with organic undulating movement. The swarm maintains a roughly oval shape but constantly shifts and reforms at the edges as individual tiny insects dart in and out of the dark mass in random patterns. The interior is a chaotic roiling darkness with rapid internal movement — tiny wings catching faint light, dark fragments tumbling, small parasitic shapes visible briefly at the periphery before being reabsorbed. The overall cloud pulses slowly with a breathing rhythm, contracting slightly inward then expanding outward as if the swarm is a single organism with a slow heartbeat. Dark wisps and stray creatures trail from the bottom edges, drifting down before being pulled back into the mass. The movement is organic, mesmerizing and deeply unsettling — outwardly calm but with seething malevolent energy within the sheer number of creatures. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south, v3, 8 frames)
**action_description**: "The swarm surges forward aggressively — the amorphous cloud rapidly elongates into a pointed spike or cone shape as hundreds of creatures rush forward in a coordinated attack dive, then pulls back to reform its hovering shape."

## Pravidla generování animací
1. **Pre-check sprite**: Po vytvoření objektu v PixelLab a PŘED generováním animací: stáhni a zkontroluj base sprite (`get_object`/`get_character`). Ověř jak swarm skutečně vypadá (tvar, hustota, barvy) a uprav `action_description` animací podle reálného vzhledu.
2. **Idle loop kontinuita**: Idle animace musí tvořit plynulý loop — první a poslední frame musí být vizuálně identické v póze a pozici. Prompt musí explicitně obsahovat instrukci pro seamless loop.
3. **Rich prompt konzistence**: Každý `action_description` musí být self-contained — obsahovat kompletní vizuální popis (tvar oblaku, barvy, velikost částic, chování na okrajích), ne jen popis pohybu. PixelLab generuje framy nezávisle, prompt musí nést všechny vizuální informace.
4. **Konzistence útoku**: Swarm nemá zbraň — útočí celým tělem (nápor oblaku). Ověřit po pre-checku, že attack animace odpovídá reálnému tvaru swarmu.

## Post-processing
- character-id: `swarm`
- spriteKey: `swarm`
- displayWidth: ~160
- Download frames → `src/assets/characters/swarm/frames/`
- Create manifest.json
- Generate masks
- **Poznámka**: Pokud se vytvoří jako object, v manifestu přidat `"type": "object"` a `source.objectId`
<!-- SECTION:DESCRIPTION:END -->
