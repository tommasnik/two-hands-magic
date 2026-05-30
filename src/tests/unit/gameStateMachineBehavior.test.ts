// ============================================================
// GameStateMachine — EnemyBehaviorRunner + DeliverySystem integration (TASK-60.4)
//
// These tests register real character manifests on the shared CharacterRegistry
// singleton so the machine builds an AnimationController per enemy (the
// manifest branch of _loadLevel that the plain gameStateMachine.test.ts — which
// registers nothing — cannot reach). They then inject behaviour graphs via
// _initBehaviorGraphForTesting (ENEMY_POOL entries carry no graph yet; graph
// configuration lands in TASK-60.6) to exercise the runner → delivery → player
// hit wiring, stun freezing, and animation driving.
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import { characterRegistry } from '../../game/CharacterRegistry'
import { MaskHitDetector } from '../../game/systems/MaskHitDetector'
import { MAX_DELTA_MS, PLAYER_MAX_HP } from '../../game/constants'
import type { AttackSpec, BehaviorGraph } from '../../types'

// ENEMY_POOL order: [0] stone-giant, [1] ice-giant, [2] ember-wisp, …
// stone-giant: attack animation declares masks → needs a MaskHitDetector.
// ice-giant / ember-wisp: no masks. ember-wisp's EnemyDef omits displayWidth,
// so its render width must fall back to the manifest value.
beforeAll(() => {
  characterRegistry.register({
    id: 'stone-giant',
    spriteKey: 'stone_giant',
    displayWidth: 400,
    animations: {
      idle: { frameCount: 4, frameDurationMs: 100, loop: true, hasMasks: false },
      attack: { frameCount: 3, frameDurationMs: 50, loop: false, hasMasks: true },
    },
  })
  characterRegistry.register({
    id: 'ice-giant',
    spriteKey: 'ice_giant',
    displayWidth: 248,
    animations: {
      attack: { frameCount: 3, frameDurationMs: 50, loop: false, hasMasks: false },
      throw: { frameCount: 3, frameDurationMs: 50, loop: false, hasMasks: false },
    },
  })
  characterRegistry.register({
    id: 'ember-wisp',
    spriteKey: 'ember_wisp',
    displayWidth: 256,
    animations: {
      idle: { frameCount: 4, frameDurationMs: 100, loop: true, hasMasks: false },
      attack: { frameCount: 3, frameDurationMs: 50, loop: false, hasMasks: false },
    },
  })
})

/** Advance the machine by `ms` in MAX_DELTA_MS chunks (mirrors the test bridge). */
function advance(gsm: GameStateMachine, ms: number): void {
  let remaining = ms
  while (remaining > 0) {
    const step = Math.min(remaining, MAX_DELTA_MS)
    gsm.update(step, [])
    remaining -= step
  }
}

/** Start a battle with a mask detector installed (required by stone-giant). */
function startWithDetector(graph?: BehaviorGraph): GameStateMachine {
  const gsm = new GameStateMachine(undefined, () => 0) // deterministic rng
  gsm.setMaskDetector(new MaskHitDetector())
  gsm.startBattle()
  if (graph) gsm._initBehaviorGraphForTesting(graph)
  return gsm
}

/** A graph that dwells in idle, then fires one orb attack on the attack node's first frame. */
function orbGraph(damage: number, speedCmS: number): BehaviorGraph {
  const orb: AttackSpec = {
    damage,
    releaseFrame: 0,
    kind: 'orb',
    visualKey: 'test_orb',
    projectileSpeedCmS: speedCmS,
    castPoint: { dx: 0, dy: 0 },
  }
  return {
    start: 'idle',
    nodes: {
      idle: {
        id: 'idle',
        animKey: 'idle',
        exitTrigger: { kind: 'afterMs', ms: 50 },
        edges: [{ to: 'attack', weight: 1 }],
      },
      attack: {
        id: 'attack',
        animKey: 'attack',
        exitTrigger: { kind: 'animationComplete' },
        attack: orb,
        edges: [{ to: 'idle', weight: 1 }],
      },
    },
  }
}

// ---------------------------------------------------------------------------
// _loadLevel — manifest branch (AnimationController + mask resolution)
// ---------------------------------------------------------------------------

describe('GameStateMachine — manifest-driven enemy loading', () => {
  it('throws when a manifest declares masks but no MaskHitDetector is set', () => {
    const gsm = new GameStateMachine()
    expect(() => gsm.startBattle()).toThrow(/hasMasks but no MaskHitDetector/)
  })

  it('loads a masked enemy when a detector is available', () => {
    const gsm = startWithDetector()
    expect(gsm.getState().phase).toBe('battle')
    expect(gsm.getState().enemyManifestId).toBe('stone-giant')
  })

  it('uses the EnemyDef displayWidth override when present (stone-giant)', () => {
    const gsm = startWithDetector()
    expect(gsm.getState().enemyDisplayWidth).toBe(400)
  })

  it('falls back to the manifest displayWidth when the EnemyDef omits it (ember-wisp)', () => {
    const gsm = startWithDetector()
    // ENEMY_POOL: [0] stone-giant … [4] ember-wisp. ember-wisp's EnemyDef omits
    // displayWidth, so the render width must come from its registered manifest.
    while (gsm.getState().enemyManifestId !== 'ember-wisp') {
      advanceToNextEnemy(gsm)
    }
    expect(gsm.getState().enemyDisplayWidth).toBe(256)
  })
})

