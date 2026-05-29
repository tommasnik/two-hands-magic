// ============================================================
// Game Design Spec — Goblin Scout attacks (task-41)
//
// The Goblin Scout is the first enemy that actively attacks the player.
// This spec encodes the design intent for its single Pebble Throw attack:
//
//   1. **No-defense TTK** — if the player never fires, the Goblin's missiles
//      eventually kill the player. Encodes that the enemy is a real pressure
//      source, not just an HP sponge.
//
//   2. **Power user** — kills the Goblin before the first pebble can land.
//      Encodes that mastering the rotation/aim eliminates damage taken.
//
//   3. **Casual player** — gets hit at least once but survives. Encodes that
//      enemy attacks force the casual player to feel the pressure without
//      making the level un-winnable.
//
// All numeric expectations derive from constants.ts — tweaking the goblin's
// damage / cooldown will surface here automatically. The simulations apply
// damage directly via _applyHitForTesting so kill timing is deterministic;
// the EnemyAttackSystem keeps firing during the same simulation, so player
// HP / game_over behaviour is the real product of the live attack pipeline.
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  PIXELS_PER_CM,
  LASER_ORIGIN_Y,
  MAX_DELTA_MS,
  ENEMY_GOBLIN_SCOUT,
  GOBLIN_SCOUT_PEBBLE_ATTACK,
  PLAYER_MAX_HP,
  ENEMY_DEFAULT_Y,
  SLOW_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
} from '../../game/constants'

// ---------------------------------------------------------------------------
// Derived expectations — pure constants composition, no hardcoded numbers
// ---------------------------------------------------------------------------

/** Hits needed to reach 0 player HP at the attack's per-hit damage. */
const HITS_TO_KILL_PLAYER = Math.ceil(PLAYER_MAX_HP / GOBLIN_SCOUT_PEBBLE_ATTACK.damage)

/** Approx flight time of the pebble missile from enemy centre to player centre. */
const MISSILE_TRAVEL_PX = Math.abs(LASER_ORIGIN_Y - ENEMY_DEFAULT_Y)
const MISSILE_FLIGHT_MS =
  (MISSILE_TRAVEL_PX / (GOBLIN_SCOUT_PEBBLE_ATTACK.projectileSpeedCmS * PIXELS_PER_CM)) * 1000

/**
 * Upper-bound TTK on the player when no defense is mounted.
 * Each subsequent hit takes one cooldown to dispatch plus one flight, plus
 * one extra cooldown of slack to absorb step rounding.
 */
const NO_DEFENSE_TTK_MAX_MS =
  HITS_TO_KILL_PLAYER * (GOBLIN_SCOUT_PEBBLE_ATTACK.cooldownMs + MISSILE_FLIGHT_MS) +
  GOBLIN_SCOUT_PEBBLE_ATTACK.cooldownMs

/** Damage of one CRIT from slow_shot — used as a deterministic kill primitive. */
const SLOW_CRIT_DAMAGE = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER

/** Hits with slow_shot CRIT needed to kill the goblin. */
const SLOW_CRITS_TO_KILL_GOBLIN = Math.ceil(ENEMY_GOBLIN_SCOUT.maxHp / SLOW_CRIT_DAMAGE)

// ---------------------------------------------------------------------------
// Helper: advance time in MAX_DELTA_MS chunks
// ---------------------------------------------------------------------------
function advance(machine: GameStateMachine, ms: number): void {
  let remaining = ms
  while (remaining > 0) {
    const step = Math.min(remaining, MAX_DELTA_MS)
    machine.update(step, [])
    remaining -= step
  }
}

// ===========================================================================
// Goblin Scout setup sanity — confirm the level 1 enemy carries the configured attack
// ===========================================================================

describe('Goblin Scout — encounter setup (task-41)', () => {
  it('Level 1 enemy is Goblin Scout with the Pebble Throw attack', () => {
    const machine = new GameStateMachine()
    machine.startBattle()
    expect(machine.getState().enemyName).toBe(ENEMY_GOBLIN_SCOUT.name)
    expect(ENEMY_GOBLIN_SCOUT.attacks).toBeDefined()
    expect(ENEMY_GOBLIN_SCOUT.attacks).toContain(GOBLIN_SCOUT_PEBBLE_ATTACK)
  })

  it('starts the battle with the player at full HP and no missiles in flight', () => {
    const machine = new GameStateMachine()
    machine.startBattle()
    const state = machine.getState()
    expect(state.player.hp).toBe(PLAYER_MAX_HP)
    expect(state.incomingMissiles).toEqual([])
    expect(state.lastPlayerHit).toBeNull()
  })
})

