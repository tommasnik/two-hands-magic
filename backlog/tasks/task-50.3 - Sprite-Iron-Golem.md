---
id: TASK-50.3
title: 'Sprite: Iron Golem'
status: To Do
assignee: []
created_date: '2026-05-29 11:51'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Character Creation
- **body_type**: humanoid
- **mode**: v3
- **size**: 128
- **proportions**: `{"type": "custom", "head_size": 0.7, "arms_length": 1.3, "legs_length": 0.9, "shoulder_width": 1.5, "hip_width": 1.2}`
- **detail**: high detail
- **description**: "Large construct made from dark iron plates. Thick square-shaped blocky body with visible bolts, riveted joints, and mechanical seams. Heavy oversized arms ending in giant iron fists. Narrow head with a slit visor glowing faint orange. Rust patches and deep scratches across dark metal armor plating. Industrial mechanical appearance."

## Idle Animation (south, v3, 10 frames)
**action_description**: "A towering dark iron golem construct standing in a heavy mechanical standby stance with immense latent power barely contained in near-stillness. Visible bolts and riveted joints line the thick square body. A faint orange glow pulses slowly behind the narrow eye slit in the blocky head. Subtle mechanical micro-movements cycle through the frame — a piston in the shoulder shifts with hydraulic precision, the giant iron fingers on oversized fists slowly clench and unclench in a grinding metallic rhythm. Faint wisps of steam or heat haze drift upward from the shoulder joints. The body is covered in rust patches and deep battle scratches. The overall impression is an ancient industrial war machine in idle mode — every tiny movement hints at the catastrophic force it could unleash. Heavy, imposing, mechanical, patient. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south, v3, 8 frames)
**action_description**: "Devastating double fist overhead slam — the golem raises both massive iron fists high above its head with grinding mechanical motion, then brings them crashing down together in a thunderous ground pound."

## Pravidla generování animací
1. **Pre-check sprite**: Po vytvoření characteru v PixelLab a PŘED generováním animací: stáhni a zkontroluj base sprite (`get_character`). Ověř jak postava skutečně vypadá (póza, zbraně, detaily, barvy) a uprav `action_description` animací podle reálného vzhledu — ne podle idealizovaného popisu výše.
2. **Idle loop kontinuita**: Idle animace musí tvořit plynulý loop — první a poslední frame musí být vizuálně identické v póze a pozici. Prompt musí explicitně obsahovat instrukci pro seamless loop.
3. **Rich prompt konzistence**: Každý `action_description` musí být self-contained — obsahovat kompletní vizuální popis postavy (materiály, barvy, proporce, zbraně, vybavení), ne jen popis pohybu. PixelLab generuje framy nezávisle, prompt musí nést všechny vizuální informace pro konzistentní výsledek napříč framy.
4. **Konzistence zbraní v attack**: Pokud postava drží zbraň, attack animace MUSÍ útočit touto zbraní. Iron Golem útočí pěstmi (nemá zbraň) — ověřit po pre-checku spritu.

## Post-processing
- character-id: `iron-golem`
- spriteKey: `iron_golem`
- displayWidth: ~240
- Download frames → `src/assets/characters/iron-golem/frames/`
- Create manifest.json
- Generate masks
<!-- SECTION:DESCRIPTION:END -->
