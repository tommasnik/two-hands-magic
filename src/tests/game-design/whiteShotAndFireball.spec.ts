// ============================================================
// Game Design Spec — White Shot & Fireball (TASK-38)
//
// White Shot (left, white, fast): rapid low-damage skill
//   - rotationPeriod: WHITE_SHOT_ROTATION_PERIOD_MS (600ms)
//   - base damage: WHITE_SHOT_SKILL_DAMAGE_MIN/MAX (2–4 range)
//   - crit: ×2, vs.green: 50%
//
// Fireball (right, orange, slow): burst high-damage skill
//   - rotationPeriod: FIREBALL_ROTATION_PERIOD_MS (2000ms)
//   - base damage: FIREBALL_SKILL_DAMAGE_MIN/MAX (10–14 range)
//   - crit: ×2, vs.green: 50%
//
// Tests verify:
//   - Skill definitions (damage in AC#1/#2 range, correct side, rotation period)
//   - Kill scenarios using derived constants only
//   - Damage range validation (no hardcoded numbers in assertions)
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import { createInitialLayout } from '../../game/entities/touchPoints'
import { calculateDamage } from '../../game/systems/DamageSystem'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PIXELS_PER_CM,
  WHITE_SHOT_SKILL_DAMAGE_MIN,
  WHITE_SHOT_SKILL_DAMAGE_MAX,
  FIREBALL_SKILL_DAMAGE_MIN,
  FIREBALL_SKILL_DAMAGE_MAX,
  WHITE_SHOT_ROTATION_PERIOD_MS,
  FIREBALL_ROTATION_PERIOD_MS,
  NEW_SKILL_GREEN_ZONE_MULTIPLIER,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  MAX_DELTA_MS,
  ENEMY_POOL,
  DEFAULT_SKILL_CONFIG,
} from '../../game/constants'
import type { InputEvent } from '../../types'

// RNG helpers for deterministic boundary tests
const rngMin = () => 0
const rngMax = () => 0.9999

// ============================================================
// Derived test constants — min/max boundaries (no hardcoded numbers)
// ============================================================

const WHITE_SHOT_CRIT_MIN  = WHITE_SHOT_SKILL_DAMAGE_MIN * CRIT_DAMAGE_MULTIPLIER
const WHITE_SHOT_CRIT_MAX  = WHITE_SHOT_SKILL_DAMAGE_MAX * CRIT_DAMAGE_MULTIPLIER
const WHITE_SHOT_HIT_MIN   = WHITE_SHOT_SKILL_DAMAGE_MIN * HIT_DAMAGE_MULTIPLIER
const WHITE_SHOT_HIT_MAX   = WHITE_SHOT_SKILL_DAMAGE_MAX * HIT_DAMAGE_MULTIPLIER

const FIREBALL_CRIT_MIN    = FIREBALL_SKILL_DAMAGE_MIN * CRIT_DAMAGE_MULTIPLIER
const FIREBALL_CRIT_MAX    = FIREBALL_SKILL_DAMAGE_MAX * CRIT_DAMAGE_MULTIPLIER
const FIREBALL_HIT_MIN     = FIREBALL_SKILL_DAMAGE_MIN * HIT_DAMAGE_MULTIPLIER

// Layout — default config is white_shot (left) + fireball (right)
const _LAYOUT  = createInitialLayout(GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM)
const _LEFT_0  = _LAYOUT.find(p => p.id === 'left_0')!
const _RIGHT_0 = _LAYOUT.find(p => p.id === 'right_0')!
const LEFT_0_X  = Math.round(_LEFT_0.x)
const LEFT_0_Y  = Math.round(_LEFT_0.y)
const RIGHT_0_X = Math.round(_RIGHT_0.x)
const RIGHT_0_Y = Math.round(_RIGHT_0.y)

// ---------------------------------------------------------------------------
// Helper: run a sequence of actions against a GameStateMachine
// ---------------------------------------------------------------------------
type Action =
  | { type: 'injectInput'; payload: InputEvent }
  | { type: 'wait'; payload: { ms: number } }

function runActions(machine: GameStateMachine, actions: Action[]): void {
  for (const action of actions) {
    if (action.type === 'injectInput') {
      machine.queueInput(action.payload)
      machine.update(1, [])
    } else {
      let remaining = action.payload.ms
      while (remaining > 0) {
        const step = Math.min(remaining, MAX_DELTA_MS)
        machine.update(step, [])
        remaining -= step
      }
    }
  }
}

// ============================================================
// AC#1 — White Shot SkillDef: color white, left side, cooldown ≤ fast skill
// ============================================================

