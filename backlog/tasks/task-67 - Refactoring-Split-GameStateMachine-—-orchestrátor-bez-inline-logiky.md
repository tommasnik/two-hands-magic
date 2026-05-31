---
id: TASK-67
title: 'Refactoring: Split GameStateMachine — orchestrátor bez inline logiky'
status: Done
assignee: []
created_date: '2026-05-30 22:29'
updated_date: '2026-05-31 00:15'
labels:
  - refactoring
dependencies:
  - TASK-63
  - TASK-64
  - TASK-65
references:
  - DependencyMap.md#2.6
  - GameDesign.md#10
documentation:
  - DependencyMap.md
  - GameDesign.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Před implementací přečti
`GameDesign.md` §10 (cílový stav architektury) a `DependencyMap.md` §2.6 (co GSM dělá a co má přejít ven). Tento task je poslední v refactoring řadě — předpokládá hotové TASK-63, 64, 65.

## Přehled
GameStateMachine.ts má 1020 řádků. Část logiky přešla do subsystémů v TASK-63–65, ale GSM ji ještě koordinuje inline. Cíl: GSM = čistý orchestrátor, žádná inline herní logika v `update()`.

## Co se přesune v tomto tasku
- Phase management (`loading → battle → fight_overview → game_over`) → `PhaseManager`
- Inline damage aplikace (pokud zbyla) → `DamageSystem`

## PhaseManager
```ts
interface PhaseManager {
  readonly currentPhase: GamePhase
  /** Vyhodnotí podmínky přechodu a případně změní fázi. */
  evaluate(player: PlayerState, enemy: EnemyState): void
  /** Vrátí true pokud právě nastala změna fáze (pro GSM aby mohl reagovat). */
  didTransition(): boolean
}
```
`PhaseManager` je jednoduchý stavový stroj — žádná herní logika, jen podmínky (`enemy.hp <= 0 → fight_overview` atd.).

## Cílová GSM.update() (pseudokód)
```ts
update(dt: number, inputs: InputEvent[]) {
  const commands = this.inputManager.process(inputs)
  this.aimSystem.update(dt, commands)
  const hits = this.projectileSystem.update(dt)
  for (const hit of hits) {
    const resolution = resolveHit(this.skillRegistry.get(hit.skillType), this.enemy)
    this.damageSystem.apply(resolution, this.player, this.enemy)
    const applyStatus: StatusApplier = e => this.statusEffects.apply(this.enemy, e)
    this.skillRegistry.get(hit.skillType).onHit?.(this.enemy, hit, applyStatus)
    this.stats.record(hit, resolution)
  }
  this.behaviorRunner.tick(dt)
  this.deliverySystem.update(dt, this.player, this.enemy)
  this.statusEffects.tick(dt, this.enemy)
  this.phaseManager.evaluate(this.player, this.enemy)
}
```

## Co je OUT OF SCOPE
- CampaignManager (budoucí task — více nepřátel, level konfigurace)
- Žádné nové herní funkce
- Žádné změny v BattleScene
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GameStateMachine.ts má méně než 300 řádků
- [x] #2 update() neobsahuje žádnou inline herní logiku — jen sekvenční volání subsystémů
- [x] #3 PhaseManager existuje jako samostatný modul s definovaným interface
- [x] #4 GSM neobsahuje přímé podmínky na enemy.hp nebo player.hp — deleguje na PhaseManager
- [x] #5 npm run test prochází, coverage 100 % na src/game/**
- [x] #6 npm run test:e2e prochází beze změn
<!-- AC:END -->
