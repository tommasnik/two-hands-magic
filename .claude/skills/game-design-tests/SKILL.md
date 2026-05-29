---
name: game-design-tests
description: Use this skill whenever designing, writing, or reviewing game design tests for the two-hands-magic Phaser game. Trigger whenever: writing files in src/tests/game-design/, reasoning about enemy difficulty or player builds, designing the test DSL, adding new enemies/skills/levels to the game and needing to document difficulty intent, or planning Monte Carlo simulations of player behavior. Also use when someone asks "how hard should this enemy be?" or "how do we test that the game feels right?" — even if they don't mention tests explicitly.
---

# Game Design Tests

Game design tests answer **"how does the game FEEL?"** — not "does the math add up?". A game designer reads them and understands intent. A developer changes a constant and a failing test tells them the difficulty curve shifted.

The test suite lives in `src/tests/game-design/` and drives `GameStateMachine` directly — no Phaser, no browser.

---

## IMPORTANT: This is a new framework

The codebase may still contain the old `GameDesignSpec` / `runSpec` pattern with `powerUser`/`casualPlayer` profiles and `injectInput`/`wait` action sequences. **That pattern is being replaced.** Ignore it when writing new tests. Use the new sequential DSL described below.

---

## Core rule: no hardcoded numbers for game mechanics

Numbers that come from game mechanics (HP, damage, cooldowns, hit zones) must be imported from `src/game/constants.ts`.

```ts
// Bad — breaks when SLOW_SKILL_DAMAGE changes
machine._applyHitForTesting('CRIT', 'slow_shot')
expect(machine.getState().enemyHp).toBe(20)

// Good — survives any constant tweak
machine._applyHitForTesting('CRIT', 'slow_shot')
expect(machine.getState().enemyHp).toBe(ENEMY_GOBLIN_SCOUT.maxHp - SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER)
```

**Win rates, hurt rates, and difficulty thresholds are design intent** — they live in the test file as named local constants or plain numbers. They do not go into `constants.ts`.

```ts
// Fine — these are the designer's intent, not game parameters
thenWinsTimes(result, atLeast(8))
thenIsHurtTimes(result, between(2, 6))
```

---

## Directory structure

```
src/tests/game-design/
├── builds/                        # One file per player build
│   ├── spammer.build.ts
│   ├── crit-builder.build.ts
│   └── casual.build.ts
├── framework/                     # DSL implementation
│   ├── given.ts                   # givenPlayerWithBuild, givenPlayerAtLevel
│   ├── when.ts                    # whenFightsEnemyTimes, whenCompletesLevels
│   ├── then.ts                    # thenWinsTimes, thenIsHurtTimes, matchers
│   └── types.ts                   # PlayerBuild, FightResult, SimulationResult
├── goblinScout.spec.ts            # Per-enemy test files
├── shadowDancer.spec.ts
├── progression.spec.ts            # Full-run progression milestones
└── README.md
```

---

## Writing a test — sequential style

Tests are a plain sequence of function calls. Each step returns state that gets passed to the next:

```ts
import { describe, it } from 'vitest'
import { givenPlayerWithBuild } from './framework/given'
import { whenFightsEnemyTimes } from './framework/when'
import { thenWinsTimes, thenIsHurtTimes, atLeast, between } from './framework/then'
import { spammerBuild } from './builds/spammer.build'
import { ENEMY_GOBLIN_SCOUT } from '../../game/constants'

describe('Goblin Scout — spammer build', () => {
  it('level-3 spammer wins most fights', async () => {
    const player = givenPlayerWithBuild(spammerBuild, { level: 3 })
    const result = await whenFightsEnemyTimes(player, ENEMY_GOBLIN_SCOUT, 20)
    thenWinsTimes(result, atLeast(17))
    thenIsHurtTimes(result, between(1, 8))
  })
})
```

No builder class, no `.run()`. Each function is independent and testable on its own.

---

## Build definition

Each build lives in `builds/<name>.build.ts`. It models how that type of player makes decisions — all timing values derived from game constants.

```ts
// builds/spammer.build.ts
import { FAST_SKILL_COOLDOWN_MS } from '../../../game/constants'
import type { PlayerBuild } from '../framework/types'

export const spammerBuild: PlayerBuild = {
  name: 'spammer',
  description: 'Fires every skill the moment cooldown expires. Never aims for crits.',
  strategy: {
    firePattern: 'on-cooldown',
    targetZone: 'body',
    timingVarianceMs: FAST_SKILL_COOLDOWN_MS * 0.1,  // ±10% human jitter
  },
  upgradePreference: 'cooldown-reduction',
}
```

```ts
// builds/crit-builder.build.ts
import { WHITE_SHOT_ROTATION_PERIOD_MS } from '../../../game/constants'
import type { PlayerBuild } from '../framework/types'

export const critBuilderBuild: PlayerBuild = {
  name: 'crit-builder',
  description: 'Waits for reticle to align with head zone before firing.',
  strategy: {
    firePattern: 'wait-for-crit',
    targetZone: 'head',
    timingVarianceMs: WHITE_SHOT_ROTATION_PERIOD_MS * 0.05,
  },
  upgradePreference: 'damage',
}
```

Builds are reused across all enemy specs. When adding a new build, add its file and update all enemy specs to cover it.

---

## Given / When / Then reference

### Given (setup)

```ts
// Start with a build at a specific level
const player = givenPlayerWithBuild(spammerBuild, { level: 3 })

// Or just set level (uses default build)
const player = givenPlayerAtLevel(3)

// With specific upgrades pre-applied
const player = givenPlayerWithBuild(critBuilderBuild, { level: 5, upgrades: ['damage+1', 'crit+1'] })
```

### When (actions)

