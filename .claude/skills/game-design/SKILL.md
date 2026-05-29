---
name: game-design
description: Architecture and quality standards for this Phaser.js game. Use this skill when working on game logic, scenes, constants, or any file that touches the game loop (update(dt)) or GameStateMachine.
---

This skill defines non-negotiable architecture rules, testing requirements, and workflow standards for the two-hands-magic Phaser.js game.

## Architecture

### Game logic must be Phaser-free (`src/game/`)

All domain logic lives in `src/game/` with zero Phaser imports. Phaser scenes are thin bridges only.

Verify before any commit: `grep -r "from 'phaser'" src/game/` must return nothing.

**Scene responsibilities — nothing more:**
1. Translate Phaser input events → `InputEvent[]`
2. Call `game.update(delta, inputs)` each frame
3. Render the state returned by `game.getState()`

If you find yourself writing game logic (scoring, collision, state checks) inside a scene, move it to `src/game/`.

**Directory layout:**
```
src/
  game/           ← pure TS, zero Phaser, fully unit-testable
    systems/      ← AimSystem, ProjectileSystem, InputManager, …
    entities/     ← Enemy, TouchPoint, Projectile, …
    constants.ts  ← ALL tunable values live here
    GameStateMachine.ts
  scenes/         ← Phaser scenes (rendering + input bridge only)
  types/          ← shared types, no logic, no Phaser
  tests/
    unit/         ← Vitest, mirrors src/game/
    e2e/          ← Playwright, full browser
    game-design/  ← GameDesignSpec tests
    helpers/      ← testBridge.ts, Playwright page helpers
```

## Constants discipline

Every tunable value belongs in `src/game/constants.ts`. No magic numbers anywhere else.

Each constant needs a JSDoc with: **what it is**, **unit**, **what it affects**.

Derived constants must reference the parent — never a standalone copy:
```ts
/** Base projectile speed. Affects time-to-hit and difficulty feel. Unit: cm/s */
export const PROJECTILE_SPEED_CM = 70

/** Fireball skill speed. Slower = more telegraphed. */
export const FIREBALL_SPEED_CM = PROJECTILE_SPEED_CM * 0.8  // ← derived, not 56
```

Before adding a constant: check if it should be derived from an existing one. The DoD for every task includes this check.

## Testing requirements

| Layer | Tool | Requirement |
|-------|------|-------------|
| Game logic (`src/game/`) | Vitest | 100% lines/functions/branches |
| E2E rendering | Playwright | Smoke + key interactions, iPhone 14 portrait |
| Game design specs | Vitest (`npm run test:design`) | Every scenario has a spec |

Run order for full validation:
```bash
npm run test             # unit tests
npm run test:coverage    # 100% gate on src/game/**
npm run test:e2e         # Playwright
npm run test:design      # game design specs
npm run build            # TypeScript check must pass
```

## Test bridge (`window.__game`)

Available in DEV builds only — tree-shaken in production. Use from Playwright via `page.evaluate()`.

```ts
window.__game.getState()          // full GameState snapshot
window.__game.injectInput(event)  // simulate InputEvent (touch down/move/up)
window.__game.advanceTime(ms)     // step game loop deterministically
```

Example Playwright test:
```ts
test('fireball hits head', async ({ page }) => {
  await page.goto('/')
  await page.evaluate((ev) => window.__game.injectInput(ev), touchDownEvent)
  await page.evaluate(() => window.__game.advanceTime(600))
  await page.evaluate((ev) => window.__game.injectInput(ev), touchUpEvent)
  const state = await page.evaluate(() => window.__game.getState())
  expect(state.lastHit?.result).toBe('CRIT')
})
```

## Game design test framework

Every game scenario gets a `GameDesignSpec` that machine-verifies design intent for two player profiles:
- **Power user**: knows the game, executes optimally
- **Casual player**: learning, slower reactions

Specs live in `src/tests/game-design/` and run via `npm run test:design`. This makes design decisions like "power gamer finishes in 3s, casual in 10s" into a passing/failing test.

## Definition of Done (every task)

In addition to project-level DoD defaults, every game task must satisfy:

- [ ] `grep -r "from 'phaser'" src/game/` returns nothing
- [ ] If a constant was added: confirmed it's not derivable from an existing constant
- [ ] Agent ran full validation stack (`test` + `test:coverage` + `test:e2e` + `test:design` + `build`)
- [ ] Agent manually verified via `window.__game` API: injected input, checked state response

## Autonomous agent testing protocol

When a task is complete, the agent must:

1. `npm run test` — all unit tests pass, no skipped
2. `npm run test:coverage` — 100% on `src/game/**`
3. `npm run test:e2e` — Playwright suite passes on iPhone 14 portrait profile
4. `npm run test:design` — all GameDesignSpec tests pass
5. `npm run build` — no TypeScript errors
6. Manual smoke: navigate to `http://localhost:5173`, confirm canvas renders, no console errors, use `window.__game.injectInput()` to simulate a full battle interaction
