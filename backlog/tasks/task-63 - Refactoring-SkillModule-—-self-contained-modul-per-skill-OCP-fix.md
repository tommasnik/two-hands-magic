---
id: TASK-63
title: 'Refactoring: SkillModule — self-contained modul per skill (OCP fix)'
status: Done
assignee: []
created_date: '2026-05-30 22:28'
updated_date: '2026-05-30 23:04'
labels:
  - refactoring
dependencies:
  - TASK-62
references:
  - DependencyMap.md#2.1
  - GameDesign.md#10.1
documentation:
  - DependencyMap.md
  - GameDesign.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Před implementací přečti
`GameDesign.md` §10.1 (SkillModule cílová struktura) a `DependencyMap.md` §2.1 (závislosti SkillModule).

## Přehled
Přidání nového skillu dnes vyžaduje změny na 4+ místech (SkillType union, DamageSystem, GameStateMachine, renderer). OCP je mrtvé. Cíl: každý skill = jeden self-contained modul. Přidání nového skillu = nová složka + registrace, žádné změny ve stávajících systémech.

## Cílová struktura
```
src/game/skills/
  types.ts            ← SkillModule interface, StatusApplier type, InteractionRule
  registry.ts         ← SkillRegistry: Map<SkillType, SkillModule>, registerSkill()
  fireball/index.ts
  ice-crystal/index.ts
  lightning-blast/index.ts
  white-shot/index.ts
```

## SkillModule interface
```ts
/** Callback pro aplikaci status efektu na enemy. Implementaci dodá StatusEffectSystem (TASK-64). */
type StatusApplier = (effect: StatusEffect) => void

interface InteractionRule {
  /** Jaký aktivní status enemy toto pravidlo spustí. */
  whenEnemyHas: string
  damageMultiplier?: number
  additionalStatus?: StatusEffect
  visualKey?: string
}

interface SkillModule {
  type: SkillType
  damageMin: number
  damageMax: number
  castTimePeriodMs: number
  visualKey: string
  /** Efekt při zásahu. applyStatus = callback dodaný systémem; v TASK-63 je stub (no-op). */
  onHit?: (enemy: EnemyState, hit: HitResult, applyStatus: StatusApplier) => void
  /** Pravidla interakce se statusy enemy — čistá data, žádný switch/case. */
  interactions?: InteractionRule[]
}
```

### Chicken-and-egg: onHit vs StatusEffectSystem
StatusEffectSystem vznikne až v TASK-64. Proto:
- V TASK-63 je `applyStatus` parametr přítomen v rozhraní, ale `GameStateMachine` předává **no-op stub**: `(_effect) => {}`
- `ice_crystal.onHit` volá `applyStatus({ kind: 'frozen', remainingMs: ICE_CRYSTAL_FREEZE_MS })` — kód je správný, jen efekt zatím nenastane
- TASK-64 nahradí no-op stub reálným `StatusEffectSystem.apply()`

### SkillType union
`SkillType` zůstává jako union v `types/index.ts` — používá ho `SkillModule.type` a `SkillRegistry`. Neodstraňuje se.

## Refaktoring systémů
- `DamageSystem`: místo switch/case čte `SkillRegistry.get(skillType).damageMin/damageMax`
- `GameStateMachine`: po zásahu volá `skill.onHit(enemy, hit, noOpApplyStatus)` — žádný branching
- `ProjectileSystem`: čte `skill.visualKey` — žádný switch

## Co je OUT OF SCOPE
- Cooldown systém
- Reálná implementace StatusEffectSystem (TASK-64)
- Žádné nové skilly
- Interakční pravidla lightning+frozen (definice v modulech, efekt až TASK-64)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Každý aktivní skill má vlastní soubor v src/game/skills/
- [x] #2 DamageSystem neobsahuje žádný switch/case ani if/else větvení na SkillType
- [x] #3 GameStateMachine neobsahuje skill-specific logiku v _applyHit — jen volá skill.onHit() s StatusApplier bridge
- [x] #4 Přidání nového skillu = nový soubor + registerSkill(), 0 změn ve stávajících systémech
- [x] #5 ice_crystal.onHit volá applyStatus({ kind: 'frozen', ... }) — rozhraní je správné, freeze funguje přes TASK-63 bridge
- [x] #6 npm run test prochází, coverage 100 % na src/game/**
- [x] #7 npm run test:e2e prochází beze změn
<!-- AC:END -->
