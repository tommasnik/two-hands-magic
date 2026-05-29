---
id: TASK-50.4
title: 'Sprite: Mirror Knight'
status: Done
assignee: []
created_date: '2026-05-29 11:51'
updated_date: '2026-05-29 19:28'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Character Creation
- **body_type**: humanoid
- **mode**: v3
- **size**: 64
- **proportions**: `{"type": "preset", "name": "stylized"}`
- **detail**: high detail
- **description**: "Humanoid knight in fully enclosed highly reflective silver armor with mirror-like polished surfaces. Smooth featureless helmet with no visible face. Holds a long elegant sword in right hand and round polished shield in left. Slim but heavily armored silhouette. Clean geometric armor design with bright metallic highlights."

## Idle Animation (south, v3, 8 frames)
**action_description**: "A humanoid knight in fully enclosed highly reflective silver mirror armor standing in a poised elegant guard stance radiating calm disciplined confidence. The smooth featureless helmet shows no face — just polished reflective surface catching ambient light. The right hand holds a long elegant sword at a precise diagonal angle across the body, the left carries a round polished shield held slightly forward in a textbook defensive position. The knight's posture is perfectly balanced with subtle controlled weight shifts — disciplined martial training evident in every micro-movement. Light plays across the mirror-like armor surfaces creating shifting bright highlights that move as the knight breathes. The slim but heavily armored silhouette conveys lethal grace under absolute control. A quiet, confident, calculating presence — like a fencer waiting for the perfect opening with infinite patience. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south, v3, 8 frames)
**action_description**: "Swift precise horizontal sword slash — the knight steps forward with elegant footwork and sweeps the long sword in a clean horizontal arc at chest height, shield braced tight against the body, the motion precise and economical like a trained duelist."

## Pravidla generování animací
1. **Pre-check sprite**: Po vytvoření characteru v PixelLab a PŘED generováním animací: stáhni a zkontroluj base sprite (`get_character`). Ověř jak postava skutečně vypadá (póza, zbraně, detaily, barvy) a uprav `action_description` animací podle reálného vzhledu — ne podle idealizovaného popisu výše.
2. **Idle loop kontinuita**: Idle animace musí tvořit plynulý loop — první a poslední frame musí být vizuálně identické v póze a pozici. Prompt musí explicitně obsahovat instrukci pro seamless loop.
3. **Rich prompt konzistence**: Každý `action_description` musí být self-contained — obsahovat kompletní vizuální popis postavy (materiály, barvy, proporce, zbraně, vybavení), ne jen popis pohybu. PixelLab generuje framy nezávisle, prompt musí nést všechny vizuální informace pro konzistentní výsledek napříč framy.
4. **Konzistence zbraní v attack**: Mirror Knight drží meč a štít — attack animace MUSÍ útočit mečem (ne pěstmi/generic slam). Ověřit vizuálně po pre-checku spritu, že meč a štít jsou na spritu viditelné.

## Post-processing
- character-id: `mirror-knight`
- spriteKey: `mirror_knight`
- displayWidth: ~160
- Download frames → `src/assets/characters/mirror-knight/frames/`
- Create manifest.json
- Generate masks
<!-- SECTION:DESCRIPTION:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Mirror Knight sprite vytvořen v PixelLabu a stažen do `src/assets/characters/mirror-knight/`.

- **Character ID**: `e0f03c4c-acb9-492d-997d-4278839e8c63`
- **Idle animace**: 9 framů (ID: `f7af8754-16c9-408f-ae62-b2f2e89cdc63`), south, v3 mode
- **Attack animace**: 9 framů (ID: `f9c8417e-293a-47bd-b27f-7c2a90f14309`), south, v3 mode
- **Manifest**: `manifest.json` vytvořen (spriteKey: `mirror_knight`, displayWidth: 160)
- **Masky**: 18 zelených auto-generated masek (idle + attack)
- **Pre-check**: sprite vizuálně odpovídá popisu — stříbrný rytíř s uzavřenou helmou, mečem a kulatým štítem
<!-- SECTION:FINAL_SUMMARY:END -->
