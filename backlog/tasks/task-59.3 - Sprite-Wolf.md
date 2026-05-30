---
id: TASK-59.3
title: 'Sprite: Wolf'
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
- **description**: "Medium-sized gray wolf with a lean athletic build. Thick fur in mixed shades of gray, brown and white, layered and slightly shaggy. Narrow muzzle, pointed erect ears, sharp amber eyes. Long bushy tail and powerful lean legs built for running. Visible muscle definition beneath the fur. Natural realistic wolf proportions, alert predatory posture."

## Idle Animation (south facing / side view, v3, 8 frames)
**action_description**: "A medium-sized gray wolf with a lean athletic build, its thick layered fur in mixed shades of gray, brown and white, standing in an alert four-legged predatory stance. The narrow muzzle is lowered slightly and sharp amber eyes stare forward with focused intensity. Pointed erect ears swivel and twitch toward distant sounds. The long bushy tail hangs low and sways gently. The wolf breathes steadily, its ribcage and shoulders rising and falling, visible muscle definition rippling beneath the fur. It shifts weight subtly between its powerful lean legs and occasionally tilts its head, the jaws parting to reveal a hint of teeth and a lolling tongue. The overall impression is a calm but coiled hunter, patient and ready to break into a sprint. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south facing / side view, v3, 8 frames)
**action_description**: "The gray wolf lunges forward in a pouncing bite attack — it drops its front low, then springs off its powerful hind legs toward the target, jaws opening wide to bare its fangs, snapping down on the target with a savage bite, then landing and recoiling back into a low predatory crouch. Ears flatten back and tail extends during the lunge."

## Pravidla generování animací

> ⚠️ **STOP — schválení base spritu uživatelem**: Po vygenerování base spritu a PŘED jakoukoli animací zobraz sprite uživateli (`get_character`/`get_object` s `include_preview`), popiš ho a POČKEJ na jeho explicitní potvrzení. Bez potvrzení negeneruj idle ani attack. Pokud uživatel sprite zamítne, přegeneruj base sprite a znovu si vyžádej potvrzení.
1. **Pre-check sprite**: stáhni a zkontroluj base sprite (`get_character`). Ověř tvar těla, srst, ocas, uši, barvy a uprav action_description.
2. **Idle loop kontinuita**: seamless loop — první a poslední frame identické.
3. **Rich prompt konzistence**: self-contained popis (srst, barvy, svaly, ocas, oči).
4. **Konzistence útoku**: útok je pounce + bite — žádné zbraně, přirozený útok tlamou.

## Post-processing
- character-id: `wolf`
- spriteKey: `wolf`
- displayWidth: ~210
- Download frames → `src/assets/characters/wolf/frames/`
- Create manifest.json + generate masks
<!-- SECTION:DESCRIPTION:END -->
