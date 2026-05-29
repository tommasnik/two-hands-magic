// ============================================================
// Game Design Spec — Battle Encounter
//
// Validates the core battle loop feel for two player archetypes:
//   • Power user: knows rotation periods, fires at exactly the right moment
//   • Casual player: random timing/drag, but eventually lands a hit
//
// Updated for TASK-35: default layout uses dynamic slots.
// left_0 (slow_shot) is positioned at the arc midpoint (angle=50° = old violet position).
// left_0.rotationPeriodMs = SLOW_SKILL_ROTATION_PERIOD_MS = 2200ms.
// ============================================================

import { describe, it, expect } from 'vitest'
import { runSpec } from './runner'
import { createInitialLayout } from '../../game/entities/touchPoints'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PIXELS_PER_CM,
  WHITE_SHOT_ROTATION_PERIOD_MS,
  LASER_ORIGIN_Y,
  ENEMY_HEAD_RADIUS_PX,
  ENEMY_TORSO_HEIGHT_PX,
} from '../../game/constants'
import type { GameDesignSpec } from './types'

// ---------------------------------------------------------------------------
// Dynamic layout positions — derived from DEFAULT_SKILL_CONFIG (1 left + 1 right)
// task-38: left_0 = white_shot (rotationPeriod=600ms), right_0 = fireball (rotationPeriod=2000ms)
// left_0 is at the midpoint of the left arc (angle=50°), same as old 'violet' position.
// right_0 is at the midpoint of the right arc (angle=50°), same as old 'red' position.
// ---------------------------------------------------------------------------
const _LAYOUT = createInitialLayout(GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM)
const _LEFT_0  = _LAYOUT.find(p => p.id === 'left_0')!
const LEFT_0_X  = Math.round(_LEFT_0.x)
const LEFT_0_Y  = Math.round(_LEFT_0.y)

// ---------------------------------------------------------------------------
// Timing rationale — POWER USER
// ---------------------------------------------------------------------------
// left_0 slot: skillType = white_shot, rotationPeriodMs = WHITE_SHOT_ROTATION_PERIOD_MS = 600ms
//
// Enemy head centre Y = GAME_HEIGHT/3 - TORSO_HEIGHT_PX/2 - HEAD_RADIUS_PX
//                     ≈ 281.3 - 100.8 - 61.6 ≈ 118.9 px
//
// AimSystem: reticle.y = LASER_ORIGIN_Y * (1 - phase), phase = elapsedMs % period / period
// Target phase = 1 - HEAD_Y / LASER_ORIGIN_Y → wait ≈ ceil(600 * phase) ms after touch down
// Pad with ceil so the step-based advance clears the head zone.
//
// Projectile flight: origin (LEFT_0_X, LEFT_0_Y) → target (195, ~119) @ base speed
//   flightTime ≈ 180 ms → wait 400 ms after release guarantees arrival.
// ---------------------------------------------------------------------------

const HEAD_Y = GAME_HEIGHT / 3 - ENEMY_TORSO_HEIGHT_PX / 2 - ENEMY_HEAD_RADIUS_PX
const POWER_USER_WAIT_MS = Math.ceil(WHITE_SHOT_ROTATION_PERIOD_MS * (1 - HEAD_Y / LASER_ORIGIN_Y))

// ---------------------------------------------------------------------------
// Timing rationale — CASUAL PLAYER
// ---------------------------------------------------------------------------
// left_0 slot: rotationPeriodMs = 600ms (white_shot, task-38)
// Torso centre Y ≈ GAME_HEIGHT/3 ≈ 281 px.
// Phase = 1 - 281/LASER_ORIGIN_Y → t ≈ ceil(600 * phase) ms.
// ---------------------------------------------------------------------------

const TORSO_Y = GAME_HEIGHT / 3
const CASUAL_WAIT_MS = Math.ceil(WHITE_SHOT_ROTATION_PERIOD_MS * (1 - TORSO_Y / LASER_ORIGIN_Y))

