---
id: TASK-73
title: >-
  Refactoring: EffectsManager — vizuální efekty ven ze state, event-driven
  rendering
status: In Progress
assignee: []
created_date: '2026-05-31 10:41'
updated_date: '2026-05-31 10:43'
labels:
  - refactoring
  - rendering
  - architecture
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Přehled

Lightning blast má vizuální efekty (discharge) zanesené přímo do `FightState` a `FightSnapshot` jako tři dedikovaná pole. `processCommands()` vrací `LightningState | null`. V GSM je `if (lightning) { ... }`. Jde o neudržitelný precedens — každý nový skill efekt by přidal další speciální pole.

Cílem je vyčlenit vizuální efekty zcela mimo game state a zavést obecný mechanismus, který zvládne lightning, ice crystal (shatter), fireball explosion i budoucí efekty bez rozrůstání state.

## Architektura po refactoringu

### 1. `GameEvent[]` jako return value `update()`

```ts
// src/game/GameStateMachine.ts
update(dt: number, inputs: InputEvent[]): GameEvent[]
```

Events jsou ephemeral — vznikají během `update()`, vrátí se volajícímu, nejsou součástí state. GSM si interně drží `_pendingEvents: GameEvent[]`, naplní je během ticku, vrátí a vyčistí.

Zatím potřebný event typ:
```ts
type GameEvent =
  | { type: 'ENEMY_HIT'; skillType: SkillType; result: HitResult; position: Point; damage: number }
```

Ostatní typy (STATUS_APPLIED, PLAYER_HIT, ENEMY_DIED, …) se přidají až bude konkrétní potřeba.

**Důvod pro `GameEvent[]` místo single `lastHit`:** dva projektily mohou trefít enemy ve stejném delta time — single record by přepsal první hit a efekt by se nikdy nespustil.

### 2. `SkillModule.hitEffect` — skill jako single source of truth

```ts
// src/game/skills/types.ts (nebo stávající SkillModule interface)
interface SkillModule {
  // ... existující pole ...
  hitEffect?: {
    type: SkillEffectType                        // 'lightning_discharge' | 'ice_crystal' | …
    durationByResult: Record<HitResult, number>  // MISS: 0 = žádný efekt
  }
}
```

Skill definuje trvání efektu jednou — state i EffectsManager čtou ze stejného zdroje.

```ts
// src/game/skills/lightning-blast/index.ts
hitEffect: {
  type: 'lightning_discharge',
  durationByResult: {
    CRIT:  LIGHTNING_BLAST_DURATION_CRIT_MS,
    HIT:   LIGHTNING_BLAST_DURATION_HIT_MS,
    GRAZE: LIGHTNING_BLAST_DURATION_GRAZE_MS,
    MISS:  0,
  },
}
```

### 3. `EffectsManager` v renderer vrstvě (scene/Phaser side)

```ts
// src/scenes/effects/EffectsManager.ts
class EffectsManager {
  process(events: GameEvent[], state: GameState): void
  get activeEffects(): ActiveEffect[]
}

interface ActiveEffect {
  type: SkillEffectType
  startMs: number
  durationMs: number
  position: Point | null
  hitResult: HitResult
}
```

`process()` iteruje eventy, pro `ENEMY_HIT` lookup do skill module (`hitEffect`), přidá `ActiveEffect`. Stará efekty promazává podle `state.elapsedMs`.

### 4. BattleScene — jeden centrální render call

```ts
// src/scenes/BattleScene.ts
const events = this._gsm.update(dt, inputs)
const state = this._gsm.getState()
this._effectsManager.process(events, state)
// renderer dostane state + activeEffects
this._skillRenderer.drawActiveEffects(ctx, this._effectsManager.activeEffects, state.elapsedMs)
```

`drawActiveEffects()` dispatchuje podle `effect.type` na privátní per-effect renderery (lightning, ice crystal, …).

## Co se odstraní

- `lightningDischargeUntilMs`, `lightningDischargeResult`, `lightningDischargeTarget` z `FightState` a `FightSnapshot`
- `LightningState` interface z `CommandProcessor`
- Return type `LightningState | null` → `void` v `processCommands()`
- `if (lightning) { ... }` v `GameStateMachine`
- Duplicitní `LIGHTNING_DURATIONS` v `resolvers.ts` a `CommandProcessor.ts`
- `_fireLightningBlastForTesting()` — nahradit obecným test helperem nebo přímo přes `_pendingEvents`
- `drawLightningDischarge()` jako veřejná/standalone metoda → přesunout jako privátní do dispatch systému

## Co se přidá

- `GameEvent` type v `src/types/index.ts`
- `_pendingEvents: GameEvent[]` v GSM, emitované z `_applyHit()`
- `hitEffect` pole v `SkillModule` interface
- `EffectsManager` třída v `src/scenes/effects/`
- `SkillEffectType` type v `src/types/index.ts`
- `drawActiveEffects()` v `SkillRenderer`

## Co je OUT OF SCOPE

- Žádné další event typy (STATUS_APPLIED, PLAYER_HIT, ENEMY_DIED, …) — přidají se samostatně až s konkrétní potřebou
- Ice crystal shatter animace — vizuální efekty pro ice_crystal se přidají až ve vlastním tasku
- Fireball explosion efekt
- Žádné změny v gameplay logice — pouze přesun vizuálního stavu
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `FightState` a `FightSnapshot` neobsahují žádná lightning-specific pole
- [ ] #2 `processCommands()` vrací `void`, ne `LightningState | null`
- [ ] #3 `GameStateMachine.update()` vrací `GameEvent[]`
- [ ] #4 Lightning discharge vizuál funguje identicky jako před refactoringem (blikání po zásahu, správná délka pro CRIT/HIT/GRAZE)
- [ ] #5 `EffectsManager.process()` správně zpracuje 2 hity ve stejném delta time — oba spustí svůj efekt
- [ ] #6 Skill module `lightningBlastModule` obsahuje `hitEffect` s `durationByResult`
- [ ] #7 Všechny unit testy procházejí (`npm run test`)
- [ ] #8 Žádný nový lightning-specific branching v GSM, FightState ani StateBuilder
<!-- AC:END -->
