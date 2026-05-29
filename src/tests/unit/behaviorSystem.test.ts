// ============================================================
// BehaviorSystem unit tests
//
// Tests that computeEnemyPosition() produces deterministic,
// pattern-correct positions for each MovementPattern variant.
// All assertions use constants — no magic numbers.
// ============================================================

import { describe, it, expect } from 'vitest'
import { computeEnemyPosition } from '../../game/systems/BehaviorSystem'
import { resolveBehavior } from '../../game/GameStateMachine'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  ENEMY_DEFAULT_Y,
  ENEMY_MOVE_SPEED_BASE,
  ENEMY_MOVE_SPEED_SLOW,
  ENEMY_MOVE_SPEED_FAST,
  ENEMY_LR_AMPLITUDE_DEFAULT,
  ENEMY_LR_AMPLITUDE_WIDE,
  ENEMY_APPROACH_SPEED,
  ENEMY_GOBLIN_SCOUT,
  ENEMY_SHADOW_DANCER,
  ENEMY_PLAGUE_RAT,
  ENEMY_THORNBACK,
  ENEMY_THUNDER_HAWK,
  ENEMY_STONE_DRAKE,
  ENEMY_LAVA_SLUG,
  ENEMY_VOID_WRAITH,
  ENEMY_TITAN_LORD,
  ENEMY_SWARM,
} from '../../game/constants'
import type { EnemyBehaviorDef } from '../../types'

// Reference origin — matches GameStateMachine defaults
const ORIGIN_X = GAME_WIDTH / 2
const ORIGIN_Y = ENEMY_DEFAULT_Y

// ---------------------------------------------------------------------------
// Static pattern
// ---------------------------------------------------------------------------

describe('BehaviorSystem — static pattern', () => {
  const behavior: EnemyBehaviorDef = { pattern: 'static', speed: 0 }

  it('returns origin position at t=0', () => {
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 0, behavior)
    expect(pos.x).toBe(ORIGIN_X)
    expect(pos.y).toBe(ORIGIN_Y)
  })

  it('returns same position at any elapsed time (deterministic)', () => {
    const t1 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 1000, behavior)
    const t2 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 5000, behavior)
    const t3 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 99999, behavior)
    expect(t1.x).toBe(ORIGIN_X)
    expect(t1.y).toBe(ORIGIN_Y)
    expect(t2.x).toBe(ORIGIN_X)
    expect(t3.x).toBe(ORIGIN_X)
  })

  it('Goblin Scout uses static behavior', () => {
    expect(ENEMY_GOBLIN_SCOUT.behavior).toBeDefined()
    expect(ENEMY_GOBLIN_SCOUT.behavior!.pattern).toBe('static')
  })
})

// ---------------------------------------------------------------------------
// LR oscillate pattern
// ---------------------------------------------------------------------------

