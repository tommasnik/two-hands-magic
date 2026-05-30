---
id: TASK-60.1
title: Attack framework — typy & odstranění starého attack modelu
status: In Progress
assignee: []
created_date: '2026-05-30 12:41'
updated_date: '2026-05-30 12:53'
labels: []
dependencies: []
documentation:
  - EnemyAttacks.md
parent_task_id: TASK-60
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Základ frameworku: definovat všechny datové typy state-graphu a delivery modelu v `src/types/index.ts` a odstranit starý bezstavový attack model. Žádná runtime logika v tomto tasku — jen typy + čistka. Kontrakt typů viz EnemyAttacks.md §3–4.

Nové typy: `BehaviorGraph`, `BehaviorNode`, `Edge`, `ExitTrigger`, `Guard`, `AttackSpec` (s `kind: 'orb' | 'overlay' | 'effect'`). `EnemyDef` dostane pole `behaviorGraph?: BehaviorGraph`.

Odstranění: `EnemyAttackDef` typ a `EnemyDef.attacks`. Pozor — `EnemyAttackSystem` a jeho použití v `GameStateMachine` na tom závisí; tento task smí dočasně nechat `EnemyAttackSystem` kompilovatelný (např. zúžit na delivery mechaniku) NEBO koordinovat s navazujícími tasky. Cíl: `npm run build` (tsc) projde po celém parentu; v rámci tohoto tasku stačí typy zavedené a `attacks[]` pryč z typů.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Nové typy BehaviorGraph, BehaviorNode, Edge, ExitTrigger, Guard, AttackSpec existují v src/types/index.ts a odpovídají kontraktu v EnemyAttacks.md §3–4 (každý s JSDoc)
- [ ] #2 AttackSpec.kind pokrývá 'orb' | 'overlay' | 'effect'; delivery nese pouze visualKey: string (žádný Phaser/render detail)
- [ ] #3 EnemyDef má volitelné pole behaviorGraph?: BehaviorGraph
- [ ] #4 Typ EnemyAttackDef a pole EnemyDef.attacks jsou odstraněny z src/types
- [ ] #5 npm run build (tsc) prochází bez chyb po případné dočasné úpravě navazujících systémů
- [ ] #6 1
- [ ] #7 2
- [ ] #8 3
- [ ] #9 4
- [ ] #10 5
<!-- AC:END -->
