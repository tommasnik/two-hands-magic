---
id: TASK-61.3
title: 'TASK-61.3: Lightning Blast instant hit (pure TS)'
status: In Progress
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
  - src/game/GameStateMachine.ts
  - 'src/game/systems/DamageSystem.ts:84-102'
  - 'src/game/entities/Enemy.ts:153-226'
parent_task_id: TASK-61
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled
Lightning Blast je instant hit — nevytváří projektil s flight time. Damage padá ve chvíli "release" (player pustí prst).

## Herní mechaniky

**Instant delivery** — při `lightning_blast` skill release:
1. Okamžitě resolve hit zone (stejná mask detection jako projektily)
2. Aplikuj damage (stejný DamageSystem.calculateDamage)
3. Vyem `lightningDischargeUntilMs` do GameState pro vizuální vrstvu
4. **Žádný Projectile objekt se nevytváří**

## GameState rozšíření
```ts
// src/types/index.ts — GameState
lightningDischargeUntilMs: number  // 0 = no active discharge
lightningDischargeResult: HitResult | null  // pro délku vizuálu
lightningDischargeTarget: { x: number; y: number } | null  // target point pro render
```

## Implementace v GameStateMachine

Nová větev v `_handleSkillRelease()` nebo ekvivalentním místě:
```ts
if (skill === 'lightning_blast') {
  const hitResult = enemy.getHitResult(targetPoint, ...)
  const damage = DamageSystem.calculateDamage('lightning_blast', hitResult, chainBonus, rng)
  enemy.takeDamage(damage)
  const duration = LIGHTNING_DISCHARGE_DURATION[hitResult]  // lookup tabulka z konstant
  state.lightningDischargeUntilMs = elapsedMs + duration
  state.lightningDischargeResult = hitResult
  state.lightningDischargeTarget = targetPoint
  // žádný ProjectileSystem.fire()
  return
}
```

## Co je OUT OF SCOPE
- Vizuál blesku (TASK-61.6)
- SkillType definice (TASK-61.1)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 lightning_blast nevytváří žádný Projectile objekt
- [ ] #2 Damage se aplikuje okamžitě na release
- [ ] #3 lightningDischargeUntilMs, lightningDischargeResult, lightningDischargeTarget přidány do GameState
- [ ] #4 CRIT hit nastaví discharge na 600ms, HIT na 300ms, GRAZE na 150ms
- [ ] #5 GRAZE dává 60% damage (standardní GRAZE multiplier)
- [ ] #6 npm run test projde
<!-- AC:END -->
