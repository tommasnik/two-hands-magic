---
id: TASK-59.4
title: 'Sprite: Dire Wolf'
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
- **description**: "Large dire wolf nearly the size of a horse, far more massive than a normal wolf. Broad deep chest, thick muscular neck and powerful hunched shoulders. Dense dark gray fur with lighter silver-gray patches around the muzzle and chest, shaggy along the spine. Oversized paws, large prominent fangs, sharp claws. Rugged heavily-built frame with heavy visible musculature, while remaining believable and animal-like. Pale cold eyes."

## Idle Animation (south facing / side view, v3, 8 frames)
**action_description**: "A huge dire wolf nearly the size of a horse standing in a heavy four-legged stance, its broad deep chest and thick muscular neck lowered, powerful hunched shoulders bunched with weight. Dense dark gray fur with lighter silver-gray patches around the muzzle and chest is shaggy along the spine and ripples over the heavy musculature as it breathes deeply and slowly. Pale cold eyes fix forward with menacing focus and the oversized paws plant firmly on the ground, claws gripping. The large prominent fangs show as the jaws part slightly with each heavy breath, a low silent growl implied. The thick tail sways low and heavy. Ears flick. The overall impression is an enormous apex predator radiating raw physical power and barely contained aggression, immovable and dangerous. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south facing / side view, v3, 8 frames)
**action_description**: "The massive dire wolf rears and lunges forward in a devastating bite — it coils its powerful hind legs, surges its huge body toward the target, jaws gaping wide to expose the large fangs, and clamps down with crushing force, its head thrashing on impact, before slamming its oversized paws down and settling back into a heavy menacing crouch."

## Pravidla generování animací

> ⚠️ **STOP — schválení base spritu uživatelem**: Po vygenerování base spritu a PŘED jakoukoli animací zobraz sprite uživateli (`get_character`/`get_object` s `include_preview`), popiš ho a POČKEJ na jeho explicitní potvrzení. Bez potvrzení negeneruj idle ani attack. Pokud uživatel sprite zamítne, přegeneruj base sprite a znovu si vyžádej potvrzení.
1. **Pre-check sprite**: stáhni a zkontroluj base sprite (`get_character`). Ověř masivnost, srst, fangs, proporce a uprav action_description.
2. **Idle loop kontinuita**: seamless loop — první a poslední frame identické.
3. **Rich prompt konzistence**: self-contained popis (srst, svaly, fangs, velikost, ocas).
4. **Konzistence útoku**: útok je masivní lunge bite — žádné zbraně, přirozený útok tlamou.

## Post-processing
- character-id: `dire-wolf`
- spriteKey: `dire_wolf`
- displayWidth: ~300
- Download frames → `src/assets/characters/dire-wolf/frames/`
- Create manifest.json + generate masks
<!-- SECTION:DESCRIPTION:END -->
