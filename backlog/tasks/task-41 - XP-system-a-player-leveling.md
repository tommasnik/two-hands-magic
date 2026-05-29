---
id: TASK-41
title: 'XP systém a player leveling'
status: Done
assignee: []
created_date: '2026-05-22'
labels:
  - game-logic
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementovat XP systém a player leveling jako základ pro upgrade strom (task-42+).

### Pravidla levelování

Enemy kill → hráč dostane XP (1 XP per kill). Thresholds:

| Player level | Celkem zabitých |
|---|---|
| 1 | start |
| 2 | 1 |
| 3 | 3 |
| 4 | 6 |
| 5 | 11 |
| 6 | 18 (konec runu) |

→ 5 level-upů za run, každý spustí upgrade pick screen.

### Změny typů (`types/index.ts`)

```typescript
// přidat do GameState
playerXp: number        // 0 na začátku, +1 per kill
playerLevel: number     // 1 na začátku, max 6
pendingLevelUp: boolean // true = stoj a čekej na upgrade pick
```

### Logika (`GameStateMachine.ts`)

- Po každém enemy kill: `playerXp += 1`
- Zkontrolovat `XP_LEVEL_THRESHOLDS[playerLevel]` — pokud `playerXp >= threshold`, zvýšit `playerLevel` a nastavit `pendingLevelUp = true`
- Dokud `pendingLevelUp === true`, přeskočit enemy spawn / pozastavit battle fázi
- `confirmLevelUpUpgrade(nodeId: UpgradeNodeId)` command — přijmout pick, nastavit `pendingLevelUp = false`

### Konstanty (`constants.ts`)

```typescript
export const XP_LEVEL_THRESHOLDS: Record<number, number> = {
  2: 1,
  3: 3,
  4: 6,
  5: 11,
  6: 18,
}
```

## Game Design testy

Tento task mění progression tempo — leveling pace určuje celkový herní zážitek.

Scénáře k otestování (`src/tests/game-design/playerLeveling.spec.ts`):
- **Gate test**: při `playerXp === threshold - 1` hráč je stále na aktuálním levelu; po dalším killu level skočí přesně o 1
- **Plný run**: 18 killů → `playerLevel === 6` — bez skoku nebo mezilevelů
- **Blokace**: při `pendingLevelUp === true` simulovat game tick → enemy se nespawnuje, battle se nepohne
- **Rychlý hráč (5 killů/min)**: dosáhne level 6 za ~3.6 min = `18 / 5 * 60 s` — číslo odvozeno od `XP_LEVEL_THRESHOLDS`
- Všechna čísla odvozena od `XP_LEVEL_THRESHOLDS` z `constants.ts`, bez hardcoded hodnot
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Po prvním enemy kill přejde `playerLevel` na 2 a `pendingLevelUp` na `true`
- [x] #2 Po 3 killech: level 3, po 6: level 4, po 11: level 5, po 18: level 6
- [x] #3 `pendingLevelUp` blokuje herní logiku (žádný nový enemy spawn) dokud se neschválí pick
- [x] #4 Unit testy v `GameStateMachine.test.ts`: simulovat sekvenci killů, ověřit správné levely
- [x] #5 Game design testy v `playerLeveling.spec.ts` procházejí (`npm run test:design`)
<!-- AC:END -->