```ts
// Run N independent fight simulations, returns SimulationResult
const result = await whenFightsEnemyTimes(player, ENEMY_GOBLIN_SCOUT, 20)

// Keep fighting until first win, record attempt count
const result = await whenFightsUntilFirstWin(player, ENEMY_SHADOW_DANCER)

// Progress through N levels using the build's strategy
const result = await whenCompletesLevels(player, 5)

// Kill enemy count times, accumulate XP/state  (requires XP system)
const result = await whenKillsEnemies(player, ENEMY_GOBLIN_SCOUT, 10)
```

### Then (assertions)

```ts
// Wins/losses out of total simulations
thenWinsTimes(result, atLeast(17))       // won >= 17 out of 20
thenWinsTimes(result, between(10, 16))   // won between 10 and 16

// How often player took damage
thenIsHurtTimes(result, between(2, 8))

// Average kill time
thenKillTimeMs(result, atMost(5000))

// Progression (requires XP system)
thenPlayerIsAtLevel(result, 4)
thenPlayerHasUpgradeCount(result, atLeast(2))
```

### Matchers

```ts
atLeast(n)       // value >= n
atMost(n)        // value <= n
between(a, b)    // a <= value <= b  (inclusive)
exactly(n)       // value === n
```

---

## Monte Carlo — how it works

`whenFightsEnemyTimes(player, enemy, 20)` runs 20 independent simulations:

1. Each creates a fresh `GameStateMachine`
2. The build's `firePattern` drives `injectInput`/`wait` sequences
3. `timingVarianceMs` adds random jitter each simulation — models human imprecision
4. Records: win/loss, damage taken, elapsed time, shots fired
5. Returns aggregate `SimulationResult`

Use at least **10 simulations** for difficulty tests, **20+** for probability assertions like win rates.

The variance is what makes Monte Carlo meaningful. Without `timingVarianceMs`, all 20 simulations would be identical — deterministic, not probabilistic.

---

## Per-enemy spec structure

Each enemy gets its own spec. Cover every defined build. The test name expresses design intent, not math:

```ts
describe('Shadow Dancer — fast enemy, medium HP', () => {
  it('spammer at mid-level struggles — wins about half the fights', async () => {
    const player = givenPlayerWithBuild(spammerBuild, { level: 5 })
    const result = await whenFightsEnemyTimes(player, ENEMY_SHADOW_DANCER, 20)
    thenWinsTimes(result, between(8, 14))   // ~50% win rate
  })

  it('crit builder reliably defeats Shadow Dancer', async () => {
    const player = givenPlayerWithBuild(critBuilderBuild, { level: 5 })
    const result = await whenFightsEnemyTimes(player, ENEMY_SHADOW_DANCER, 20)
    thenWinsTimes(result, atLeast(16))      // >80% win rate
  })
})
```

The numbers in `thenWinsTimes` are design intent — they belong here in the test, not in `constants.ts`.

---

## Progression milestone tests

Test the full campaign flow. Require XP/leveling system to be implemented.

```ts
describe('XP and leveling', () => {
  it('player reaches level 2 after first kill', async () => {
    const player = givenPlayerWithBuild(casualBuild, { level: 1 })
    const result = await whenKillsEnemies(player, ENEMY_GOBLIN_SCOUT, 1)
    thenPlayerIsAtLevel(result, 2)
  })

  it('10 goblin kills → level 4 with at least 2 upgrades', async () => {
    const player = givenPlayerWithBuild(spammerBuild, { level: 1 })
    const result = await whenKillsEnemies(player, ENEMY_GOBLIN_SCOUT, 10)
    thenPlayerIsAtLevel(result, 4)
    thenPlayerHasUpgradeCount(result, atLeast(2))
  })
})
```

---

## Implementing the framework (when it doesn't exist yet)

Start here before writing any tests. Implement in this order:

**1. `framework/types.ts`** — core types:
```ts
export interface PlayerBuild {
  name: string
  description: string
  strategy: {
    firePattern: 'on-cooldown' | 'wait-for-crit' | 'random'
    targetZone: 'head' | 'body'
    timingVarianceMs: number
  }
  upgradePreference?: string
}

export interface FightResult { won: boolean; damageTaken: number; killTimeMs: number }
export interface SimulationResult { fights: FightResult[]; total: number }
export type Matcher = (value: number) => boolean
```

**2. `framework/given.ts`** — setup functions that return a `PlayerState`:
- `givenPlayerWithBuild(build, opts)` — configure build + level
- `givenPlayerAtLevel(n)` — shorthand with default build

**3. `framework/when.ts`** — simulation runner:
- Creates fresh `GameStateMachine` per fight
- Translates `firePattern`/`targetZone` into `injectInput` + `wait` sequences using game constants
- Applies `timingVarianceMs` jitter via `Math.random()`
- Returns `SimulationResult`

**4. `framework/then.ts`** — assertion functions + matchers:
- Each `then*` throws with a descriptive message on failure
- `atLeast`, `atMost`, `between`, `exactly`

**5. First build**: `builds/casual.build.ts` — simplest behavior, validates pipeline

**6. Smoke test**: one `it()` with `atLeast(0)` to confirm pipeline runs end-to-end

The framework must only import from `GameStateMachine` and `constants.ts` — no Phaser, no browser APIs.

---

## When to write or update game design tests

- **New enemy added** → new `<enemy>.spec.ts` covering all defined builds
- **HP/damage constants change** → run test suite; a failure = difficulty intent shifted, decide consciously  
- **New build added** → new `builds/<name>.build.ts`, update all enemy specs
- **New level added** → add milestone to `progression.spec.ts`
- **New mechanic (XP, upgrades, player HP)** → extend `when*`/`then*` in framework
