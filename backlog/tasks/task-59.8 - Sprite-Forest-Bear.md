---
id: TASK-59.8
title: 'Sprite: Forest Bear'
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
- **size**: 96
- **proportions**: `{"type": "preset", "name": "stylized"}`
- **detail**: high detail
- **description**: "Large brown bear with a massive muscular body and thick shaggy fur. Broad shoulders with a pronounced muscular hump, powerful forelegs, and large curved claws adapted for digging and fighting. Fur ranges from dark brown to reddish brown with lighter coloration around the muzzle. Small rounded ears, black nose, deep-set dark eyes. Heavy build with visible weight and strength, natural realistic bear proportions."

## Idle Animation (south facing / side view, v3, 8 frames)
**action_description**: "A large brown bear with a massive muscular body and thick shaggy fur standing on all fours, its broad shoulders and pronounced muscular hump rising high. The fur ranges from dark brown to reddish brown with lighter coloration around the muzzle and ripples over the heavy muscle as the bear breathes deeply, its flanks expanding. Powerful forelegs end in large curved claws that grip the ground. The large head with small rounded ears, black nose and deep-set dark eyes swings slowly side to side, sniffing the air, jaws parting occasionally to show teeth. The bear sways its heavy weight gently from side to side, shifting between its powerful legs with deceptive calm. The overall impression is an enormous powerful animal, slow and deliberate but capable of sudden devastating force. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south facing / side view, v3, 8 frames)
**action_description**: "The brown bear rears up and attacks with a massive clawed swipe — it lifts its front off the ground rising onto its hind legs, raising one powerful foreleg with claws spread wide, then slams the paw down and across in a sweeping diagonal swipe at the target, jaws roaring open, before dropping back onto all fours into a heavy menacing stance."

## Pravidla generování animací

> ⚠️ **STOP — schválení base spritu uživatelem**: Po vygenerování base spritu a PŘED jakoukoli animací zobraz sprite uživateli (`get_character`/`get_object` s `include_preview`), popiš ho a POČKEJ na jeho explicitní potvrzení. Bez potvrzení negeneruj idle ani attack. Pokud uživatel sprite zamítne, přegeneruj base sprite a znovu si vyžádej potvrzení.
1. **Pre-check sprite**: stáhni a zkontroluj base sprite (`get_character`). Ověř masivnost, srst, drápy, hřbetní hrb a uprav action_description.
2. **Idle loop kontinuita**: seamless loop — první a poslední frame identické.
3. **Rich prompt konzistence**: self-contained popis (srst, barvy, svaly, drápy, hrb).
4. **Konzistence útoku**: útok je rear-up + clawed swipe (případně bite) — žádné zbraně, přirozený útok drápy.

## Post-processing
- character-id: `forest-bear`
- spriteKey: `forest_bear`
- displayWidth: ~300
- Download frames → `src/assets/characters/forest-bear/frames/`
- Create manifest.json + generate masks
<!-- SECTION:DESCRIPTION:END -->