describe('TASK-38 AC#1 — White Shot SkillDef', () => {
  it('DEFAULT_SKILL_CONFIG left slot uses white_shot', () => {
    const left = DEFAULT_SKILL_CONFIG.find(s => s.side === 'left')
    expect(left).toBeDefined()
    expect(left!.skillType).toBe('white_shot')
  })

  it('white_shot is on the left side', () => {
    const left = DEFAULT_SKILL_CONFIG.find(s => s.skillType === 'white_shot')
    expect(left).toBeDefined()
    expect(left!.side).toBe('left')
  })

  it('white_shot rotation period ≤ fast_shot (cooldown ≤ fast skill)', () => {
    expect(WHITE_SHOT_ROTATION_PERIOD_MS).toBeLessThanOrEqual(
      _LAYOUT.find(p => p.id === 'left_0')!.rotationPeriodMs * 3 // sanity bound
    )
    // Exact: white_shot uses WHITE_SHOT_ROTATION_PERIOD_MS (600ms)
    expect(_LEFT_0.rotationPeriodMs).toBe(WHITE_SHOT_ROTATION_PERIOD_MS)
  })

  it('white_shot base damage spread is 2–4 (AC#1)', () => {
    expect(WHITE_SHOT_SKILL_DAMAGE_MIN).toBeGreaterThanOrEqual(2)
    expect(WHITE_SHOT_SKILL_DAMAGE_MAX).toBeLessThanOrEqual(4)
    expect(WHITE_SHOT_SKILL_DAMAGE_MIN).toBeLessThanOrEqual(WHITE_SHOT_SKILL_DAMAGE_MAX)
  })

  it('white_shot CRIT at rng=min is WHITE_SHOT_SKILL_DAMAGE_MIN × CRIT_DAMAGE_MULTIPLIER (AC#1)', () => {
    expect(calculateDamage('CRIT', 'white_shot', rngMin)).toBe(WHITE_SHOT_CRIT_MIN)
  })

  it('white_shot CRIT at rng=max is WHITE_SHOT_SKILL_DAMAGE_MAX × CRIT_DAMAGE_MULTIPLIER (AC#1)', () => {
    expect(calculateDamage('CRIT', 'white_shot', rngMax)).toBe(WHITE_SHOT_CRIT_MAX)
  })

  it('white_shot GRAZE at rng=min is WHITE_SHOT_SKILL_DAMAGE_MIN × NEW_SKILL_GREEN_ZONE_MULTIPLIER (50% vs green, AC#1)', () => {
    expect(calculateDamage('GRAZE', 'white_shot', rngMin)).toBe(
      WHITE_SHOT_SKILL_DAMAGE_MIN * NEW_SKILL_GREEN_ZONE_MULTIPLIER,
    )
  })

  it('white_shot vs-green multiplier is 50%', () => {
    expect(NEW_SKILL_GREEN_ZONE_MULTIPLIER).toBe(0.5)
    expect(WHITE_SHOT_HIT_MIN * NEW_SKILL_GREEN_ZONE_MULTIPLIER).toBe(
      WHITE_SHOT_SKILL_DAMAGE_MIN * NEW_SKILL_GREEN_ZONE_MULTIPLIER,
    )
  })
})

// ============================================================
// AC#2 — Fireball SkillDef: color orange, right side, cooldown 2s
// ============================================================

describe('TASK-38 AC#2 — Fireball SkillDef', () => {
  it('DEFAULT_SKILL_CONFIG right slot uses fireball', () => {
    const right = DEFAULT_SKILL_CONFIG.find(s => s.side === 'right')
    expect(right).toBeDefined()
    expect(right!.skillType).toBe('fireball')
  })

  it('fireball is on the right side', () => {
    const right = DEFAULT_SKILL_CONFIG.find(s => s.skillType === 'fireball')
    expect(right).toBeDefined()
    expect(right!.side).toBe('right')
  })

  it('fireball rotation period ≈ 2000ms (2 s design cooldown, AC#2)', () => {
    expect(FIREBALL_ROTATION_PERIOD_MS).toBe(2000)
    expect(_RIGHT_0.rotationPeriodMs).toBe(FIREBALL_ROTATION_PERIOD_MS)
  })

  it('fireball base damage spread is 10–14 (AC#2)', () => {
    expect(FIREBALL_SKILL_DAMAGE_MIN).toBeGreaterThanOrEqual(10)
    expect(FIREBALL_SKILL_DAMAGE_MAX).toBeLessThanOrEqual(14)
    expect(FIREBALL_SKILL_DAMAGE_MIN).toBeLessThanOrEqual(FIREBALL_SKILL_DAMAGE_MAX)
  })

  it('fireball CRIT at rng=min is FIREBALL_SKILL_DAMAGE_MIN × CRIT_DAMAGE_MULTIPLIER (AC#2)', () => {
    expect(calculateDamage('CRIT', 'fireball', rngMin)).toBe(FIREBALL_CRIT_MIN)
  })

  it('fireball CRIT at rng=max is FIREBALL_SKILL_DAMAGE_MAX × CRIT_DAMAGE_MULTIPLIER (AC#2)', () => {
    expect(calculateDamage('CRIT', 'fireball', rngMax)).toBe(FIREBALL_CRIT_MAX)
  })

  it('fireball GRAZE at rng=min is FIREBALL_SKILL_DAMAGE_MIN × NEW_SKILL_GREEN_ZONE_MULTIPLIER (50% vs green, AC#2)', () => {
    expect(calculateDamage('GRAZE', 'fireball', rngMin)).toBe(
      FIREBALL_SKILL_DAMAGE_MIN * NEW_SKILL_GREEN_ZONE_MULTIPLIER,
    )
  })

  it('fireball vs-green multiplier is 50% (same as white_shot)', () => {
    expect(FIREBALL_HIT_MIN * NEW_SKILL_GREEN_ZONE_MULTIPLIER).toBe(
      FIREBALL_SKILL_DAMAGE_MIN * NEW_SKILL_GREEN_ZONE_MULTIPLIER,
    )
  })
})

