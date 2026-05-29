# E2E Test Protocol — Two Hands Magic

Step-by-step guide for autonomous agent testing using Playwright + `window.__game` bridge.

---

## Prerequisites

- `npm run dev` running at `http://localhost:5173` (or let `npm run test:e2e` start it automatically)
- DEV build only — `window.__game` is NOT available in production builds

---

## Step-by-Step Protocol

### 1. Start / verify dev server

```bash
# Playwright will start it automatically via webServer config
npm run test:e2e
```

### 2. Wait for test bridge availability

Always wait for `window.__game` to be defined before calling any API:

```ts
await page.waitForFunction(
  () => (window as any).__game !== undefined,
  { timeout: 5000 }
)
```

### 3. Wait for battle phase

The game starts in `loading` phase. `BattleScene.create()` transitions to `battle`. Wait before sending inputs:

```ts
await page.waitForFunction(
  () => (window as any).__game?.getState()?.phase === 'battle',
  { timeout: 5000 }
)
```

### 4. Use gameApi helper (recommended)

Import the typed wrapper instead of raw `page.evaluate()`:

```ts
import { gameApi } from '../helpers/gameApi'

const api = gameApi(page)
const state = await api.getState()       // → GameState
await api.injectInput({ ... })           // → void
await api.advanceTime(ms)                // → void
```

### 5. Simulate a touch interaction

```ts
// Touch down on left side (fires left-hand projectile)
await api.injectInput({ pointerId: 0, action: 'down', x: 50, y: 800, timestamp: Date.now() })
await api.advanceTime(600)  // hold for one rotation cycle

// Touch up = projectile fires
await api.injectInput({ pointerId: 0, action: 'up', x: 50, y: 800, timestamp: Date.now() })
await api.advanceTime(16)   // process the release
```

### 6. Inspect resulting state

```ts
const state = await api.getState()
console.log(state.phase)             // 'battle'
console.log(state.score)             // { total, crits, hits, grazes, misses }
console.log(state.activeProjectiles) // projectiles currently in flight
console.log(state.lastHit)           // most recent hit result or null
```

### 7. Advance time deterministically

`advanceTime(ms)` calls `gameMachine.update(ms, [])` directly — bypasses browser RAF timing.
Use it to simulate time passing without waiting for real frames:

```ts
await api.advanceTime(3000)  // jump forward 3 seconds instantly
```

---

## InputEvent Shape

```ts
interface InputEvent {
  pointerId: number   // 0–5, maps to touch points
  action: 'down' | 'move' | 'up'
  x: number           // canvas x coordinate (0–390)
  y: number           // canvas y coordinate (0–844)
  timestamp: number   // Date.now()
}
```

---

## Touch Point Layout (reference)

| pointerId | Side  | Color  | Approx x |
|-----------|-------|--------|----------|
| 0         | Left  | green  | 30–80    |
| 1         | Left  | violet | 30–80    |
| 2         | Left  | orange | 30–80    |
| 3         | Right | blue   | 310–360  |
| 4         | Right | red    | 310–360  |
| 5         | Right | yellow | 310–360  |

y should be in the bottom quarter of the screen (~700–844).

---

## Production Build Guard

`window.__game` is installed only when `import.meta.env.DEV === true`. To verify it is absent in production:

```bash
npm run build
# Inspect dist/ — no reference to __game or testBridge should appear
grep -r '__game' dist/  # must return nothing
```
