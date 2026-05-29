---
id: TASK-50.2
title: 'Sprite: Orc Warrior'
status: Done
assignee: []
created_date: '2026-05-29 11:51'
updated_date: '2026-05-29 17:42'
labels:
  - sprites
  - pixellab
dependencies: []
parent_task_id: TASK-50
priority: medium
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## PixelLab Character Creation
- **body_type**: humanoid
- **mode**: v3
- **size**: 96
- **proportions**: `{"type": "preset", "name": "heroic"}`
- **detail**: high detail
- **description**: "Large muscular dark green orc warrior in thick scratched metal armor with fur around shoulders. Broad shoulders, massive arms, heavy jaw with large tusks protruding upward. Bald head with small angry eyes. Dented iron chest plate, heavy leather straps, thick boots. Carries a massive two-handed war axe. Battle-scarred skin visible on arms."

## Idle Animation (south, v3, 8 frames)
**action_description**: "A massive dark green orc warrior in battered heavy metal armor standing in an aggressive confrontational wide-legged power stance, barely restraining raw fury. The orc grips a huge war axe with both hands at waist level, corded muscles visibly tensed and bulging across massive arms and broad shoulders. Its heavy jaw is locked in a permanent hateful snarl, large tusks jutting upward, nostrils flaring wide with each heavy snorting breath. The orc shifts its weight forward aggressively, leaning toward the viewer as if on the verge of charging. Scratched and dented iron armor plates clank subtly, fur pelts draped around the shoulders rising and falling with each heavy labored breath. The head makes small predatory tracking movements — sizing up prey with savage intensity. Heavy boots planted wide apart in a dominant power stance that radiates pure territorial aggression and bloodlust."

## Attack Animation (south, v3, 8 frames)
**action_description**: "Massive overhead axe swing — the orc raises its enormous war axe high above its head with both hands, muscles straining, then brings it crashing down in a devastating vertical chop with full body weight behind the blow."

## Post-processing
- character-id: `orc-warrior`
- spriteKey: `orc_warrior`
- displayWidth: ~220
- Download frames → `src/assets/characters/orc-warrior/frames/`
- Create manifest.json
- Generate masks
<!-- SECTION:DESCRIPTION:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Orc Warrior sprite vygenerován přes PixelLab (v3 mode, 96px, heroic proportions).

- Character ID: `25b93650-97c5-4026-9eb2-22b0159e3ca3`
- Idle animace: 9 framů (south), animation ID `0851df30-0396-4803-91ed-72da307447cf`
- Attack animace: 9 framů (south), animation ID `c5cfe6e4-0d72-4f0a-892a-ec9542826501`
- Framy staženy do `src/assets/characters/orc-warrior/frames/` (18 PNG)
- Manifest vytvořen: `src/assets/characters/orc-warrior/manifest.json`
- Zelené masky vygenerovány: `src/assets/characters/orc-warrior/masks/` (18 PNG)
<!-- SECTION:FINAL_SUMMARY:END -->