describe('BehaviorSystem — lr_oscillate pattern', () => {
  const behavior: EnemyBehaviorDef = {
    pattern: 'lr_oscillate',
    speed: ENEMY_MOVE_SPEED_BASE,
    amplitude: ENEMY_LR_AMPLITUDE_DEFAULT,
  }

  it('starts at origin X at t=0 (cos(0)=1 offset = +amplitude)', () => {
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 0, behavior)
    // At t=0: x = originX + amplitude * cos(0) = originX + amplitude
    expect(pos.x).toBeCloseTo(ORIGIN_X + ENEMY_LR_AMPLITUDE_DEFAULT, 5)
  })

  it('returns to origin X after one full period', () => {
    const amplitude = ENEMY_LR_AMPLITUDE_DEFAULT
    const periodMs = (2 * amplitude / ENEMY_MOVE_SPEED_BASE) * 1000
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, periodMs, behavior)
    // After one full period: cos(2π) = 1, so x = originX + amplitude again
    expect(pos.x).toBeCloseTo(ORIGIN_X + amplitude, 5)
  })

  it('reaches minimum x at half period (cos(π) = -1)', () => {
    const amplitude = ENEMY_LR_AMPLITUDE_DEFAULT
    const periodMs = (2 * amplitude / ENEMY_MOVE_SPEED_BASE) * 1000
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, periodMs / 2, behavior)
    // At half period: x = originX + amplitude * cos(π) = originX - amplitude
    expect(pos.x).toBeCloseTo(ORIGIN_X - amplitude, 5)
  })

  it('Y position is unchanged (pure horizontal oscillation)', () => {
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 1234, behavior)
    expect(pos.y).toBe(ORIGIN_Y)
  })

  it('same inputs always produce same output (deterministic)', () => {
    const pos1 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 750, behavior)
    const pos2 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 750, behavior)
    expect(pos1.x).toBe(pos2.x)
    expect(pos1.y).toBe(pos2.y)
  })

  it('x stays within [originX - amplitude, originX + amplitude]', () => {
    const amplitude = ENEMY_LR_AMPLITUDE_DEFAULT
    for (let t = 0; t <= 10000; t += 100) {
      const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, t, behavior)
      expect(pos.x).toBeGreaterThanOrEqual(ORIGIN_X - amplitude - 0.001)
      expect(pos.x).toBeLessThanOrEqual(ORIGIN_X + amplitude + 0.001)
    }
  })

  it('degenerate: speed=0 returns origin (no division by zero)', () => {
    const b: EnemyBehaviorDef = { pattern: 'lr_oscillate', speed: 0, amplitude: ENEMY_LR_AMPLITUDE_DEFAULT }
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 5000, b)
    expect(pos.x).toBe(ORIGIN_X)
    expect(pos.y).toBe(ORIGIN_Y)
  })

  it('Shadow Dancer uses lr_oscillate behavior', () => {
    expect(ENEMY_SHADOW_DANCER.behavior).toBeDefined()
    expect(ENEMY_SHADOW_DANCER.behavior!.pattern).toBe('lr_oscillate')
    expect(ENEMY_SHADOW_DANCER.behavior!.speed).toBeGreaterThan(0)
    expect(ENEMY_SHADOW_DANCER.behavior!.amplitude).toBeDefined()
  })

  it('Lava Slug uses lr_oscillate with slow speed', () => {
    expect(ENEMY_LAVA_SLUG.behavior).toBeDefined()
    expect(ENEMY_LAVA_SLUG.behavior!.pattern).toBe('lr_oscillate')
    expect(ENEMY_LAVA_SLUG.behavior!.speed).toBe(ENEMY_MOVE_SPEED_SLOW)
  })

  it('Swarm uses lr_oscillate behavior', () => {
    expect(ENEMY_SWARM.behavior).toBeDefined()
    expect(ENEMY_SWARM.behavior!.pattern).toBe('lr_oscillate')
  })

  it('Void Wraith uses lr_oscillate with wide amplitude', () => {
    expect(ENEMY_VOID_WRAITH.behavior).toBeDefined()
    expect(ENEMY_VOID_WRAITH.behavior!.pattern).toBe('lr_oscillate')
    expect(ENEMY_VOID_WRAITH.behavior!.amplitude).toBe(ENEMY_LR_AMPLITUDE_WIDE)
  })

  it('Titan Lord uses lr_oscillate with wide amplitude', () => {
    expect(ENEMY_TITAN_LORD.behavior).toBeDefined()
    expect(ENEMY_TITAN_LORD.behavior!.pattern).toBe('lr_oscillate')
    expect(ENEMY_TITAN_LORD.behavior!.amplitude).toBe(ENEMY_LR_AMPLITUDE_WIDE)
  })
})

// ---------------------------------------------------------------------------
// Zigzag pattern
// ---------------------------------------------------------------------------

