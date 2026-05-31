---
id: TASK-76
title: 'Skill interakce: lightning + frozen — kontinuální arc dmg po krystalu'
status: To Do
assignee: []
created_date: '2026-05-31 14:48'
labels:
  - skill-interaction
  - combat
  - visual-effects
dependencies: []
references:
  - src/game/skills/lightning-blast/index.ts
  - src/game/skills/types.ts
  - src/game/systems/StatusEffectSystem.ts
  - src/game/systems/DamageSystem.ts
  - src/scenes/effects/EffectsManager.ts
  - src/game/constants/skills/lightning-blast.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled

Když lightning_blast trefí enemy se statusem `frozen`, místo normálního jednorázového hitu nastane interakce: lightning "skočí" na krystal a vytváří elektrické oblouky od okraje krystalu do těla nepřítele. Tyto oblouky kontinuálně poškozují nepřítele v tickách po celou dobu trvání freeze.

Multiplier 2× dmg (dříve v `lightningBlastModule.interactions`) byl odstraněn — feature ho nahrazuje celkovým DoT.

## Rozhodnutí z návrhu

- **Tick rate**: každých ~200 ms
- **Dmg za tick**: zlomek base lightning dmg (viz konstanta `LIGHTNING_ARC_TICK_DAMAGE_RATIO`)
- **Trvání**: DoT trvá přesně tak dlouho jako freeze (1000 ms HIT / 2000 ms CRIT)
- **Freeze lifetime**: lightning ho nezkracuje ani nezrychluje — DoT jen "jede" po dobu normálního freeze

## Datová struktura

Nový status kind `'lightning_arc'` rozšiřuje `StatusEffect` o DoT pole:

```ts
interface StatusEffect {
  kind: string           // přidáme 'lightning_arc'
  remainingMs: number
  // DoT extension (volitelné — čte StatusEffectSystem)
  tickIntervalMs?: number   // ms mezi ticky (200)
  tickDamage?: number       // HP za tick
  msSinceLastTick?: number  // vnitřní čítač (inicializuj na 0)
  visualKey?: string        // 'lightning_arc' → renderer čte
}
```

## Herní mechaniky

1. `lightning_blast` trefí frozen enemy
2. `DamageSystem.resolveHit()` najde `InteractionRule { whenEnemyHas: 'frozen' }` → aplikuje `additionalStatus: { kind: 'lightning_arc', remainingMs: <stejné jako freeze>, tickIntervalMs: 200, tickDamage: ... }`
3. `StatusEffectSystem.tick()` každý frame: pokud `msSinceLastTick >= tickIntervalMs`, emituje dmg tick event + resetuje čítač
4. `GameStateMachine` konzumuje tick event → odečte `tickDamage` z enemy HP
5. Po expiraci freeze se odstraní i `lightning_arc` efekt (nebo naopak — oba mají stejnou délku)

## UI / Vizuální efekty

- Při aplikaci interakce: EffectsManager spustí vizuál `lightning_frozen_discharge` (už definován ve `visualKey`)
- Při každém DoT tiku: EffectsManager emituje krátký arc efekt (blesk od okraje krystalu k tělu enemy)
- Arc vizuál: tenká bílá/modrá čára s alpha fade, délka trvání ~150 ms per arc

## GameState rozšíření

Pouze `activeStatusEffects` na enemy — pole `StatusEffect[]` už existuje. Žádné nové pole v `FightSnapshot`.

## Konstanty

Přidat do `src/game/constants/skills/lightning-blast.ts`:

```ts
/** Interval mezi arc damage ticky. Unit: ms. */
export const LIGHTNING_ARC_TICK_INTERVAL_MS = 200

/** Podíl base dmg (průměr min/max) za jeden arc tick. Unit: bezrozměrný. */
export const LIGHTNING_ARC_TICK_DAMAGE_RATIO = 0.25
```

## Co je OUT OF SCOPE

- Vizuální shader arc blesku (stačí jednoduchá čára/sprite, ne particle systém)
- Stacking více lightning_arc efektů (replace semantics, stejně jako frozen)
- Interakce lightning_arc s dalšími statusy
- Zvuk

## Game Design testy

Testy v `src/tests/game-design/` musí pokrývat:
- **Power user**: lightning hits frozen CRIT enemy → total arc dmg = floor(CRIT_FREEZE_DURATION / TICK_INTERVAL) × tickDamage
- **Casual player**: lightning hits frozen HIT enemy → alespoň 3 tiky proběhnou
- **Edge case**: freeze vyprší před všemi tiky → DoT se zastaví se freeze
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Nová konstanta LIGHTNING_ARC_TICK_INTERVAL_MS = 200 a LIGHTNING_ARC_TICK_DAMAGE_RATIO v constants/skills/lightning-blast.ts
- [ ] #2 StatusEffect interface rozšířen o volitelná pole: tickIntervalMs, tickDamage, msSinceLastTick
- [ ] #3 StatusEffectSystem.tick() emituje DOT_TICK event (nebo volá callback) kdykoli msSinceLastTick >= tickIntervalMs
- [ ] #4 lightning_blast InteractionRule obsahuje additionalStatus s kind='lightning_arc', remainingMs shodné s freeze duration, tickIntervalMs a tickDamage odvozené z konstant
- [ ] #5 GameStateMachine aplikuje tickDamage na enemy HP při každém tiku (enemy může zemřít na DoT)
- [ ] #6 EffectsManager zobrazí krátký arc vizuál (~150 ms) při každém DOT_TICK eventu pro kind='lightning_arc'
- [ ] #7 Pokud enemy zemře na DoT, bojová sekvence proběhne normálně (enemy smrt = standardní flow)
- [ ] #8 Pokud freeze vyprší, lightning_arc DoT se zastaví zároveň (obě mají stejné remainingMs)
- [ ] #9 Unit testy pokrývají: tick counting, správné totalDmg po N tickách, ukončení DoT s freeze
- [ ] #10 Game design test pokrývá power user i casual player scénář (žádná hardcoded čísla — vše z konstant)
<!-- AC:END -->
