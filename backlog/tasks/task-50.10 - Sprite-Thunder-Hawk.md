---
id: TASK-50.10
title: 'Sprite: Thunder Hawk'
status: To Do
assignee: []
created_date: '2026-05-29 11:52'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Creation — OBJECT (not character)
Thunder Hawk je pták — nemá humanoid/quadruped template. Preferovat `create_1_direction_object` (south only).
Pokud object nepodporuje animace, zkusit humanoid s popisem ptáka (PixelLab to někdy zvládne).

- **Fallback body_type**: humanoid
- **mode**: v3
- **size**: 64
- **detail**: high detail
- **description**: "Large predatory bird with dark blue-black feathers and wide wingspan. Wing feather tips glow pale white-blue. Bright electric blue glowing eyes. Small electrical arcs crackling across feathers. Sharp metallic-looking talons and hooked beak. Perched hunting stance with wings slightly raised."

## Idle Animation (south, v3, 8 frames)
**action_description**: "A large predatory bird with dark blue-black plumage perched in an alert elevated hunting stance, wings folded but slightly raised showing pale glowing white-blue edges on the flight feathers. Bright electric blue eyes stare forward with intense raptor focus. Small arcs and sparks of electricity crackle spontaneously across the feathers in random patterns, briefly illuminating patches of dark plumage with blue-white light. Sharp metallic-looking talons grip firmly, each talon tip glinting with faint electrical charge. The hooked beak is slightly parted. The hawk makes quick precise bird-like head movements — sharp tilts and turns scanning for prey with predatory efficiency. Feathers ruffle and stand on end occasionally from static discharge buildup. The overall impression is a living thunderstorm perched and compressed into avian form — crackling with barely contained electrical energy, alert and ready to unleash it. The animation forms a seamless loop — the first and last frames are visually identical in pose and position."

## Attack Animation (south, v3, 8 frames)
**action_description**: "Diving attack with electrified talons — the thunder hawk spreads its wings wide revealing glowing edges, electrical arcs intensifying across the entire body, then dives forward with talons extended and crackling with bright electrical discharge."

## Pravidla generování animací
1. **Pre-check sprite**: Po vytvoření objektu v PixelLab a PŘED generováním animací: stáhni a zkontroluj base sprite (`get_object`/`get_character`). Ověř jak pták skutečně vypadá (tvar křídel, pařáty, zobák, barvy) a uprav `action_description` animací podle reálného vzhledu.
2. **Idle loop kontinuita**: Idle animace musí tvořit plynulý loop — první a poslední frame musí být vizuálně identické v póze a pozici. Prompt musí explicitně obsahovat instrukci pro seamless loop.
3. **Rich prompt konzistence**: Každý `action_description` musí být self-contained — obsahovat kompletní vizuální popis (peří, barvy, elektrické výboje, pařáty, zobák), ne jen popis pohybu. PixelLab generuje framy nezávisle, prompt musí nést všechny vizuální informace.
4. **Konzistence útoku**: Thunder Hawk útočí elektrizovanými pařáty v dive útoku. Ověřit po pre-checku, že pařáty a elektrické efekty jsou na spritu viditelné a attack odpovídá reálnému tvaru.

## Post-processing
- character-id: `thunder-hawk`
- spriteKey: `thunder_hawk`
- displayWidth: ~170
- Download frames → `src/assets/characters/thunder-hawk/frames/`
- Create manifest.json
- Generate masks
- **Poznámka**: V manifestu `"type": "object"` pokud vytvořeno jako object
<!-- SECTION:DESCRIPTION:END -->