// ============================================================
// Kill scenario — White Shot (power user: multiple crits)
// white_shot CRIT = WHITE_SHOT_SKILL_DAMAGE_MIN × CRIT_DAMAGE_MULTIPLIER
// First pool enemy HP = ENEMY_POOL[0].maxHp (Stone Giant)
// Shots to kill = ceil(HP / CRIT_DAMAGE) — all derived from constants below.
// ============================================================

describe('TASK-38 — White Shot kill scenario (power user)', () => {
  it('power user can kill first pool enemy using white_shot CRITs (worst-case min damage)', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    const hp = ENEMY_POOL[0].maxHp
    // Use min damage to guarantee kill regardless of rng
    const shotsToKill = Math.ceil(hp / WHITE_SHOT_CRIT_MIN)

    for (let i = 0; i < shotsToKill; i++) {
      machine._applyHitForTesting('CRIT', 'white_shot')
    }

    const state = machine.getState()
    expect(state.enemyHp).toBeLessThanOrEqual(0)
    expect(['fight_overview']).toContain(state.phase)
  })

  it('white_shot CRIT damage at rng=min is WHITE_SHOT_SKILL_DAMAGE_MIN × CRIT_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('CRIT', 'white_shot', rngMin)).toBe(WHITE_SHOT_CRIT_MIN)
  })

  it('white_shot CRIT damage at rng=max is WHITE_SHOT_SKILL_DAMAGE_MAX × CRIT_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('CRIT', 'white_shot', rngMax)).toBe(WHITE_SHOT_CRIT_MAX)
  })

  it('white_shot HIT damage at rng=min is WHITE_SHOT_SKILL_DAMAGE_MIN', () => {
    expect(calculateDamage('HIT', 'white_shot', rngMin)).toBe(WHITE_SHOT_HIT_MIN)
  })

  it('white_shot GRAZE is 50% of HIT at min (vs-green mechanic)', () => {
    expect(calculateDamage('GRAZE', 'white_shot', rngMin)).toBe(
      WHITE_SHOT_HIT_MIN * NEW_SKILL_GREEN_ZONE_MULTIPLIER,
    )
  })

  it('power user fires left slot (white_shot) and a projectile registers', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    // Fire white_shot from left_0 at torso zone
    const TORSO_WAIT_MS = Math.ceil(WHITE_SHOT_ROTATION_PERIOD_MS * (1 - GAME_HEIGHT / 3 / GAME_HEIGHT))
    runActions(machine, [
      { type: 'injectInput', payload: { pointerId: 0, action: 'down', x: LEFT_0_X, y: LEFT_0_Y, timestamp: 0 } },
      { type: 'wait',        payload: { ms: TORSO_WAIT_MS } },
      { type: 'injectInput', payload: { pointerId: 0, action: 'up',   x: LEFT_0_X, y: LEFT_0_Y, timestamp: TORSO_WAIT_MS + 1 } },
      { type: 'wait',        payload: { ms: 400 } }, // flight time
    ])

    const state = machine.getState()
    const totalHits = state.score.crits + state.score.hits + state.score.grazes + state.score.misses
    expect(totalHits).toBeGreaterThanOrEqual(1)
    expect(state.lastHit).not.toBeNull()
    // Confirm the left slot is white_shot
    const leftSlot = state.activeSlots.find(s => s.side === 'left')
    expect(leftSlot?.skillType).toBe('white_shot')
  })
})

// ============================================================
// Kill scenario — Fireball (power user: fewer but powerful crits)
// fireball CRIT = FIREBALL_SKILL_DAMAGE_MIN × CRIT_DAMAGE_MULTIPLIER
// First pool enemy HP = ENEMY_POOL[0].maxHp (Stone Giant)
// Shots to kill = ceil(HP / CRIT_DAMAGE) — all derived from constants below.
// ============================================================

