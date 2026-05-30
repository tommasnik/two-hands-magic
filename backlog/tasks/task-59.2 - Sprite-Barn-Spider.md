---
id: TASK-59.2
title: 'Sprite: Barn Spider'
status: Done
assignee: []
created_date: '2026-05-30 08:01'
updated_date: '2026-05-30 09:10'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-59
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Creation — ⚠️ DISKUTABILNÍ TVAR, NEJDŘÍV SE ZEPTEJ

Barn Spider má 8 nohou — nemá čistou humanoid/quadruped kostru. **Před generováním se ZEPTEJ uživatele** (`AskUserQuestion`), jakou metodou postupovat (viz CLAUDE.md → "Volba metody generování"):

1. **Skeleton character** — `create_character`, `body_type: quadruped`, template nejblíž (žádný nesedí na 8 nohou); kostra pavoukovi neodpovídá, výsledek bývá horší.
2. **Object** — `create_1_direction_object` → `animate_object`; volnější tvar, lépe sedí na pavouka.
3. **Sada objektů + výběr** (doporučeno) — `create_1_direction_object` v batch módu, uživatel vybere nejlepší base sprite, pak `animate_object`.

Bez odpovědi uživatele negeneruj. Parametry níže (description, prompts) platí pro libovolnou zvolenou metodu.

- **view** (kamera v úrovni očí, čelní pohled — NE top-down): character → `view: "side"`; object → `view: "sidescroller"`
- **mode**: v3 (character) / batch size pro object
- **size**: 64
- **detail**: high detail
- **description**: "Large spider roughly the size of a dog. Dark brown body covered in short coarse bristly hairs. Eight long segmented legs with hooked tips for climbing wood and walls. Multiple small glossy black eyes clustered at the front of the head. Rounded bulbous abdomen with subtle tan markings and a rough textured surface. Sharp dark fangs (chelicerae) at the front of the mouth."

## Idle Animation (south facing / side view, v3, 8 frames)
**action_description**: "A large dog-sized spider with a dark brown body covered in short coarse bristly hairs, crouched low and wide on its eight long segmented legs whose hooked tips grip the ground. Multiple small glossy black eyes are clustered at the front of the head, reflecting faint light. The rounded bulbous abdomen with subtle tan markings and a rough textured surface rises behind the body. The spider makes subtle unsettling movements — individual legs twitch and reposition independently, testing the surface, while the body bobs slightly up and down on the flexing legs. The dark fangs (chelicerae) flex and part occasionally. The bristly hairs catch the light as the abdomen shifts. The overall impression is a patient ambush predator, coiled and alert, every leg ready to spring. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south facing / side view, v3, 8 frames)
**action_description**: "The large brown spider rears up on its back legs, lifting the front of its body and spreading its front legs wide to expose the dark fangs, then lunges forward and downward driving its chelicerae fangs into the target in a venomous bite, before settling back onto all eight legs in a low crouch. The legs scrabble forward during the lunge."

## Pravidla generování animací

> ⚠️ **STOP — schválení base spritu uživatelem**: Po vygenerování base spritu a PŘED jakoukoli animací zobraz sprite uživateli (`get_character`/`get_object` s `include_preview`), popiš ho a POČKEJ na jeho explicitní potvrzení. Bez potvrzení negeneruj idle ani attack. Pokud uživatel sprite zamítne, přegeneruj base sprite a znovu si vyžádej potvrzení.
1. **Pre-check sprite**: stáhni a zkontroluj base sprite (`get_object`/`get_character`). Ověř počet a tvar nohou, oči, abdomen, fangs a uprav action_description.
2. **Idle loop kontinuita**: seamless loop — první a poslední frame identické.
3. **Rich prompt konzistence**: self-contained popis (chlupy, nohy, oči, abdomen, fangs).
4. **Konzistence útoku**: útok je lunge bite fangy (chelicerae) — žádné zbraně.

## Post-processing
- character-id: `barn-spider`
- spriteKey: `barn_spider`
- displayWidth: ~200
- Download frames → `src/assets/characters/barn-spider/frames/`
- Create manifest.json + generate masks
<!-- SECTION:DESCRIPTION:END -->