/** Kill the current enemy and advance to the next level, clearing any level-up gate. */
function advanceToNextEnemy(gsm: GameStateMachine): void {
  while (gsm.getState().enemyHp > 0) {
    gsm._applyHitForTesting('CRIT', 'slow_shot')
  }
  gsm.confirmLevelUpUpgrade() // no-op when no level-up is pending
  gsm.nextLevel()
}

// ---------------------------------------------------------------------------
// Runner → delivery → player hit (AC#1)
// ---------------------------------------------------------------------------

describe('GameStateMachine — behaviour runner spawns deliveries (AC#1)', () => {
  it('a graph with no runner (default ENEMY_POOL) never spawns deliveries', () => {
    const gsm = startWithDetector() // no graph injected
    advance(gsm, 4000)
    expect(gsm.getState().activeDeliveries).toEqual([])
    expect(gsm.getState().player.hp).toBe(gsm.getState().player.maxHp)
  })

  it('emits an orb on the attack release frame and exposes it via activeDeliveries', () => {
    const gsm = startWithDetector(orbGraph(10, 2)) // slow orb → stays in flight
    // idle dwell (50ms) + one attack frame → orb spawned, still travelling.
    advance(gsm, 200)
    const deliveries = gsm.getState().activeDeliveries
    expect(deliveries.length).toBeGreaterThan(0)
    expect(deliveries[0].kind).toBe('orb')
    expect(deliveries[0].visualKey).toBe('test_orb')
  })

  it('a fast orb connects and deals damage to the player', () => {
    const gsm = startWithDetector(orbGraph(10, 500)) // fast orb → connects quickly
    advance(gsm, 1000)
    const state = gsm.getState()
    expect(state.player.hp).toBeLessThan(state.player.maxHp)
  })

  it('a lethal delivery connect drives the game to game_over', () => {
    const gsm = startWithDetector(orbGraph(PLAYER_MAX_HP + 100, 500))
    advance(gsm, 1000)
    expect(gsm.getState().phase).toBe('game_over')
  })
})

// ---------------------------------------------------------------------------
// Animation driving from the active node (AC#2)
// ---------------------------------------------------------------------------

describe('GameStateMachine — enemy animation follows the active node (AC#2)', () => {
  it('plays the start node animation and keeps it while the node is active', () => {
    const gsm = startWithDetector(orbGraph(10, 500))
    gsm.update(30, []) // inside the 50ms idle dwell window
    expect(gsm.getState().enemyAnimKey).toBe('idle')
  })

  it('switches to the attack animation when the runner enters the attack node', () => {
    const gsm = startWithDetector(orbGraph(10, 2))
    advance(gsm, 120) // past idle dwell → attack node active
    expect(gsm.getState().enemyAnimKey).toBe('attack')
  })

  it('a holdFrame start node freezes the configured frame', () => {
    const holdGraph: BehaviorGraph = {
      start: 'rest',
      nodes: {
        rest: {
          id: 'rest',
          animKey: 'hold',
          holdFrame: { animKey: 'attack', frameIndex: 1 },
          exitTrigger: { kind: 'afterMs', ms: 5000 },
          edges: [],
        },
      },
    }
    const gsm = startWithDetector(holdGraph)
    gsm.update(MAX_DELTA_MS, [])
    expect(gsm.getState().enemyAnimKey).toBe('attack')
    expect(gsm.getState().enemyFrameIndex).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Stun freezes the runner; in-flight deliveries continue (AC#3)
// ---------------------------------------------------------------------------

describe('GameStateMachine — stun freezes the runner (AC#3)', () => {
  /** Lock the enemy into a stun window via a crit + the crit-stun upgrade chain. */
  function applyStun(gsm: GameStateMachine): number {
    gsm._applyUpgradeForTesting('crit_dmg_1')
    gsm._applyUpgradeForTesting('crit_dmg_2')
    gsm._applyUpgradeForTesting('crit_stun_1')
    gsm._applyHitForTesting('CRIT', 'slow_shot') // rng=0 → stun roll succeeds
    return gsm.getState().enemy.stunnedUntilMs
  }

  it('does not spawn new deliveries while stunned', () => {
    const gsm = startWithDetector(orbGraph(10, 2))
    const stunUntil = applyStun(gsm)
    expect(stunUntil).toBeGreaterThan(gsm.getState().elapsedMs)
    // Advance well past the 50ms idle dwell but stay inside the stun window.
    advance(gsm, 200)
    expect(gsm.getState().elapsedMs).toBeLessThan(stunUntil)
    expect(gsm.getState().activeDeliveries).toEqual([])
    expect(gsm.getState().player.hp).toBe(gsm.getState().player.maxHp)
  })

  it('lets an already-in-flight delivery connect even while stunned', () => {
    const gsm = startWithDetector(orbGraph(10, 2)) // slow orb
    // Let the orb spawn first (idle dwell + one attack frame).
    advance(gsm, 200)
    expect(gsm.getState().activeDeliveries.length).toBeGreaterThan(0)
    // Now stun the enemy: the runner freezes, but the orb keeps travelling.
    const stunUntil = applyStun(gsm)
    expect(stunUntil).toBeGreaterThan(gsm.getState().elapsedMs)
    advance(gsm, 6000) // long enough for the slow orb to land
    expect(gsm.getState().player.hp).toBeLessThan(gsm.getState().player.maxHp)
  })
})
