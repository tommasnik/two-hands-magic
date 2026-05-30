---
id: TASK-50.7
title: 'Sprite: Shadow Dancer'
status: To Do
assignee: []
created_date: '2026-05-29 11:52'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Character Creation
- **body_type**: humanoid
- **mode**: v3
- **size**: 48
- **proportions**: `{"type": "preset", "name": "stylized"}`
- **detail**: medium detail
- **description**: "Thin agile humanoid assassin wrapped in dark layered tattered cloth with torn edges blending into shadow. Face hidden behind smooth dark featureless mask. Two short curved blades held in reverse grip. Long narrow limbs in low crouched posture. Dark matte materials with no reflections. Minimal color palette — blacks, dark grays, deep purple hints."

## Idle Animation (south, v3, 8 frames)
**action_description**: "A thin agile humanoid figure wrapped in multiple layers of dark tattered cloth crouching in a low predatory combat-ready stance with coiled lethal tension. Torn fabric edges blur and dissolve into shadow at the extremities, the boundary between cloth and darkness indistinct. The face is hidden behind a smooth dark featureless mask — two faint points of light where eyes might be. Two short curved blades are held in reverse grip close to the body at hip level, their dark matte surfaces catching no light. The figure makes fluid predatory micro-movements — shifting weight with liquid grace between narrow limbs, adjusting balance with the precision of a trained killer. Every aspect of the figure absorbs light. The deep crouch radiates focused lethal intent despite near-stillness — a shadow given form and purpose, a predator frozen at the exact moment before the strike, waiting with infinite murderous patience for the perfect opening. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south, v3, 8 frames)
**action_description**: "Explosive forward dash with rapid double cross-slash — the shadow dancer bursts from its crouch in a blur of dark cloth, both curved blades slashing in a scissor-like X pattern across the target, then vanishes back into a defensive crouch."

## Pravidla generování animací
1. **Pre-check sprite**: Po vytvoření characteru v PixelLab a PŘED generováním animací: stáhni a zkontroluj base sprite (`get_character`). Ověř jak postava skutečně vypadá (póza, zbraně, detaily, barvy) a uprav `action_description` animací podle reálného vzhledu — ne podle idealizovaného popisu výše.
2. **Idle loop kontinuita**: Idle animace musí tvořit plynulý loop — první a poslední frame musí být vizuálně identické v póze a pozici. Prompt musí explicitně obsahovat instrukci pro seamless loop.
3. **Rich prompt konzistence**: Každý `action_description` musí být self-contained — obsahovat kompletní vizuální popis postavy (materiály, barvy, proporce, zbraně, vybavení), ne jen popis pohybu. PixelLab generuje framy nezávisle, prompt musí nést všechny vizuální informace pro konzistentní výsledek napříč framy.
4. **Konzistence zbraní v attack**: Shadow Dancer drží dva krátké zakřivené čepele v reverse gripu — attack animace MUSÍ útočit těmito čepelemi (ne pěstmi/kopáním). Ověřit vizuálně po pre-checku spritu, že čepele jsou viditelné.

## Post-processing
- character-id: `shadow-dancer`
- spriteKey: `shadow_dancer`
- displayWidth: ~130
- Download frames → `src/assets/characters/shadow-dancer/frames/`
- Create manifest.json
- Generate masks
<!-- SECTION:DESCRIPTION:END -->