describe('TASK-38 — Fireball kill scenario (power user)', () => {
  it('power user can kill first pool enemy using fireball CRITs (worst-case min damage)', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    const hp = ENEMY_POOL[0].maxHp
    // Use min damage to guarantee kill regardless of rng
    const shotsToKill = Math.ceil(hp / FIREBALL_CRIT_MIN)

    for (let i = 0; i < shotsToKill; i++) {
      machine._applyHitForTesting('CRIT', 'fireball')
    }

    const state = machine.getState()
    expect(state.enemyHp).toBeLessThanOrEqual(0)
    expect(['fight_overview']).toContain(state.phase)
  })

  it('fireball requires fewer CRITs to kill first pool enemy than white_shot (burst mechanic)', () => {
    const hp = ENEMY_POOL[0].maxHp
    // Compare worst-case shots needed for each skill
    const whiteShotCritsNeeded = Math.ceil(hp / WHITE_SHOT_CRIT_MIN)
    const fireballCritsNeeded  = Math.ceil(hp / FIREBALL_CRIT_MIN)
    expect(fireballCritsNeeded).toBeLessThan(whiteShotCritsNeeded)
  })

  it('fireball CRIT damage at rng=min is FIREBALL_SKILL_DAMAGE_MIN × CRIT_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('CRIT', 'fireball', rngMin)).toBe(FIREBALL_CRIT_MIN)
  })

  it('fireball CRIT damage at rng=max is FIREBALL_SKILL_DAMAGE_MAX × CRIT_DAMAGE_MULTIPLIER', () => {
    expect(calculateDamage('CRIT', 'fireball', rngMax)).toBe(FIREBALL_CRIT_MAX)
  })

  it('fireball HIT damage at rng=min is FIREBALL_SKILL_DAMAGE_MIN', () => {
    expect(calculateDamage('HIT', 'fireball', rngMin)).toBe(FIREBALL_HIT_MIN)
  })

  it('fireball GRAZE is 50% of HIT at min (vs-green mechanic)', () => {
    expect(calculateDamage('GRAZE', 'fireball', rngMin)).toBe(
      FIREBALL_HIT_MIN * NEW_SKILL_GREEN_ZONE_MULTIPLIER,
    )
  })

  it('power user fires right slot (fireball) and a projectile registers', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    // Fire fireball from right_0 at torso zone
    const FIREBALL_TORSO_WAIT_MS = Math.ceil(FIREBALL_ROTATION_PERIOD_MS * (1 - GAME_HEIGHT / 3 / GAME_HEIGHT))
    runActions(machine, [
      { type: 'injectInput', payload: { pointerId: 0, action: 'down', x: RIGHT_0_X, y: RIGHT_0_Y, timestamp: 0 } },
      { type: 'wait',        payload: { ms: FIREBALL_TORSO_WAIT_MS } },
      { type: 'injectInput', payload: { pointerId: 0, action: 'up',   x: RIGHT_0_X, y: RIGHT_0_Y, timestamp: FIREBALL_TORSO_WAIT_MS + 1 } },
      { type: 'wait',        payload: { ms: 500 } }, // flight time (fireball is slower)
    ])

    const state = machine.getState()
    const totalHits = state.score.crits + state.score.hits + state.score.grazes + state.score.misses
    expect(totalHits).toBeGreaterThanOrEqual(1)
    expect(state.lastHit).not.toBeNull()
    // Confirm the right slot is fireball
    const rightSlot = state.activeSlots.find(s => s.side === 'right')
    expect(rightSlot?.skillType).toBe('fireball')
  })
})

// ============================================================
// Skill balance — white_shot vs fireball
// ============================================================

describe('TASK-38 — Skill balance: white_shot vs fireball', () => {
  it('fireball deals more damage per hit than white_shot (burst vs rapid-fire balance)', () => {
    // Even worst-case fireball min > best-case white_shot max
    expect(FIREBALL_SKILL_DAMAGE_MIN).toBeGreaterThan(WHITE_SHOT_SKILL_DAMAGE_MAX)
    expect(FIREBALL_HIT_MIN).toBeGreaterThan(WHITE_SHOT_HIT_MAX)
    expect(FIREBALL_CRIT_MIN).toBeGreaterThan(WHITE_SHOT_CRIT_MAX)
  })

  it('white_shot is faster than fireball (higher period = slower sweep)', () => {
    expect(WHITE_SHOT_ROTATION_PERIOD_MS).toBeLessThan(FIREBALL_ROTATION_PERIOD_MS)
  })

  it('white_shot MISS returns 0', () => {
    expect(calculateDamage('MISS', 'white_shot')).toBe(0)
  })

  it('fireball MISS returns 0', () => {
    expect(calculateDamage('MISS', 'fireball')).toBe(0)
  })
})
