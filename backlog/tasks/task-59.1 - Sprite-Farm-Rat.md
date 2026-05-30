---
id: TASK-59.1
title: 'Sprite: Farm Rat'
status: Done
assignee: []
created_date: '2026-05-30 08:01'
updated_date: '2026-05-30 09:36'
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
- **size**: 48
- **proportions**: `{"type": "preset", "name": "stylized"}`
- **detail**: medium detail
- **description**: "Small rat roughly the size of a house cat. Dirty brown-gray fur, unkempt and matted in patches. Long thin hairless pink-gray tail, small rounded ears, beady black eyes. Lean wiry body built for quick scurrying movement. Sharp yellow incisor teeth visible when the mouth opens. Pink clawed feet. Simple natural animal proportions without exaggerated features."

## Idle Animation (south facing / side view, v3, 8 frames)
**action_description**: "A small rat about the size of a house cat with dirty brown-gray fur that is unkempt and matted in patches, standing low to the ground in an alert scavenging posture. Its long thin hairless pink-gray tail trails behind and twitches restlessly. Small rounded ears swivel and flick toward sounds, and beady black eyes dart around scanning for threats and food. The lean wiry body is tensed and ready to scurry at any moment. The whiskers on its pointed snout quiver constantly as the nose sniffs the air with rapid twitches. Pink clawed feet shift the weight subtly from side to side. Occasionally the rat raises its head and the sharp yellow incisor teeth become briefly visible. Every movement is quick, nervous and skittish — the body language of a wary vermin survivor ready to flee or bite. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south facing / side view, v3, 8 frames)
**action_description**: "A small dirty brown-gray rat lunges forward in a quick darting bite attack — it crouches low, then springs toward the target with its body stretched out, mouth opening wide to reveal sharp yellow incisor teeth, snapping its jaws shut on the target before recoiling back into a low scurrying stance. The long thin tail whips for balance during the lunge."

## Pravidla generování animací

> ⚠️ **STOP — schválení base spritu uživatelem**: Po vygenerování base spritu a PŘED jakoukoli animací zobraz sprite uživateli (`get_character`/`get_object` s `include_preview`), popiš ho a POČKEJ na jeho explicitní potvrzení. Bez potvrzení negeneruj idle ani attack. Pokud uživatel sprite zamítne, přegeneruj base sprite a znovu si vyžádej potvrzení.
1. **Pre-check sprite**: Po vytvoření characteru a PŘED animacemi stáhni a zkontroluj base sprite (`get_character`). Ověř reálný tvar těla, ocas, uši, srst, barvy a uprav action_description podle toho.
2. **Idle loop kontinuita**: seamless loop — první a poslední frame identické.
3. **Rich prompt konzistence**: self-contained popis (srst, ocas, zuby, proporce).
4. **Konzistence útoku**: Farm Rat útočí kousnutím (bite lunge) — žádné zbraně, přirozený útok zuby.

## Post-processing
- character-id: `farm-rat`
- spriteKey: `farm_rat`
- displayWidth: ~120
- Download frames → `src/assets/characters/farm-rat/frames/`
- Create manifest.json + generate masks
<!-- SECTION:DESCRIPTION:END -->
