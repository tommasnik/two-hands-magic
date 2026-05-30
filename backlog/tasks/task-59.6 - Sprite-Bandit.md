---
id: TASK-59.6
title: 'Sprite: Bandit'
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
- **detail**: medium detail
- **description**: "Human outlaw bandit in practical travel clothing and scavenged armor. Worn brown leather vest reinforced with a few mismatched metal plates, dull cloth sleeves, frayed trousers tucked into scuffed leather boots, and a utility belt with pouches. Face partially hidden by a dark hood and a cloth scarf pulled over the lower face. Holds a short sword in one hand. Rugged, dirty, functional appearance — not military, but a hardened roadside robber."

## Idle Animation (south facing / side view, v3, 8 frames)
**action_description**: "A human outlaw bandit standing in a loose ready combat stance, wearing a worn brown leather vest reinforced with a few mismatched metal plates, dull cloth sleeves, frayed trousers tucked into scuffed leather boots, and a utility belt with hanging pouches. His face is partially hidden by a dark hood and a cloth scarf pulled over the lower face, only narrow watchful eyes showing. He holds a short sword in his right hand, the blade slightly raised and angled, the other hand open and ready. The bandit shifts his weight from foot to foot with shifty, wary body language, the sword tip making small idle movements, the hood and scarf stirring slightly. He glances around as if watching for victims or an ambush. The overall impression is a dangerous, opportunistic roadside robber, tense and ready to strike. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south facing / side view, v3, 8 frames)
**action_description**: "The bandit attacks with a quick diagonal short-sword slash — he draws the short sword back across his body, steps forward, and swings the blade down and across in a fast cutting arc toward the target, the metal blade catching the light, then recovers back into a guarded ready stance with the sword raised. The hood and scarf swing with the motion."

## Pravidla generování animací

> ⚠️ **STOP — schválení base spritu uživatelem**: Po vygenerování base spritu a PŘED jakoukoli animací zobraz sprite uživateli (`get_character`/`get_object` s `include_preview`), popiš ho a POČKEJ na jeho explicitní potvrzení. Bez potvrzení negeneruj idle ani attack. Pokud uživatel sprite zamítne, přegeneruj base sprite a znovu si vyžádej potvrzení.
1. **Pre-check sprite**: stáhni a zkontroluj base sprite (`get_character`). Ověř výstroj, kapuci, šátek a hlavně JAKOU ZBRAŇ skutečně drží — attack musí útočit touto zbraní. Uprav action_description podle reálného vzhledu.
2. **Idle loop kontinuita**: seamless loop — první a poslední frame identické.
3. **Rich prompt konzistence**: self-contained popis (kůže, plát, kapuce, šátek, zbraň).
4. **Konzistence zbraní v attack**: bandit útočí krátkým mečem (short sword) viditelným na spritu — žádný generic punch. Pokud sprite vygeneruje jinou zbraň (axe/crossbow), přizpůsob attack jí.

## Post-processing
- character-id: `bandit`
- spriteKey: `bandit`
- displayWidth: ~150
- Download frames → `src/assets/characters/bandit/frames/`
- Create manifest.json + generate masks
<!-- SECTION:DESCRIPTION:END -->
