---
id: TASK-76
title: 'Skill interakce: lightning + frozen — kontinuální arc dmg po krystalu'
status: In Progress
assignee: []
created_date: '2026-05-31 14:48'
updated_date: '2026-05-31 17:15'
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
- [x] #1 Nová konstanta LIGHTNING_ARC_TICK_INTERVAL_MS = 200 a LIGHTNING_ARC_TICK_DAMAGE_RATIO v constants/skills/lightning-blast.ts
- [x] #2 StatusEffect interface rozšířen o volitelná pole: tickIntervalMs, tickDamage, msSinceLastTick
- [x] #3 StatusEffectSystem.tick() emituje DOT_TICK event (nebo volá callback) kdykoli msSinceLastTick >= tickIntervalMs
- [x] #4 lightning_blast InteractionRule obsahuje additionalStatus s kind='lightning_arc', remainingMs shodné s freeze duration, tickIntervalMs a tickDamage odvozené z konstant
- [x] #5 GameStateMachine aplikuje tickDamage na enemy HP při každém tiku (enemy může zemřít na DoT)
- [x] #6 EffectsManager zobrazí krátký arc vizuál (~150 ms) při každém DOT_TICK eventu pro kind='lightning_arc'
- [x] #7 Pokud enemy zemře na DoT, bojová sekvence proběhne normálně (enemy smrt = standardní flow)
- [x] #8 Pokud freeze vyprší, lightning_arc DoT se zastaví zároveň (obě mají stejné remainingMs)
- [x] #9 Unit testy pokrývají: tick counting, správné totalDmg po N tickách, ukončení DoT s freeze
- [x] #10 Game design test pokrývá power user i casual player scénář (žádná hardcoded čísla — vše z konstant)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
DoT model přes nový status kind 'lightning_arc'.

Tok: lightning_blast trefí frozen enemy → resolveHit() (DamageSystem) najde InteractionRule s additionalStatus, naplní remainingMs z aktuálního frozen efektu (DoT běží přesně po dobu zbývajícího freeze) a msSinceLastTick=0 → CombatSystem.processHit() aplikuje status přes StatusEffectSystem.apply(). StatusEffectSystem.tick() dostává onDotTick callback (effect, tickDamage) a tikuje každých tickIntervalMs (počítá jen aktivní čas: min(dt, prevRemaining), takže DoT nikdy netiká za hranicí freeze). GSM callback emituje DOT_TICK GameEvent, odečte HP a volá nově extrahovaný _handleEnemyKilled() (sdílený s _applyHit) → smrt z DoT = standardní fight_overview flow.

Render: EffectsManager mapuje DOT_TICK kind='lightning_arc' na ActiveEffect type 'lightning_arc' (150ms), SkillRenderer._drawLightningArc kreslí krátký modro-bílý oblouk s alpha fade.

Konstanty (constants/skills/lightning-blast.ts): LIGHTNING_ARC_TICK_INTERVAL_MS=200, LIGHTNING_ARC_TICK_DAMAGE_RATIO=0.25 (→ tickDamage = round(avg(min,max)*ratio) = 3), LIGHTNING_ARC_VISUAL_DURATION_MS=150.

Pozn.: lightning frozen interaction nikdy neměla 2× damageMultiplier v reálném modulu (jen visualKey), takže nebylo co odstraňovat.

Refactory pro 100% coverage na dotčených souborech: resolveHit() přepsán na for-loop (eliminace nedosažitelné defensive větve), StatusEffectSystem.tick() používá for-of + in-place filter (zachování reference pole), kill bookkeeping extrahováno do _handleEnemyKilled(). Coverage GameStateMachine/DamageSystem/StatusEffectSystem = 100%.

Mimo scope: pre-existing coverage gap v CommandProcessor.ts (75-77, 94-96) byl rozbitý už na HEAD (commit 00f9a47). Opraven také pre-existing e2e test rendering.spec.ts (state.enemy.y → state.fight.enemy.y, migrace z 98fc943).
<!-- SECTION:NOTES:END -->