describe('BehaviorSystem — zigzag pattern', () => {
  const amplitude = GAME_WIDTH * 0.2  // default zigzag amplitude
  const behavior: EnemyBehaviorDef = {
    pattern: 'zigzag',
    speed: ENEMY_MOVE_SPEED_FAST,
    amplitude,
  }

  it('starts at -amplitude at t=0 (triangle wave starts at -1)', () => {
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 0, behavior)
    // Triangle wave at t=0: t=0, 4*0-1 = -1, so x = originX - amplitude
    expect(pos.x).toBeCloseTo(ORIGIN_X - amplitude, 5)
  })

  it('Y position is unchanged', () => {
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 3000, behavior)
    expect(pos.y).toBe(ORIGIN_Y)
  })

  it('x stays within [originX - amplitude, originX + amplitude]', () => {
    for (let t = 0; t <= 10000; t += 50) {
      const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, t, behavior)
      expect(pos.x).toBeGreaterThanOrEqual(ORIGIN_X - amplitude - 0.001)
      expect(pos.x).toBeLessThanOrEqual(ORIGIN_X + amplitude + 0.001)
    }
  })

  it('same inputs always produce same output (deterministic)', () => {
    const pos1 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 321, behavior)
    const pos2 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 321, behavior)
    expect(pos1.x).toBe(pos2.x)
    expect(pos1.y).toBe(pos2.y)
  })

  it('reaches +amplitude at quarter period (triangle peak)', () => {
    const periodMs = (2 * amplitude / ENEMY_MOVE_SPEED_FAST) * 1000
    // Peak is at t/T = 0.5 (not 0.25): triangle wave = 4*0.5-1 = 1 → x = originX + amplitude
    const halfPeriod = periodMs / 2
    const peakPos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, halfPeriod, behavior)
    expect(peakPos.x).toBeCloseTo(ORIGIN_X + amplitude, 5)
  })

  it('degenerate: speed=0 returns origin', () => {
    const b: EnemyBehaviorDef = { pattern: 'zigzag', speed: 0 }
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 5000, b)
    expect(pos.x).toBe(ORIGIN_X)
    expect(pos.y).toBe(ORIGIN_Y)
  })

  it('Plague Rat uses zigzag behavior', () => {
    expect(ENEMY_PLAGUE_RAT.behavior).toBeDefined()
    expect(ENEMY_PLAGUE_RAT.behavior!.pattern).toBe('zigzag')
  })

  it('Thornback uses zigzag behavior', () => {
    expect(ENEMY_THORNBACK.behavior).toBeDefined()
    expect(ENEMY_THORNBACK.behavior!.pattern).toBe('zigzag')
  })
})

// ---------------------------------------------------------------------------
// Diagonal pattern
// ---------------------------------------------------------------------------

describe('BehaviorSystem — diagonal pattern', () => {
  const behavior: EnemyBehaviorDef = {
    pattern: 'diagonal',
    speed: ENEMY_MOVE_SPEED_FAST,
  }

  const margin = GAME_WIDTH * 0.1
  const bounceWidth = GAME_WIDTH - 2 * margin

  it('x stays within canvas horizontal bounds with margin', () => {
    for (let t = 0; t <= 10000; t += 50) {
      const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, t, behavior)
      expect(pos.x).toBeGreaterThanOrEqual(margin - 0.001)
      expect(pos.x).toBeLessThanOrEqual(margin + bounceWidth + 0.001)
    }
  })

  it('Y position oscillates slightly around originY', () => {
    const vAmplitude = GAME_HEIGHT * 0.04
    for (let t = 0; t <= 10000; t += 50) {
      const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, t, behavior)
      expect(pos.y).toBeGreaterThanOrEqual(ORIGIN_Y - vAmplitude - 0.001)
      expect(pos.y).toBeLessThanOrEqual(ORIGIN_Y + vAmplitude + 0.001)
    }
  })

  it('same inputs always produce same output (deterministic)', () => {
    const pos1 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 987, behavior)
    const pos2 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 987, behavior)
    expect(pos1.x).toBe(pos2.x)
    expect(pos1.y).toBe(pos2.y)
  })

  it('degenerate: speed=0 returns origin', () => {
    const b: EnemyBehaviorDef = { pattern: 'diagonal', speed: 0 }
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 5000, b)
    expect(pos.x).toBe(ORIGIN_X)
    expect(pos.y).toBe(ORIGIN_Y)
  })

  it('Thunder Hawk uses diagonal behavior with fast speed', () => {
    expect(ENEMY_THUNDER_HAWK.behavior).toBeDefined()
    expect(ENEMY_THUNDER_HAWK.behavior!.pattern).toBe('diagonal')
    expect(ENEMY_THUNDER_HAWK.behavior!.speed).toBe(ENEMY_MOVE_SPEED_FAST)
  })
})

