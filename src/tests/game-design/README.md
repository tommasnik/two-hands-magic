# Game Design Test Framework

Tests in this directory verify that the game **feels right** for different player archetypes — no browser or Phaser needed. They run against the pure-TypeScript `GameStateMachine` in a Node environment via Vitest.

```
npm run test:design    # run game-design specs only
npm run test           # run all unit + game-design tests
```

---

## Core philosophy: tests define difficulty intent, not math

A game design test answers **"how hard is this enemy?"** in gameplay terms:

> *"Level 1 enemy dies after 1 CRIT from the strongest skill + 1 CRIT from the weakest skill."*

It does **not** answer "what does `40 + 20 = 60` equal?". When a game designer tweaks `SLOW_SKILL_DAMAGE` from 20 to 25, the test should still express the same design intent and survive the change.

### The rule: no hardcoded numbers in assertions

Every number in an assertion must be derived from constants imported from `src/game/constants.ts`.

**Bad — hardcoded magic number:**
```ts
machine._applyHitForTesting('CRIT', 'slow_shot')
expect(machine.getState().enemyHp).toBe(20) // ❌ breaks when damage changes
```

**Good — derived from constants:**
```ts
machine._applyHitForTesting('CRIT', 'slow_shot')
const expected = LEVELS[0].enemyDef.maxHp - SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
expect(machine.getState().enemyHp).toBe(expected) // ✓ survives config changes
```

**Also good — intent-level assertion:**
```ts
// Design intent: goblin dies in exactly 1 strongest + 1 weakest CRIT
machine._applyHitForTesting('CRIT', 'slow_shot') // strongest
machine._applyHitForTesting('CRIT', 'fast_shot') // weakest
expect(machine.getState().phase).toBe('level_complete') // ✓ no numbers at all
```

### When to write game design tests

Write or update a game design test whenever you:
- **Add or modify an enemy** — verify its HP pool means the right number of hits to kill it
- **Add or modify a skill/damage value** — verify the difficulty curve of each level survives
- **Add a new screen or game phase** — verify the player can reach it (power user) and won't get stuck (casual player)
- **Add a level** — add a full encounter spec covering minimum and maximum shot counts

The test suite is the **source of truth for intended difficulty**. If you change a constant and a game design test breaks, that is the test doing its job — stop and check whether the difficulty intent changed too.

---

## Concepts

### GameDesignSpec

A spec describes one scenario with two player profiles:

```ts
const spec: GameDesignSpec = {
  name: 'my-scenario',
  description: 'What we are testing',
  powerUser: { description, actions, assertions },
  casualPlayer: { description, actions, assertions },
}
```

### Action

Each profile has an ordered list of `Action` steps:

| Type | Payload | What it does |
|------|---------|--------------|
| `injectInput` | `InputEvent` | Queues a raw pointer event into the machine, then advances 1 ms |
| `wait` | `{ ms: number }` | Advances simulation time by `ms` in `MAX_DELTA_MS` steps |

### Assertion

Each profile has an array of assertions that are evaluated after all actions complete:

| Field | Meaning |
|-------|---------|
| `metric` | Key from the metrics map (see below) |
| `maxMs` | Pass if `metric <= maxMs` |
| `minMs` | Pass if `metric >= minMs` |
| `value` | Pass if `metric === value` (strict equality, use for booleans) |

### Metrics collected by the runner

| Metric | Type | Description |
|--------|------|-------------|
| `timeToFirstCrit` | `number \| null` | `elapsedMs` when `score.crits` first became > 0 |
| `timeToFirstHit` | `number \| null` | `elapsedMs` when `score.hits` first became > 0 |
| `atLeastOneHit` | `boolean` | `true` if `score.crits + score.hits > 0` at any point |
| `totalEncounterTime` | `number` | `elapsedMs` at the end of the full action sequence |

---

## How the runner works

`runSpec(spec)` creates a **fresh `GameStateMachine` instance** for each profile (never the module-level singleton). It then:

1. Calls `machine.startBattle()`
2. Executes each action in sequence
3. After each `update()`, checks whether tracked metrics changed
4. Evaluates all assertions against the collected metrics
5. Returns two `RunResult` objects — power user first, casual player second

Because the machine is deterministic (same input sequence → same output), tests are stable and reproducible without any randomness or timing dependencies.

---

## Adding a new spec

1. Create `src/tests/game-design/<scenarioName>.test.ts`
2. Import `runSpec` and the types:

```ts
import { describe, it, expect } from 'vitest'
import { runSpec } from './runner'
import type { GameDesignSpec } from './types'
```

3. Define your spec:

```ts
const spec: GameDesignSpec = {
  name: 'boss-fight',
  description: 'Player must land 3 crits before dying',
  powerUser: {
    description: 'Chains 3 head shots using VIOLET timing',
    actions: [
      { type: 'injectInput', payload: { pointerId: 0, action: 'down', x: 50, y: 420, timestamp: 0 } },
      { type: 'wait', payload: { ms: 515 } },
      { type: 'injectInput', payload: { pointerId: 0, action: 'up', x: 50, y: 420, timestamp: 516 } },
      { type: 'wait', payload: { ms: 300 } },
      // ... repeat for more shots
    ],
    assertions: [
      { metric: 'timeToFirstCrit', maxMs: 820 },
    ],
  },
  casualPlayer: {
    description: 'Fires once, lands at least a HIT',
    actions: [
      { type: 'injectInput', payload: { pointerId: 0, action: 'down', x: 100, y: 820, timestamp: 0 } },
      { type: 'wait', payload: { ms: 1548 } },
      { type: 'injectInput', payload: { pointerId: 0, action: 'up', x: 100, y: 820, timestamp: 1549 } },
      { type: 'wait', payload: { ms: 500 } },
    ],
    assertions: [
      { metric: 'atLeastOneHit', value: true },
    ],
  },
}
```

4. Wrap with Vitest:

```ts
describe('Game Design: Boss Fight', () => {
  it('power user gets a CRIT quickly', async () => {
    const [powerResult] = await runSpec(spec)
    expect(powerResult.failures, powerResult.failures.join('\n')).toHaveLength(0)
  })
  it('casual player lands a hit', async () => {
    const [, casualResult] = await runSpec(spec)
    expect(casualResult.failures, casualResult.failures.join('\n')).toHaveLength(0)
  })
})
```

---

## Adding a new player profile

If you need a third profile (e.g., `speedrunner`), extend `GameDesignSpec` in `types.ts`:

```ts
export interface GameDesignSpec {
  name: string
  description: string
  powerUser: PlayerProfile
  casualPlayer: PlayerProfile
  speedrunner?: PlayerProfile   // optional third profile
}
```

Then update `runSpec` in `runner.ts` to execute the new profile when present, and add the corresponding test case.

---

## Touch point reference

| ID | Side | Position | Period (ms) | Y range for mapping |
|----|------|----------|-------------|---------------------|
| green | left | 0 (bottom) | 2200 | y ≥ 562 |
| violet | left | 1 (mid) | 600 | 281 ≤ y < 562 |
| orange | left | 2 (top) | 1400 | y < 281 |
| blue | right | 0 (bottom) | 2800 | y ≥ 562 |
| red | right | 1 (mid) | 900 | 281 ≤ y < 562 |
| yellow | right | 2 (top) | 1700 | y < 281 |

Use x < 195 for left-side points, x ≥ 195 for right-side points.

**Reticle Y formula**: `reticleY = 844 * (1 − elapsedMs % period / period)`

To aim at a specific Y, calculate the required `elapsedMs` before releasing:
`waitMs = (1 − targetY / 844) * period`
