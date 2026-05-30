---
id: TASK-43
title: 'DamageSystem + Enemy — aplikace global upgradů'
status: Done
assignee:
  - '@claude'
created_date: '2026-05-22'
labels:
  - game-logic
dependencies:
  - TASK-42
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zapojit `GlobalUpgradeState` do `DamageSystem` a `Enemy.getHitResult()`. Implementuje:
- crit damage multiplier
- crit zone tolerance (near-miss crit)
- quick chain bonus damage
- crit stun chance + enemy stun state

### Změny `GameState` (`types/index.ts`)

```typescript
// přidat do GameState
globalUpgrades: GlobalUpgradeState     // aktivní upgrade stav
lastCastBySlot: Record<string, number> // slotId → timestamp posledního výstřelu (pro quick chain)

// přidat do enemy state (uvnitř GameState)
stunnedUntilMs: number                 // 0 = není stunned
```

### `DamageSystem.ts`

Funkce `calculateDamage` přijme `GlobalUpgradeState`:

```typescript
function calculateDamage(
  hitResult: HitResult,
  skill: SkillType,
  upgrades: GlobalUpgradeState,
  lastCastBySlot: Record<string, number>,
  firingSlotId: string,
  nowMs: number
): number {
  if (hitResult === 'MISS') return 0

  const base = rollBaseDamage(skill)
  let multiplier = getBaseMultiplier(hitResult, upgrades.critDamageMultiplier)
    // getBaseMultiplier: CRIT → upgrades.critDamageMultiplier, HIT → 1.0, GRAZE → 0.6

  // quick chain bonus
  if (upgrades.quickChainBonus > 0 && upgrades.quickChainWindowMs > 0) {
    const otherSlotFiredAt = findLastOtherSlotCast(lastCastBySlot, firingSlotId)
    if (otherSlotFiredAt && nowMs - otherSlotFiredAt <= upgrades.quickChainWindowMs) {
      multiplier *= (1 + upgrades.quickChainBonus)
    }
  }

  return Math.round(base * multiplier)
}
```

### `Enemy.ts` — `getHitResult()`

Po výpočtu standardního výsledku aplikovat `critZoneTolerance`:

```typescript
// pokud výsledek není CRIT a tolerance > 0:
// spočítat distToCritCenter
// pokud distToCritCenter > critRadius && distToCritCenter < critRadius * (1 + tolerance)
//   → přepsat výsledek na CRIT
```

Přijme `critZoneTolerance: number` jako parametr.

### `GameStateMachine.ts` — stun logika

```typescript
// po aplikaci damage, pokud hitResult === 'CRIT' a upgrades.critStunChance > 0:
if (Math.random() < upgrades.critStunChance) {
  state.enemy.stunnedUntilMs = state.elapsedMs + upgrades.critStunDurationMs
}
```

### `GameStateMachine.ts` — cast time multiplier

Při inicializaci slotu (nebo při každém update) přepočítat `rotationPeriodMs`:
```typescript
slot.rotationPeriodMs = BASE_ROTATION_PERIOD_FOR_SKILL[slot.skillType] * upgrades.castTimeMultiplier
```

## Game Design testy

Scénáře v `src/tests/game-design/upgradeEffects.spec.ts`:

- **Regrese bez upgradů**: `DEFAULT_GLOBAL_UPGRADE_STATE` → DPS identický s hodnotami před task-43; existující game design testy stále procházejí
- **Power user s `crit_dmg_3` (3.2×)**: TTK na Goblin Scout < 50 % TTK bez upgradu (víc crits = výrazně rychlejší kill)
- **Casual s `crit_zone_1` (tolerance 0.15)**: simulovat 20 % near-miss rate → ~20 % těchto výstřelů se stane CRIT místo HIT; efektivní DPS casual hráče roste
- **Stun flow**: seeded `Math.random` < `critStunChance` → `stunnedUntilMs > elapsedMs`; enemy nemůže útočit v okně stunnu
- **Quick chain**: výstřel z druhého slotu do `quickChainWindowMs` → damage s bonusem; po `quickChainWindowMs` → bez bonusu
- Všechna čísla odvozena od UPGRADE_NODES a SLOW_SKILL_DAMAGE z `constants.ts`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 S `crit_dmg_2` (2.7×): CRIT na slow_shot dá `Math.round(SLOW_SKILL_DAMAGE * 2.7)` dmg
- [x] #2 S `crit_zone_1` (tolerance 0.15): výstřel těsně mimo crit zónu (vzdálenost < 1.15 × crit radius) → CRIT
- [x] #3 S `quick_chain_1`: alternovat dva sloty rychle → damage s bonusem; střílet jen jeden slot → bez bonusu
- [x] #4 S `crit_stun_1`: seed Math.random tak, aby stun prošel → `enemy.stunnedUntilMs > 0`
- [x] #5 S `cast_time_1`: `rotationPeriodMs` slotu = 90 % základní hodnoty
- [x] #6 Všechny nové funkce mají unit testy; DamageSystem.test.ts a Enemy.test.ts rozšířeny
- [x] #7 Game design testy v `upgradeEffects.spec.ts` procházejí (`npm run test:design`)
<!-- AC:END -->