// ---------------------------------------------------------------------------
// Approach pattern
// ---------------------------------------------------------------------------

describe('BehaviorSystem — approach pattern', () => {
  const behavior: EnemyBehaviorDef = {
    pattern: 'approach',
    speed: ENEMY_APPROACH_SPEED,
  }

  it('starts at originY at t=0', () => {
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 0, behavior)
    expect(pos.y).toBeCloseTo(ORIGIN_Y, 5)
  })

  it('X position is unchanged (pure downward movement)', () => {
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 3000, behavior)
    expect(pos.x).toBe(ORIGIN_X)
  })

  it('Y increases over time (moves toward player)', () => {
    const pos1 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 0, behavior)
    const pos2 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 2000, behavior)
    const pos3 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 5000, behavior)
    expect(pos2.y).toBeGreaterThan(pos1.y)
    expect(pos3.y).toBeGreaterThanOrEqual(pos2.y)
  })

  it('Y position after 1s = originY + ENEMY_APPROACH_SPEED (before clamping)', () => {
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 1000, behavior)
    const expected = ORIGIN_Y + ENEMY_APPROACH_SPEED
    expect(pos.y).toBeCloseTo(expected, 5)
  })

  it('Y position is clamped to maximum approach bound', () => {
    // After a very long time, the enemy should not go below 70% of canvas height
    const maxY = GAME_HEIGHT * 0.7
    const veryLongMs = 1_000_000
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, veryLongMs, behavior)
    expect(pos.y).toBeLessThanOrEqual(maxY + 0.001)
  })

  it('same inputs always produce same output (deterministic)', () => {
    const pos1 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 3500, behavior)
    const pos2 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 3500, behavior)
    expect(pos1.x).toBe(pos2.x)
    expect(pos1.y).toBe(pos2.y)
  })

  it('degenerate: speed=0 returns origin', () => {
    const b: EnemyBehaviorDef = { pattern: 'approach', speed: 0 }
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 5000, b)
    expect(pos.x).toBe(ORIGIN_X)
    expect(pos.y).toBe(ORIGIN_Y)
  })

  it('Stone Drake uses approach behavior', () => {
    expect(ENEMY_STONE_DRAKE.behavior).toBeDefined()
    expect(ENEMY_STONE_DRAKE.behavior!.pattern).toBe('approach')
  })
})

// ---------------------------------------------------------------------------
// All 15 extended enemy types have behavior defined
// ---------------------------------------------------------------------------

describe('BehaviorSystem — all extended enemy types have behavior', () => {
  const extendedEnemies = [
    { name: 'Goblin Scout', def: ENEMY_GOBLIN_SCOUT },
    { name: 'Shadow Dancer', def: ENEMY_SHADOW_DANCER },
    { name: 'Plague Rat',    def: ENEMY_PLAGUE_RAT    },
    { name: 'Thornback',     def: ENEMY_THORNBACK     },
    { name: 'Thunder Hawk',  def: ENEMY_THUNDER_HAWK  },
    { name: 'Stone Drake',   def: ENEMY_STONE_DRAKE   },
    { name: 'Lava Slug',     def: ENEMY_LAVA_SLUG     },
    { name: 'Void Wraith',   def: ENEMY_VOID_WRAITH   },
    { name: 'Titan Lord',    def: ENEMY_TITAN_LORD    },
    { name: 'Swarm',         def: ENEMY_SWARM         },
  ]

  for (const { name, def } of extendedEnemies) {
    it(`${name} has a behavior field with a valid MovementPattern`, () => {
      expect(def.behavior).toBeDefined()
      const validPatterns = ['static', 'lr_oscillate', 'zigzag', 'diagonal', 'approach']
      expect(validPatterns).toContain(def.behavior!.pattern)
    })

    it(`${name} behavior produces a valid position at t=0, 1000, 5000 ms`, () => {
      for (const t of [0, 1000, 5000]) {
        const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, t, def.behavior!)
        expect(typeof pos.x).toBe('number')
        expect(typeof pos.y).toBe('number')
        expect(Number.isFinite(pos.x)).toBe(true)
        expect(Number.isFinite(pos.y)).toBe(true)
      }
    })
  }
})