const spec: GameDesignSpec = {
  name: 'battle-encounter',
  description: 'Standard 1v1 battle against a stationary enemy — dynamic slot layout',

  powerUser: {
    description:
      'Knows left_0 (slow_shot) rotation period (2200 ms). ' +
      'Waits for reticle to align with enemy head, then releases.',
    actions: [
      // Touch down at left_0 arc position → nearest slot = left_0
      {
        type: 'injectInput',
        payload: { pointerId: 0, action: 'down', x: LEFT_0_X, y: LEFT_0_Y, timestamp: 0 },
      },
      // Wait POWER_USER_WAIT_MS: reticle.y sweeps to head height ≈ 119 px
      { type: 'wait', payload: { ms: POWER_USER_WAIT_MS } },
      // Release — fires slow_shot aimed at head
      {
        type: 'injectInput',
        payload: { pointerId: 0, action: 'up', x: LEFT_0_X, y: LEFT_0_Y, timestamp: POWER_USER_WAIT_MS + 1 },
      },
      // Wait for projectile to travel (slow_shot @ FIREBALL_SPEED) + margin
      { type: 'wait', payload: { ms: 400 } },
    ],
    assertions: [
      // Power user lands a CRIT (head hit) before (POWER_USER_WAIT_MS + 600 ms) of total elapsed time
      { metric: 'timeToFirstCrit', maxMs: POWER_USER_WAIT_MS + 600 },
      // Full sequence completes well inside 5 seconds (slow skill takes longer)
      { metric: 'totalEncounterTime', maxMs: 5000 },
      // Power user fires exactly one shot in this sequence
      { metric: 'totalShots', minValue: 1, maxValue: 1 },
      // That single shot connects
      { metric: 'totalHits', minValue: 1 },
    ],
  },

  casualPlayer: {
    description:
      'Holds finger down without dragging — not aiming deliberately. ' +
      `left_0 (white_shot) has a ${WHITE_SHOT_ROTATION_PERIOD_MS} ms period; ` +
      `waiting ${CASUAL_WAIT_MS} ms places the reticle near the torso zone (y ≈ ${Math.round(TORSO_Y)} px).`,
    actions: [
      // Touch down at left_0 arc position
      {
        type: 'injectInput',
        payload: { pointerId: 0, action: 'down', x: LEFT_0_X, y: LEFT_0_Y, timestamp: 0 },
      },
      // Hold for CASUAL_WAIT_MS: reticle reaches torso zone
      { type: 'wait', payload: { ms: CASUAL_WAIT_MS } },
      // Release — fires toward torso
      {
        type: 'injectInput',
        payload: { pointerId: 0, action: 'up', x: LEFT_0_X, y: LEFT_0_Y, timestamp: CASUAL_WAIT_MS + 1 },
      },
      // Wait for projectile to land
      { type: 'wait', payload: { ms: 500 } },
    ],
    assertions: [
      // Casual player may not get a CRIT but should land at least a HIT or CRIT
      { metric: 'atLeastOneHit', value: true },
      // Total sequence under 10 seconds
      { metric: 'totalEncounterTime', maxMs: 10000 },
      // Casual player fires exactly one shot and it connects
      { metric: 'totalShots', minValue: 1, maxValue: 1 },
      { metric: 'totalHits', minValue: 1 },
    ],
  },
}

// ---------------------------------------------------------------------------
// Vitest test wrapper
// ---------------------------------------------------------------------------

describe('Game Design: Battle Encounter', () => {
  it(`power user gets a CRIT within ${POWER_USER_WAIT_MS + 600} ms and finishes in under 5 s`, async () => {
    const [powerResult] = await runSpec(spec)
    expect(powerResult.failures, powerResult.failures.join('\n')).toHaveLength(0)
    expect(powerResult.passed).toBe(true)
  })

  it('casual player lands at least one hit within 10 s', async () => {
    const [, casualResult] = await runSpec(spec)
    expect(casualResult.failures, casualResult.failures.join('\n')).toHaveLength(0)
    expect(casualResult.passed).toBe(true)
  })
})
