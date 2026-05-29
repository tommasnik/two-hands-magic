import { describe, it, expect } from 'vitest'
import { computeReticle } from '../../game/systems/AimSystem'
import { GAME_WIDTH, LASER_ORIGIN_Y, AIM_GAIN } from '../../game/constants'
import type { TouchPoint } from '../../types'

// Minimal TouchPoint fixture with configurable rotationPeriodMs
function makeTouchPoint(rotationPeriodMs: number): TouchPoint {
  return {
    id: 'green',
    color: '#5cff3a',
    rotationPeriodMs,
    cornerAnchor: 'LEFT',
    positionIndex: 0,
  }
}

describe('computeReticle', () => {
  const PERIOD = 2000

  describe('vertical sweep timing', () => {
    it('returns y = LASER_ORIGIN_Y at elapsedMs = 0 (start of cycle — horizontal aim)', () => {
      const result = computeReticle(makeTouchPoint(PERIOD), 0, 0)
      expect(result.y).toBeCloseTo(LASER_ORIGIN_Y, 5)
    })

    it('returns y = LASER_ORIGIN_Y / 2 at elapsedMs = rotationPeriodMs / 2 (mid-cycle)', () => {
      const result = computeReticle(makeTouchPoint(PERIOD), 0, PERIOD / 2)
      expect(result.y).toBeCloseTo(LASER_ORIGIN_Y / 2, 5)
    })

    it('returns y = LASER_ORIGIN_Y at elapsedMs = rotationPeriodMs (wrap-around to start)', () => {
      // At exactly one full period the phase is 0 (mod), so y = LASER_ORIGIN_Y again.
      const result = computeReticle(makeTouchPoint(PERIOD), 0, PERIOD)
      expect(result.y).toBeCloseTo(LASER_ORIGIN_Y, 5)
    })

    it('wraps correctly at 1.5 periods (same as 0.5 periods)', () => {
      const a = computeReticle(makeTouchPoint(PERIOD), 0, PERIOD * 1.5)
      const b = computeReticle(makeTouchPoint(PERIOD), 0, PERIOD * 0.5)
      expect(a.y).toBeCloseTo(b.y, 5)
    })
  })

  describe('drag gain — horizontal correction', () => {
    it('centres x at GAME_WIDTH/2 when dragOffsetX = 0', () => {
      const result = computeReticle(makeTouchPoint(PERIOD), 0, 0)
      expect(result.x).toBeCloseTo(GAME_WIDTH / 2, 5)
    })

    it('shifts x by dragOffsetX * AIM_GAIN for a 10 px drag', () => {
      const drag = 10
      const result = computeReticle(makeTouchPoint(PERIOD), drag, 0)
      expect(result.x).toBeCloseTo(GAME_WIDTH / 2 + drag * AIM_GAIN, 5)
    })

    it('shifts x negatively for a negative drag', () => {
      const drag = -10
      const result = computeReticle(makeTouchPoint(PERIOD), drag, 0)
      expect(result.x).toBeCloseTo(GAME_WIDTH / 2 + drag * AIM_GAIN, 5)
    })
  })

  describe('boundary clamping', () => {
    it('clamps x to GAME_WIDTH when drag is extremely positive', () => {
      const result = computeReticle(makeTouchPoint(PERIOD), 9999, 0)
      expect(result.x).toBe(GAME_WIDTH)
    })

    it('clamps x to 0 when drag is extremely negative', () => {
      const result = computeReticle(makeTouchPoint(PERIOD), -9999, 0)
      expect(result.x).toBe(0)
    })

    it('x is always within [0, GAME_WIDTH]', () => {
      for (const drag of [-500, -100, -1, 0, 1, 100, 500]) {
        const result = computeReticle(makeTouchPoint(PERIOD), drag, 0)
        expect(result.x).toBeGreaterThanOrEqual(0)
        expect(result.x).toBeLessThanOrEqual(GAME_WIDTH)
      }
    })
  })

  describe('different rotationPeriodMs produce different sweep speeds', () => {
    it('faster period reaches a higher y position at the same elapsed time', () => {
      const elapsed = 300
      const slowResult = computeReticle(makeTouchPoint(2800), 0, elapsed)
      const fastResult = computeReticle(makeTouchPoint(600), 0, elapsed)
      // Faster period = larger phase = smaller y (closer to top)
      expect(fastResult.y).toBeLessThan(slowResult.y)
    })

    it('period 600 ms reaches y ≈ 0 near elapsedMs = 600', () => {
      const result = computeReticle(makeTouchPoint(600), 0, 599)
      expect(result.y).toBeCloseTo(LASER_ORIGIN_Y * (1 / 600), 1)
    })

    it('period 2800 ms advances much more slowly than period 600 ms', () => {
      const elapsed = 600
      const slow = computeReticle(makeTouchPoint(2800), 0, elapsed)
      const fast = computeReticle(makeTouchPoint(600), 0, elapsed)
      // After one full fast period, fast is back at LASER_ORIGIN_Y; slow is partway up.
      expect(slow.y).toBeLessThan(LASER_ORIGIN_Y)
      expect(fast.y).toBeCloseTo(LASER_ORIGIN_Y, 5)
    })
  })
})
