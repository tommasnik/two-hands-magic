// ============================================================
// PhaseManager unit tests
// ============================================================

import { describe, it, expect } from 'vitest'
import { PhaseManager } from '../../game/systems/PhaseManager'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const alive = { hp: 10 }
const dead = { hp: 0 }
const aliveEnemy = { hp: 20 }
const deadEnemy = { hp: 0 }

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('PhaseManager — initial state', () => {
  it('defaults to loading phase', () => {
    const pm = new PhaseManager()
    expect(pm.currentPhase).toBe('loading')
  })

  it('accepts a custom initial phase', () => {
    const pm = new PhaseManager('battle')
    expect(pm.currentPhase).toBe('battle')
  })

  it('didTransition() returns false initially', () => {
    const pm = new PhaseManager()
    expect(pm.didTransition()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// forceTransition
// ---------------------------------------------------------------------------

describe('PhaseManager — forceTransition()', () => {
  it('transitions to the given phase', () => {
    const pm = new PhaseManager('loading')
    pm.forceTransition('battle')
    expect(pm.currentPhase).toBe('battle')
  })

  it('resets didTransition flag after forceTransition', () => {
    const pm = new PhaseManager('battle')
    pm.evaluate(dead, aliveEnemy) // triggers game_over → transitioned=true
    pm.forceTransition('battle')
    expect(pm.didTransition()).toBe(false)
  })

  it('can force any phase regardless of current phase', () => {
    const pm = new PhaseManager('game_over')
    pm.forceTransition('battle')
    expect(pm.currentPhase).toBe('battle')
  })
})

// ---------------------------------------------------------------------------
// evaluate() — battle phase
// ---------------------------------------------------------------------------

describe('PhaseManager — evaluate() in battle phase', () => {
  it('does nothing when both player and enemy are alive', () => {
    const pm = new PhaseManager('battle')
    pm.evaluate(alive, aliveEnemy)
    expect(pm.currentPhase).toBe('battle')
    expect(pm.didTransition()).toBe(false)
  })

  it('transitions to fight_overview when enemy hp reaches 0', () => {
    const pm = new PhaseManager('battle')
    pm.evaluate(alive, deadEnemy)
    expect(pm.currentPhase).toBe('fight_overview')
    expect(pm.didTransition()).toBe(true)
  })

  it('transitions to game_over when player hp reaches 0', () => {
    const pm = new PhaseManager('battle')
    pm.evaluate(dead, aliveEnemy)
    expect(pm.currentPhase).toBe('game_over')
    expect(pm.didTransition()).toBe(true)
  })

  it('enemy death takes priority over player death when both are at 0', () => {
    const pm = new PhaseManager('battle')
    pm.evaluate(dead, deadEnemy)
    expect(pm.currentPhase).toBe('fight_overview')
    expect(pm.didTransition()).toBe(true)
  })

  it('resets didTransition flag on each evaluate() call', () => {
    const pm = new PhaseManager('battle')
    pm.evaluate(alive, deadEnemy)
    expect(pm.didTransition()).toBe(true)
    // After transition, phase is fight_overview — next evaluate from battle would be a no-op
    // But calling didTransition again still returns true until next evaluate
    expect(pm.didTransition()).toBe(true)
  })

  it('evaluate() resets transitioned flag on the next call', () => {
    const pm = new PhaseManager('battle')
    pm.evaluate(alive, deadEnemy) // transitions to fight_overview, didTransition=true
    // Now phase is fight_overview — evaluate won't fire enemy death again
    pm.evaluate(alive, deadEnemy) // no-op (player alive), didTransition resets to false
    expect(pm.didTransition()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// evaluate() — fight_overview phase (player-death from in-flight deliveries)
// ---------------------------------------------------------------------------

describe('PhaseManager — evaluate() in fight_overview phase', () => {
  it('allows player death → game_over from fight_overview', () => {
    const pm = new PhaseManager('fight_overview')
    pm.evaluate(dead, deadEnemy)
    expect(pm.currentPhase).toBe('game_over')
    expect(pm.didTransition()).toBe(true)
  })

  it('does nothing when player is still alive in fight_overview', () => {
    const pm = new PhaseManager('fight_overview')
    pm.evaluate(alive, deadEnemy)
    expect(pm.currentPhase).toBe('fight_overview')
    expect(pm.didTransition()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// evaluate() — non-battle, non-fight_overview phases are no-ops
// ---------------------------------------------------------------------------

describe('PhaseManager — evaluate() is a no-op in terminal phases', () => {
  it('does nothing in loading phase', () => {
    const pm = new PhaseManager('loading')
    pm.evaluate(dead, deadEnemy)
    expect(pm.currentPhase).toBe('loading')
    expect(pm.didTransition()).toBe(false)
  })

  it('does nothing in game_over phase', () => {
    const pm = new PhaseManager('game_over')
    pm.evaluate(dead, deadEnemy)
    expect(pm.currentPhase).toBe('game_over')
    expect(pm.didTransition()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Typical battle lifecycle
// ---------------------------------------------------------------------------

describe('PhaseManager — typical battle lifecycle', () => {
  it('loading → battle → fight_overview → battle (via forceTransition)', () => {
    const pm = new PhaseManager('loading')

    pm.forceTransition('battle')
    expect(pm.currentPhase).toBe('battle')

    pm.evaluate(alive, deadEnemy)
    expect(pm.currentPhase).toBe('fight_overview')
    expect(pm.didTransition()).toBe(true)

    pm.forceTransition('battle')
    expect(pm.currentPhase).toBe('battle')
    expect(pm.didTransition()).toBe(false)
  })

  it('battle → game_over → battle (via forceTransition for restartLevel)', () => {
    const pm = new PhaseManager('battle')

    pm.evaluate(dead, aliveEnemy)
    expect(pm.currentPhase).toBe('game_over')
    expect(pm.didTransition()).toBe(true)

    pm.forceTransition('battle')
    expect(pm.currentPhase).toBe('battle')
    expect(pm.didTransition()).toBe(false)
  })

  it('fight_overview → game_over when in-flight delivery kills player', () => {
    const pm = new PhaseManager('battle')

    // Enemy dies → fight_overview
    pm.evaluate(alive, deadEnemy)
    expect(pm.currentPhase).toBe('fight_overview')

    // An in-flight delivery connects and kills player
    pm.evaluate(dead, deadEnemy)
    expect(pm.currentPhase).toBe('game_over')
    expect(pm.didTransition()).toBe(true)
  })
})
