---
id: TASK-59.7
title: 'Sprite: Gnoll Raider'
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
- **body_type**: humanoid
- **view**: side  (kamera v úrovni očí, čelní pohled — NE top-down)
- **mode**: v3
- **size**: 64
- **proportions**: `{"type": "preset", "name": "stylized"}`
- **detail**: high detail
- **description**: "Hyena-like humanoid gnoll standing around 2 meters tall with a slightly hunched posture and long arms. Lean but muscular frame covered in coarse yellow-brown fur with dark spots and a darker mane along the neck and shoulders. Long canine muzzle filled with sharp teeth, pointed ears, bright predatory yellow eyes. Wears crude leather armor reinforced with bones and scavenged scrap metal, with tribal straps and trophies. Holds a crude curved blade or jagged spear. Digitigrade clawed feet."

## Idle Animation (south facing / side view, v3, 8 frames)
**action_description**: "A hyena-like humanoid gnoll about 2 meters tall standing in a slightly hunched posture with long arms hanging low, its lean but muscular frame covered in coarse yellow-brown fur with dark spots and a darker bristling mane along the neck and shoulders. The long canine muzzle is filled with sharp teeth and bright predatory yellow eyes glare forward with feral hunger; pointed ears twitch. It wears crude leather armor reinforced with bones and scavenged scrap metal, with tribal straps and dangling trophies that sway. It grips a crude curved blade in one clawed hand. The gnoll sways and shifts on its digitigrade clawed feet with restless predatory energy, head tilting and jaws parting as if snarling or chuckling, the mane bristling. The overall impression is a savage, twitchy, bloodthirsty scavenger-raider barely holding still. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south facing / side view, v3, 8 frames)
**action_description**: "The gnoll raider attacks with a savage overhead chop of its crude curved blade — it raises the jagged weapon high in one clawed hand while snarling with bared teeth, lunges forward on its digitigrade legs, and slashes the blade down diagonally across the target in a brutal arc, the mane and trophies flying with the motion, then drops back into a hunched ready crouch."

## Pravidla generování animací

> ⚠️ **STOP — schválení base spritu uživatelem**: Po vygenerování base spritu a PŘED jakoukoli animací zobraz sprite uživateli (`get_character`/`get_object` s `include_preview`), popiš ho a POČKEJ na jeho explicitní potvrzení. Bez potvrzení negeneruj idle ani attack. Pokud uživatel sprite zamítne, přegeneruj base sprite a znovu si vyžádej potvrzení.
1. **Pre-check sprite**: stáhni a zkontroluj base sprite (`get_character`). Ověř postoj, srst, hřívu, výstroj z kostí a hlavně JAKOU ZBRAŇ drží — attack musí útočit touto zbraní. Uprav action_description.
2. **Idle loop kontinuita**: seamless loop — první a poslední frame identické.
3. **Rich prompt konzistence**: self-contained popis (srst, skvrny, hříva, kostěná zbroj, zbraň).
4. **Konzistence zbraní v attack**: gnoll útočí zakřivenou čepelí/oštěpem viditelným na spritu — žádný generic punch. Přizpůsob attack reálné zbrani na spritu.

## Post-processing
- character-id: `gnoll-raider`
- spriteKey: `gnoll_raider`
- displayWidth: ~180
- Download frames → `src/assets/characters/gnoll-raider/frames/`
- Create manifest.json + generate masks
<!-- SECTION:DESCRIPTION:END -->
