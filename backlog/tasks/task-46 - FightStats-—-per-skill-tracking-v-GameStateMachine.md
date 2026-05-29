---
id: TASK-46
title: FightStats — per-skill tracking v GameStateMachine
status: Done
assignee: []
created_date: '2026-05-27 11:22'
updated_date: '2026-05-27 13:15'
labels:
  - two-hands-magic
  - game-logic
  - data-layer
dependencies: []
references:
  - src/types/index.ts
  - src/game/GameStateMachine.ts
  - src/game/systems/DamageSystem.ts
  - src/game/systems/InputManager.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Přidat sledování statistik per skill slot do GameStateMachine. Aktuálně `GameState.score` sleduje pouze globální součty — žádné per-skill data neexistují.

## Co přidat

### Nový typ `FightStats` do `src/types/index.ts`
```ts
export interface SkillFightStats {
  skillType: SkillType
  fireCount: number                          // kolikrát byl skill vystřelen
  hitsByResult: Record<HitResult, number>    // crit/normal/graze/miss počty
  totalDamage: number                        // součet všech dealnutých dmg
  touchGaps: number[]                        // ms mezi touch-up a dalším touch-down na stejném slotu
  // Poznámka: až přijde cooldown, idle = touchGap - cooldownMs (počítá se při zobrazení, ne zde)
}

export interface FightStats {
  left: SkillFightStats
  right: SkillFightStats
  durationMs: number  // délka souboje
}
```

### Změny v `GameStateMachine`
- Přidat `fightStats: FightStats` do interního stavu, inicializovat v konstruktoru
- Exponovat přes `GameState` (readonly)
- V `_applyHit()`: přičíst do `hitsByResult` a `totalDamage` pro odpovídající slot
- V `InputManager` nebo `GameStateMachine`: zaznamenat timestamp touch-up, při dalším touch-down na stejném slotu spočítat gap a uložit do `touchGaps`
- `nextLevel()`: reset `fightStats` na nové prázdné hodnoty
- `restartGame()`: totéž

### Kde sledovat touch timestamps
Zvážit přidání `lastTouchUpMs: { left: number | null, right: number | null }` do interního stavu GSM. Při každém `InputCommand` typu `fire` (touch-down) vypočítat gap od předchozího touch-up.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 FightStats typ existuje v src/types/index.ts
- [x] #2 GameState.fightStats je dostupné jako readonly
- [x] #3 hitsByResult se správně inkrementuje pro každý hit v _applyHit()
- [x] #4 totalDamage odpovídá součtu skutečných dmg hodnot (po multiplierech)
- [x] #5 touchGaps obsahuje realistické mezery v ms mezi consecutive fires
- [x] #6 fightStats se resetuje při nextLevel() i restartGame()
- [x] #7 Unit testy pokrývají inkrementaci per-skill stats
<!-- AC:END -->