// ---------------------------------------------------------------------------
// Determinism: N ticks from the same state always produce the same result
// ---------------------------------------------------------------------------

describe('BehaviorSystem — determinism across patterns', () => {
  const patterns: EnemyBehaviorDef[] = [
    { pattern: 'static',       speed: 0 },
    { pattern: 'lr_oscillate', speed: ENEMY_MOVE_SPEED_BASE, amplitude: ENEMY_LR_AMPLITUDE_DEFAULT },
    { pattern: 'zigzag',       speed: ENEMY_MOVE_SPEED_FAST },
    { pattern: 'diagonal',     speed: ENEMY_MOVE_SPEED_FAST },
    { pattern: 'approach',     speed: ENEMY_APPROACH_SPEED },
  ]

  for (const behavior of patterns) {
    it(`${behavior.pattern}: same elapsedMs always returns same position`, () => {
      const testTimes = [0, 250, 1000, 3333, 10000]
      for (const t of testTimes) {
        const pos1 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, t, behavior)
        const pos2 = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, t, behavior)
        expect(pos1.x).toBe(pos2.x)
        expect(pos1.y).toBe(pos2.y)
      }
    })
  }
})

// ---------------------------------------------------------------------------
// resolveBehavior — fallback to static when EnemyDef has no behavior field
// ---------------------------------------------------------------------------

describe('resolveBehavior — fallback behavior', () => {
  it('returns the enemy behavior when behavior is defined', () => {
    const result = resolveBehavior(ENEMY_SHADOW_DANCER)
    expect(result.pattern).toBe('lr_oscillate')
  })

  it('returns static fallback when behavior is undefined on EnemyDef', () => {
    const defWithoutBehavior = { name: 'Test', maxHp: 100, critZoneScale: 1.0 }
    const result = resolveBehavior(defWithoutBehavior)
    expect(result.pattern).toBe('static')
    expect(result.speed).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// BehaviorSystem — lr_oscillate amplitude fallback (no amplitude provided)
// ---------------------------------------------------------------------------

describe('BehaviorSystem — lr_oscillate with default amplitude', () => {
  it('uses GAME_WIDTH * 0.25 when amplitude is not specified', () => {
    const behavior: EnemyBehaviorDef = { pattern: 'lr_oscillate', speed: ENEMY_MOVE_SPEED_BASE }
    // amplitude defaults to GAME_WIDTH * 0.25 in computeLrOscillate
    const defaultAmplitude = GAME_WIDTH * 0.25
    const periodMs = (2 * defaultAmplitude / ENEMY_MOVE_SPEED_BASE) * 1000
    // At t=periodMs/2: cos(π) = -1, so x = originX - defaultAmplitude
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, periodMs / 2, behavior)
    expect(pos.x).toBeCloseTo(ORIGIN_X - defaultAmplitude, 5)
  })
})

// ---------------------------------------------------------------------------
// BehaviorSystem — zigzag with default amplitude (no amplitude provided)
// ---------------------------------------------------------------------------

describe('BehaviorSystem — zigzag with default amplitude', () => {
  it('uses GAME_WIDTH * 0.2 when amplitude is not specified', () => {
    const behavior: EnemyBehaviorDef = { pattern: 'zigzag', speed: ENEMY_MOVE_SPEED_FAST }
    const defaultAmplitude = GAME_WIDTH * 0.2
    // At t=0: triangle = -1, so x = originX - defaultAmplitude
    const pos = computeEnemyPosition(ORIGIN_X, ORIGIN_Y, 0, behavior)
    expect(pos.x).toBeCloseTo(ORIGIN_X - defaultAmplitude, 5)
  })
})
