---
id: TASK-66
title: 'Refactoring: Split BattleScene do renderer submodulů'
status: Done
assignee: []
created_date: '2026-05-30 22:29'
updated_date: '2026-05-30 23:36'
labels:
  - refactoring
dependencies:
  - TASK-63
  - TASK-64
references:
  - DependencyMap.md#2.7
  - GameDesign.md#10.3
documentation:
  - DependencyMap.md
  - GameDesign.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Před implementací přečti
`GameDesign.md` §10.3 (BattleScene cílová struktura) a `DependencyMap.md` §2.7. Také si prečti CLAUDE.md sekci o Scenes (thin bridge pravidla).

## Přehled
BattleScene.ts má 1040 řádků a mixuje rendering enemy spritů, HUD, delivery vizuálů a skill projektilů. Cíl: split do specializovaných Renderer tříd. BattleScene = thin orchestrátor, deleguje, sám nekreslí.

## Inventář co existuje (před splitem)
Před implementací si udělej `grep -n "class\|draw\|create\|add\." src/scenes/BattleScene.ts` a zmapuj, co kde je. V `src/scenes/rendering/` již existují `SkillRenderer` a `DeliveryRenderer` (nebo podobné) — přesouváš zbývající logiku do stejného vzoru, nevytváříš duplicity.

## Cílová struktura
```
src/scenes/
  BattleScene.ts              ← orchestrátor: input bridge + volání rendererů
  rendering/                  ← již existuje, jen rozšíříš
    EnemyRenderer.ts          ← sprite animace, hit zone overlay, status efekt vizuály
    HUDRenderer.ts            ← HP bar, sloty, touch pointy, score, damage floaty
    BackgroundRenderer.ts     ← pozadí (jen pokud má vlastní logiku, jinak nechej inline)
    (SkillRenderer.ts)        ← existuje, jen zkontroluj čistotu
    (DeliveryRenderer.ts)     ← existuje, jen zkontroluj čistotu
```

## Pravidla (invarianty)
- Každý renderer dostane **pouze** snapshot z `GameStateMachine.getState()` — nečte nic jiného
- **Žádná herní logika v rendererech** — jen překlad stavu na Phaser volání. Pokud najdeš podmínku `if (hp < 20)` v rendereru, patří do GSM
- BattleScene.update(): `gsm.update(dt, inputs)` → `state = gsm.getState()` → každý renderer dostane `state`
- Phaser zůstává výhradně v `src/scenes/` — pravidlo z CLAUDE.md

## BattleScene po splitu
```ts
update(dt: number) {
  const inputs = this.inputBridge.collect()
  this.gsm.update(dt, inputs)
  const state = this.gsm.getState()
  this.enemyRenderer.render(state)
  this.skillRenderer.render(state)
  this.deliveryRenderer.render(state)
  this.hudRenderer.render(state)
}
```

## Co je OUT OF SCOPE
- Žádné změny v GameStateMachine
- Žádné nové vizuální efekty
- Žádné změny herní logiky
- BackgroundRenderer pokud pozadí nemá vlastní stav
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 BattleScene.ts má méně než 200 řádků
- [x] #2 Každý renderer je izolovaný soubor s jednou zodpovědností
- [x] #3 Žádný renderer neobsahuje herní logiku (podmínky závislé na herním stavu mimo překlad pro render)
- [x] #4 BattleScene.update() obsahuje pouze: collect inputs → gsm.update() → getState() → render calls
- [x] #5 npm run test:e2e prochází beze změn
- [x] #6 Vizuální chování hry je nezměněno — ověř ručně nebo screenshot diffem
<!-- AC:END -->
