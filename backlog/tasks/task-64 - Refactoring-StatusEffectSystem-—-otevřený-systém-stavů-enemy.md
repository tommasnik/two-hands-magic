---
id: TASK-64
title: 'Refactoring: StatusEffectSystem — otevřený systém stavů enemy'
status: Done
assignee: []
created_date: '2026-05-30 22:28'
updated_date: '2026-05-30 23:12'
labels:
  - refactoring
dependencies:
  - TASK-63
references:
  - DependencyMap.md#4.1
  - DependencyMap.md#4.2
  - GameDesign.md#5
documentation:
  - DependencyMap.md
  - GameDesign.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Před implementací přečti
`GameDesign.md` §5 (skill interakce, principy) a `DependencyMap.md` §4.1–4.2.
Tento task navazuje na TASK-63 — `StatusApplier` interface a `InteractionRule` typ jsou definovány tam.

## Přehled
Freeze je dnes implementovaný inline v GameStateMachine. Přibydou další statusy (stun, cursed, slowed, …). Cíl: systém kde přidání nového statusu = nová `StatusEffect` definice, žádný zásah do GSM ani do existujících skillů.

## Datová struktura
```ts
interface StatusEffect {
  kind: string              // 'frozen' | 'stunned' | 'cursed' | 'slowed' | …
  remainingMs: number
  incomingDamageMultiplier?: number  // 1.0 = žádná změna
  moveSpeedMultiplier?: number        // 1.0 = žádná změna
  frozen?: boolean                   // zastaví útok i pohyb
  visualKey?: string                 // čistá data pro renderer
}
```

`EnemyState` dostane pole `activeStatusEffects: StatusEffect[]`.

## StatusEffectSystem (pure TS)
```ts
class StatusEffectSystem {
  apply(enemy: EnemyState, effect: StatusEffect): void
    // buď refresh (delší z obou) nebo stack — per-kind definice v konstantách
  tick(dt: number, enemy: EnemyState): void
    // odečte remainingMs, odstraní expirované
  isActive(enemy: EnemyState, kind: string): boolean
}
```

## Zapojení do GameStateMachine
GSM nahradí no-op stub z TASK-63 reálným callbackem:
```ts
// TASK-63 mělo: const applyStatus = (_e) => {}
// TASK-64 nahradí za:
const applyStatus: StatusApplier = (effect) => this.statusEffectSystem.apply(this.enemy, effect)
skill.onHit(this.enemy, hit, applyStatus)
```
Tím se `ice_crystal.onHit` (kód z TASK-63) stane funkčním bez jakékoliv změny v ice-crystal modulu.

## Interaction rules — resolveHit (OCP, bez switch/case)
```ts
// Čistá funkce, žádný import SkillType, žádný if na konkrétní skill:
function resolveHit(skill: SkillModule, enemy: EnemyState, baseResolution: HitResolution): HitResolution {
  const rule = skill.interactions?.find(
    r => enemy.activeStatusEffects.some(e => e.kind === r.whenEnemyHas)
  )
  if (!rule) return baseResolution
  return {
    ...baseResolution,
    damage: baseResolution.damage * (rule.damageMultiplier ?? 1.0),
    visualKey: rule.visualKey ?? baseResolution.visualKey,
  }
}
```
Přidání nové interakce = přidat `InteractionRule` do skill modulu, nula změn jinde.

## Stávající freeze logika
Vše co je dnes v GSM pod `if (frozen)` / `freezeTimer` se přesune do StatusEffectSystem.

## Co je OUT OF SCOPE
- Grafika statusů na enemy sprite (jen visualKey jako data)
- Stun napojení na EnemyBehaviorRunner (runner má vlastní stun freeze — propojení je samostatné)
- Cursed, slowed — StatusEffect definice existují, efekty (moveSpeedMultiplier apod.) se uplatní až systém používá
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 EnemyState má activeStatusEffects: StatusEffect[]
- [x] #2 Freeze logika je zcela přesunuta z GameStateMachine do StatusEffectSystem
- [x] #3 GSM neobsahuje žádné přímé if (frozen) / freezeTimer — jen volá statusEffectSystem.tick()
- [x] #4 Přidání nového statusu = nová StatusEffect definice + InteractionRule v skill modulu, 0 změn v GSM
- [x] #5 resolveHit() neobsahuje žádný switch/case ani podmínku na SkillType
- [x] #6 Ice crystal + lightning interakce funguje (bonus damage při frozen enemy)
- [x] #7 npm run test prochází, coverage 100 % na src/game/**
- [x] #8 npm run test:e2e prochází beze změn
<!-- AC:END -->
