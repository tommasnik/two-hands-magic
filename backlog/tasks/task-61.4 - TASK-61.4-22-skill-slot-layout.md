---
id: TASK-61.4
title: 'TASK-61.4: 2+2 skill slot layout'
status: To Do
assignee: []
created_date: '2026-05-30 18:51'
labels:
  - skills
  - layout
  - ui
dependencies:
  - TASK-61.1
references:
  - 'src/game/constants.ts:281-298'
  - 'src/game/systems/touchPoints.ts:155-212'
parent_task_id: TASK-61
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled
Rekonfigurace DEFAULT_SKILL_CONFIG na 4 sloty (2 na každé straně). Infrastruktura pro dynamic layout existuje a podporuje 1–3 sloty na stranu — stačí jen změnit konfiguraci.

## Změna konfigurace (src/game/constants.ts)

```ts
export const DEFAULT_SKILL_CONFIG: readonly SkillSlotConfig[] = [
  { skillType: 'white_shot',      side: 'left',  slotIndex: 0 },  // levý dolní roh
  { skillType: 'ice_crystal',     side: 'left',  slotIndex: 1 },  // levý, výše
  { skillType: 'fireball',        side: 'right', slotIndex: 0 },  // pravý dolní roh
  { skillType: 'lightning_blast', side: 'right', slotIndex: 1 },  // pravý, výše
]
```

## Herní mechaniky
- Arc interpolace pro 2 sloty na stranu: slotIndex 0 = arc min (22°), slotIndex 1 = arc max (78°)
- Pozice se automaticky vypočítají přes `generateTouchPointLayout()` — žádná ruční úprava
- Player aktivuje slot y-pozicí dotyku (inferovaně z arc pozic)

## Ověření
- Spusť dev server, ověř že se 4 touch pointy zobrazí na správných pozicích
- Oba sloty na každé straně musí být dostatečně daleko od sebe pro pohodlné ovládání prstem

## Co je OUT OF SCOPE
- Skill selection menu / loadout systém
- Vizuální labeling slotů na obrazovce
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 DEFAULT_SKILL_CONFIG má 4 záznamy (white_shot, ice_crystal, fireball, lightning_blast)
- [ ] #2 generateTouchPointLayout() vrátí 4 pozice bez erroru
- [ ] #3 Touch pointy se zobrazí na správných místech v dev serveru
- [ ] #4 Každý slot funguje nezávisle (firing ice_crystal nespustí white_shot)
<!-- AC:END -->
