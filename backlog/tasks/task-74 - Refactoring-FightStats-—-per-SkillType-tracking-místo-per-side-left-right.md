---
id: TASK-74
title: 'Refactoring: FightStats — per-SkillType tracking místo per-side (left/right)'
status: Done
assignee: []
created_date: '2026-05-31 11:57'
updated_date: '2026-05-31 12:19'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
FightStats je aktuálně `{ left, right }` — dvě pevná pole per-strana. Při layoutu 2+2 (white_shot + ice_crystal vlevo, fireball + lightning_blast vpravo) se ice_crystal a lightning_blast stats tiše agregují pod labelem prvního skilu na straně.

Přeindexovat na `{ skills: Partial<Record<SkillType, SkillFightStats>>, durationMs }` — jeden záznam per unikátní skill v layoutu. Rendering upravit na iterate-over-skills, vejde se i 6 skillů na obrazovku.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 FightStats typ: `{ skills: Partial<Record<SkillType, SkillFightStats>>, durationMs: number }` — žádné left/right
- [x] #2 _initFightStats() iteruje přes _layout a vytvoří jeden záznam per unikátní skillType
- [x] #3 CombatSystem.processHit() indexuje fightStats.skills[skillType] místo fightStats[side]
- [x] #4 PhaseOverlayManager renderuje jeden bar per skill (Object.values(snap.skills)), max 6
- [x] #5 Rendering se vejde na 390×844 i při 6 skillech — kompaktní bary
- [x] #6 Všechny testy procházejí (unit + e2e)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
FightStats přeindexován na `{ skills: Partial<Record<SkillType, SkillFightStats>>, durationMs }`. Lazy init v processHit a CommandProcessor. PhaseOverlayManager iteruje Object.values(snap.skills) — kompaktní bary vejdou až 6 skillů (padding snížen, legend inline). Damage split bar generuje N segmentů. Testy aktualizovány. 1004 unit testů prochází, build OK.
<!-- SECTION:FINAL_SUMMARY:END -->
