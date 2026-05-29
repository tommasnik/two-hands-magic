---
id: TASK-50.1
title: 'Sprite: Goblin Scout'
status: Done
assignee: []
created_date: '2026-05-29 11:50'
updated_date: '2026-05-29 16:54'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Character Creation
- **body_type**: humanoid
- **mode**: v3
- **size**: 48
- **proportions**: `{"type": "custom", "head_size": 1.3, "arms_length": 1.2, "legs_length": 0.8, "shoulder_width": 0.7, "hip_width": 0.7}`
- **detail**: medium detail
- **description**: "Small green-gray goblin scout in mismatched stitched leather armor. Thin body with long arms and slightly hunched posture. Large pointed ears, narrow yellow eyes, flat nose. Small backpack with rope straps, pouches, and several rusty knives on belt. Carries a short bow on back and crude dagger at hip. Barefoot with dirt-stained scratched skin."

## Idle Animation (south, v3, 8 frames)
**action_description**: "A small green-gray goblin scout in mismatched leather armor standing in a nervous fidgeting ready stance, shifting weight between bare feet anxiously. One clawed hand rests on a rusty dagger at its belt while the other hand twitches near a crude short bow slung on its back. Its large pointed ears twitch and rotate alertly, narrow yellow eyes darting left and right with suspicious paranoid vigilance. The hunched posture radiates cowardly readiness — poised to either strike or flee at any moment. Small pouches and rope straps sway slightly with each nervous shuffle. Breathing is quick and shallow, the creature in a perpetual state of twitchy anxious aggression, like a cornered rat sizing up whether to bite or run."

## Attack Animation (south, v3, 8 frames)
**action_description**: "Quick lunging forward dagger slash — the goblin springs from its crouch with surprising speed, jabbing its rusty dagger forward in a vicious stabbing motion before scrambling back to safety."

## Post-processing
- character-id: `goblin-scout`
- spriteKey: `goblin_scout`
- displayWidth: ~120
- Download frames → `src/assets/characters/goblin-scout/frames/`
- Create manifest.json
- Generate masks: `python3 scripts/generate_masks.py src/assets/characters/goblin-scout`
<!-- SECTION:DESCRIPTION:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Goblin Scout sprite vytvořen v PixelLabu a integrován do asset pipeline.

- **PixelLab character ID**: `fd1577fb-d4a3-481a-8c02-8ccc377d067a`
- **Idle animace**: 9 framů (south, v3) — animationId `661a0bdd-d565-491d-8f29-89a17a435680`
- **Attack animace**: 9 framů (south, v3) — animationId `dfcd7819-50ca-4d95-8785-d955d04e3cf8`
- **Framy**: `src/assets/characters/goblin-scout/frames/` (18 PNG, idle_00–08 + attack_00–08)
- **Masky**: `src/assets/characters/goblin-scout/masks/` (18 zelených auto-generated masek)
- **Manifest**: `src/assets/characters/goblin-scout/manifest.json` (spriteKey: `goblin_scout`, displayWidth: 120)
<!-- SECTION:FINAL_SUMMARY:END -->
