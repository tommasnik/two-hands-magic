---
id: TASK-61.2
title: 'TASK-61.2: Ice Crystal freeze mechanic (pure TS)'
status: Done
assignee: []
created_date: '2026-05-30 18:51'
updated_date: '2026-05-30 19:16'
labels:
  - skills
  - combat
  - pure-ts
dependencies:
  - TASK-61.1
references:
  - 'src/game/GameStateMachine.ts:423-440'
  - 'src/game/GameStateMachine.ts:849-856'
  - 'src/game/entities/Enemy.ts:133-140'
  - 'src/game/systems/AnimationController.ts:88-97'
parent_task_id: TASK-61
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled
Implementace freeze status efektu v game logice (src/game/). Analogie existujícího crit stun mechanismu, ale s jiným triggrem a animačním efektem.

## GameState rozšíření
```ts
// src/types/index.ts — GameState
enemyFrozenUntilMs: number  // 0 = not frozen
```

## Herní mechaniky

**Trigger** — při hit eventu od `ice_crystal` skilu:
- CRIT (head) → freeze na `ICE_CRYSTAL_FREEZE_CRIT_MS`
- HIT (torso) → freeze na `ICE_CRYSTAL_FREEZE_HIT_MS`
- GRAZE (legs) → žádný freeze

**Re-hit** — pokud nepřítel je již zmrazený a dostane další ice_crystal hit, timer se resetuje na novou hodnotu (ne přičtení):
```ts
enemy.frozenUntilMs = Math.max(currentFreezeEnd, elapsedMs + newFreezeDuration)
// → efektivně reset, protože new duration >= zbývající čas typicky
```
Ale ve skutečnosti to je jednodušší: `frozenUntilMs = elapsedMs + newFreezeDuration`

**Freeze vs crit stun** — bere max z obou:
```ts
const finalUntil = Math.max(frozenUntilMs, stunnedUntilMs)
// použij max pro rozhodnutí zda runner tickuje
```

**Behavior runner** — stejný path jako stun (`isStunned` check v BehaviorRunner):
```ts
// GameStateMachine._tickBehavior():
const isFrozen = elapsedMs < state.enemyFrozenUntilMs
const isStunned = elapsedMs < _enemyStunnedUntilMs
if (isFrozen || isStunned) {
  // runner.tick() se neprovede
}
```

**Animace** — při freeze zavolej `enemy.holdFrame(currentAnimKey, currentFrameIndex)`. Při odmrazení zavolej `enemy.playAnimation(currentAnimKey)` (nebo nechej runner obnovit přirozený tok).

**In-flight orbs** — pokračují normálně (freeze neovlivňuje DeliverySystem).

## Co je OUT OF SCOPE
- Freeze vizuál (TASK-61.5)
- ice_crystal SkillType definice (TASK-61.1)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 enemyFrozenUntilMs přidáno do GameState + inicializováno na 0
- [x] #2 CRIT ice_crystal hit způsobí freeze 2s, HIT způsobí 1s
- [x] #3 GRAZE ice_crystal hit nezpůsobí freeze
- [x] #4 Behavior runner se neprovede během freeze (žádné nové útoky)
- [x] #5 Animace enemy se zastaví (holdFrame) při freeze
- [x] #6 In-flight orby pokračují i při freeze
- [x] #7 Re-hit resetuje timer (ne přičítá)
- [x] #8 max(freeze, critStun) — delší vyhrává
- [x] #9 npm run test projde
<!-- AC:END -->
