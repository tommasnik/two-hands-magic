# Skill: code-review — two-hands-magic

When the user invokes `/code-review` or asks for a code review, apply ALL of the following lenses in order and report every finding. Be harsh. Do not skip findings because they seem minor. Prioritize: Critical > High > Medium > Low.

---

## Review Lenses

### 1. Code Quality
- **Pure functions**: classes with no state should be free functions; stateful helpers should be clearly separate from pure transforms
- **Naming**: function and variable names must say WHY, not what (avoid `_handler`, `_helper`; prefer intent names)
- **DRY**: identical geometry/logic blocks duplicated across functions must be flagged
- **Comments**: only justify non-obvious WHY; never restate what the code does or what parameters are
- **Docstrings on data fields**: if the field name + JSDoc type already says it, the comment is noise — flag it
- **Dead code**: unused exports, unused parameters, unused features (constants that no system reads)
- **Open-Closed**: new hit result types, new skill types, new phases must not require editing if/switch chains
- **SoC**: rendering logic must not contain game logic; game logic must not import Phaser

### 2. Architecture — State and Phaser Separation
- `src/game/**` must have zero Phaser imports — grep-verify mentally
- Scenes do exactly three things: translate input → `InputEvent[]`, call `game.update()`, render `GameState`
- Any timer, counter, or condition in a scene that drives a state transition belongs in the state machine
- `getState()` must return a complete snapshot — no state should live only in the scene

### 3. Game Design Test Framework
- Every `EnemyDef` field (`hitZone`, `size`, `movementPattern`, `critZone`, special multipliers) must be read by at least one game system OR be clearly marked as a future-only design field with a TODO
- Game design specs must test actual gameplay feel (timing, hit probability), not just HP math
- The `runner.ts` metric vocabulary (`timeToFirstCrit`, `timeToFirstHit`, `atLeastOneHit`, `totalEncounterTime`) must be sufficient to express all game design assertions — flag gaps
- `_applyHitForTesting` bypasses hit geometry; specs that only use it do NOT test hitbox behavior
- No hardcoded numbers in game design tests — all values derived from `constants.ts`

### 4. Resolution Independence (Portrait Mobile)
- No hardcoded pixel values in game logic that aren't derived from `GAME_WIDTH`, `GAME_HEIGHT`, or `PIXELS_PER_CM`
- `PIXELS_PER_CM` fallback path must be tested (cmRef measurement can silently fail)
- Touch target sizes must be in cm constants, never raw px magic numbers
- Phaser `FIT` scaling handles physical resolution — logical coordinates stay in 390×844 space — flag any violation

### 5. Agent Best Practices
- `window.__game` test bridge must expose a `reset()` / clean-state method — agents re-run tests without reload
- `advanceTime(ms)` in the test bridge must advance game time by exactly `ms` — if it's capped by `MAX_DELTA_MS`, agents can't reason about time deterministically
- `CLAUDE.md` must document every `window.__game` method, including edge cases
- Every public API that an agent might call must have a documented precondition (e.g. must call `startBattle()` before `update()`)
- Test helpers must not require reasoning about internal physics to construct assertions

### 6. KISS / Over-Engineering
- Flag any subsystem that is fully implemented but never used (dead code paths, wired-up but disconnected)
- Flag any data that is defined/documented but never read by game logic
- Flag `async` functions that perform no async operations
- Two parallel data structures for the same concept = flag for merge
- Class with no instance state = flag for conversion to function
- Speculative design fields (not yet wired) must be explicitly marked or removed

---

## Output Format

Group findings by severity:

```
## Critical
[file:line] Short description — why it matters

## High
...

## Medium
...

## Low / Style
...
```

Each finding: one short sentence describing the problem, one short sentence on the impact.