// ===========================================================================
// 1. NO-DEFENSE TTK — enemy kills the player when the player never fights back
// ===========================================================================

describe('Goblin Scout — no-defense scenario kills the player (task-41)', () => {
  it('reaches game_over within the projected TTK window when the player never attacks', () => {
    const machine = new GameStateMachine()
    machine.startBattle()
    advance(machine, NO_DEFENSE_TTK_MAX_MS)
    const state = machine.getState()
    expect(state.phase).toBe('game_over')
    expect(state.player.hp).toBe(0)
  })

  it('records the final hit damage as the per-attack damage on lastPlayerHit', () => {
    const machine = new GameStateMachine()
    machine.startBattle()
    advance(machine, NO_DEFENSE_TTK_MAX_MS)
    expect(machine.getState().lastPlayerHit?.damage).toBe(GOBLIN_SCOUT_PEBBLE_ATTACK.damage)
  })

  it('takes at least the projected number of hits to reach zero', () => {
    // Apply player damage in small steps and count how many incoming hits land.
    const machine = new GameStateMachine()
    machine.startBattle()
    let hits = 0
    let lastTs = -1
    while (machine.getState().phase === 'battle') {
      advance(machine, 100)
      const evt = machine.getState().lastPlayerHit
      if (evt && evt.timestamp !== lastTs) {
        hits++
        lastTs = evt.timestamp
      }
    }
    expect(hits).toBe(HITS_TO_KILL_PLAYER)
  })
})

// ===========================================================================
// 2. POWER USER — kills the goblin before the first pebble lands
//
// A power user executes optimal aim and skill rotation. We model this by
// dealing the deterministic slow_shot CRIT damage repeatedly with only the
// rotation period between shots — fast enough that the encounter ends well
// before the first goblin pebble completes its flight.
// ===========================================================================

describe('Goblin Scout — power user takes no damage (task-41)', () => {
  /** Theoretical earliest moment a pebble can hit: first cooldown plus full flight. */
  const EARLIEST_PEBBLE_HIT_MS =
    GOBLIN_SCOUT_PEBBLE_ATTACK.cooldownMs + MISSILE_FLIGHT_MS

  /** Power-user kill budget: comfortably under the earliest possible pebble impact. */
  const POWER_USER_KILL_BUDGET_MS = GOBLIN_SCOUT_PEBBLE_ATTACK.cooldownMs

  it(
    `defeats the goblin in under ${EARLIEST_PEBBLE_HIT_MS.toFixed(0)} ms and takes no damage`,
    () => {
      const machine = new GameStateMachine()
      machine.startBattle()

      // Apply CRIT slow_shot hits as fast as the game tick allows.
      // Each iteration advances by one tick so EnemyAttackSystem still sees update().
      for (let i = 0; i < SLOW_CRITS_TO_KILL_GOBLIN; i++) {
        machine._applyHitForTesting('CRIT', 'slow_shot')
        advance(machine, 50)
      }

      const state = machine.getState()
      expect(state.phase).toBe('fight_overview')
      expect(state.elapsedMs).toBeLessThan(POWER_USER_KILL_BUDGET_MS)
      expect(state.player.hp).toBe(PLAYER_MAX_HP)
      expect(state.lastPlayerHit).toBeNull()
    },
  )
})

// ===========================================================================
// 3. CASUAL PLAYER — gets hit at least once but survives
//
// A casual player is slower: we model 1 deterministic CRIT every ~2 s. The
// goblin's first pebble lands at ~cooldown + flight, well within reach, so
// the player feels exactly one pebble before defeating the goblin.
// ===========================================================================

describe('Goblin Scout — casual player feels the pressure but survives (task-41)', () => {
  /** Casual rhythm: a damaging shot connects every CASUAL_SHOT_INTERVAL_MS. */
  const CASUAL_SHOT_INTERVAL_MS = 2000

  it('takes at least one pebble hit yet finishes the encounter alive', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    let shotsFired = 0
    while (
      machine.getState().phase === 'battle' &&
      shotsFired < SLOW_CRITS_TO_KILL_GOBLIN
    ) {
      advance(machine, CASUAL_SHOT_INTERVAL_MS)
      if (machine.getState().phase !== 'battle') break
      machine._applyHitForTesting('CRIT', 'slow_shot')
      shotsFired++
    }

    const state = machine.getState()
    expect(state.phase).toBe('fight_overview')
    // Pressure landed at least once…
    expect(state.lastPlayerHit).not.toBeNull()
    // …but the casual player is alive at the end.
    expect(state.player.hp).toBeGreaterThan(0)
  })
})
