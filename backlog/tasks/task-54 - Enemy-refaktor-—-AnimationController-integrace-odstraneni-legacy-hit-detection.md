---
id: TASK-54
title: >-
  Enemy refaktor — AnimationController integrace, odstraneni legacy hit
  detection
status: In Progress
assignee:
  - '@agent'
created_date: '2026-05-29 12:03'
updated_date: '2026-05-29 12:31'
labels:
  - game-logic
  - refactor
milestone: m-0
dependencies:
  - TASK-51
  - TASK-53
references:
  - src/game/entities/Enemy.ts — aktualni enemy s legacy hit detection
  - src/game/GameStateMachine.ts — game loop a enemy management
  - src/types/index.ts — EnemyDef a HitZoneLayout typy
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Prehled

Refaktor Enemy entity a GameStateMachine: integrace AnimationControlleru, odstraneni legacy 6-part body hit detection a hitZoneLayout fallbacku. Enemy pouziva vyhradne mask-based hit detection.

## Aktualni stav Enemy.ts

Enemy ma dva hit detection mody:
1. **Mask-based** — pres MaskHitDetector (spriteKey + animKey + frameIndex)
2. **hitZoneLayout** — 3-circle model (crit/mid/low) jako fallback pro enemy bez masek
3. **Legacy 6-part body** — head circle, torso rect, 2 arms, 2 legs (backward-compat kdyz hitZoneLayout undefined)

`_resolveZone()` resi prioritu: mask → hitZoneLayout → legacy body.

## Zmeny

### Enemy dostane AnimationController

```ts
class Enemy {
  private _animController: AnimationController
  private _spriteKey: string

  constructor(x, y, spriteKey, animController, maskDetector, displayWidth, displayHeight)

  // Delegace na AnimationController
  get animKey(): string { return this._animController.currentAnimKey }
  get frameIndex(): number { return this._animController.currentFrameIndex }
  playAnimation(key: string): void { this._animController.play(key) }
  updateAnimation(dtMs: number): void { this._animController.update(dtMs) }
}
```

### Odstraneni legacy hit detection

- Smazat legacy 6-part body geometry (head, torso, arms, legs circles/rects)
- Smazat hitZoneLayout 3-circle fallback
- `_resolveZone()` pouziva JEN MaskHitDetector. Pokud maska neexistuje pro dany frame → 'none' (miss)
- `_resolveZoneFromMask()` upraven: pouziva `spriteKey` z Enemy instance

### GameStateMachine zmeny

- GSM vlastni AnimationController per enemy (vytvori ho z CharacterRegistry.getAnimationDefs())
- GSM.update() vola `enemy.updateAnimation(dt)`
- Kdyz GSM spawnuje missile → `enemy.playAnimation('attack')`
- GSM exponuje animacni stav v GameState (enemyAnimKey, enemyFrameIndex) — uz existuje, jen se zmeni zdroj

### Novy minimalni EnemyDef

```ts
interface EnemyDef {
  name: string
  manifestId: string      // character-id z manifest.json
  maxHp: number
  critZoneScale: number
  attacks?: AttackDef[]
}
```

Vizualni data (displayWidth, animations, masks) se ctou z CharacterRegistry podle manifestId.

## Co je OUT OF SCOPE

- BattleScene rendering (task 5)
- Smazani starych EnemyDef konstant (task 6)
- Game design testy (task 7)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Enemy constructor prijima spriteKey + AnimationController + MaskHitDetector
- [x] #2 Legacy 6-part body hit detection smazana z Enemy.ts
- [x] #3 hitZoneLayout 3-circle fallback smazan z Enemy.ts
- [x] #4 Hit detection pouziva vyhradne MaskHitDetector s spriteKey:animKey:frameIndex
- [x] #5 GameStateMachine vytvari AnimationController per enemy z CharacterRegistry
- [x] #6 GSM.update() posouva animaci, GSM spawnuje missile → play('attack')
- [ ] #7 EnemyDef zjednoduseny: name, manifestId, maxHp, critZoneScale, attacks — TASK-56
- [x] #8 GameState.enemyAnimKey a enemyFrameIndex odrazuji stav AnimationControlleru
- [x] #9 Unit testy v src/tests/unit/enemy.test.ts aktualizovany — testovani s mock MaskHitDetector, zadne legacy body testy
- [ ] #10 grep -r 'hitZoneLayout' src/game/ vraci prazdny vysledek — TASK-56
<!-- AC:END -->
