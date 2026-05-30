import { describe, it, expect } from 'vitest'
import { Enemy } from '../../game/entities/Enemy'
import { MaskHitDetector } from '../../game/systems/MaskHitDetector'
import { AnimationController } from '../../game/systems/AnimationController'
import type { AnimationDef } from '../../game/systems/AnimationController'

// Enemy positioned at canvas centre for all tests
const EX = 195
const EY = 422

// ---------------------------------------------------------------------------
// Mask-based hit detection setup
// ---------------------------------------------------------------------------

const MASK_W = 128
const MASK_H = 128
const DISPLAY_W = 128
const DISPLAY_H = 128

/**
 * Creates a MaskHitDetector with a single mask where:
 * - top third (y < 43) = red (crit/head)
 * - middle third (43 <= y < 86) = yellow (hit/torso)
 * - bottom third (y >= 86) = green (graze/leftLeg)
 * All within x=20..107 (88px wide), y=20..107 (88px tall).
 */
function createDetectorWithMask(spriteKey = 'test_enemy', animKey = 'idle', frameIndex = 0): MaskHitDetector {
  const detector = new MaskHitDetector()
  const data = new Uint8Array(MASK_W * MASK_H * 4)

  const bbox = { x: 20, y: 20, w: 88, h: 88 }
  const third = bbox.h / 3

  for (let y = bbox.y; y < bbox.y + bbox.h; y++) {
    for (let x = bbox.x; x < bbox.x + bbox.w; x++) {
      const offset = (y * MASK_W + x) * 4
      const relY = y - bbox.y
      if (relY < third) {
        data[offset] = 255; data[offset + 1] = 0; data[offset + 2] = 0; data[offset + 3] = 255
      } else if (relY < third * 2) {
        data[offset] = 255; data[offset + 1] = 255; data[offset + 2] = 0; data[offset + 3] = 255
      } else {
        data[offset] = 0; data[offset + 1] = 255; data[offset + 2] = 0; data[offset + 3] = 255
      }
    }
  }
  detector.loadMaskData(spriteKey, animKey, frameIndex, data, MASK_W, MASK_H)
  return detector
}

/**
 * Helper: creates an enemy positioned so frame origin = (0, 0) for 128x128 display.
 * enemyX = 64, enemyY = 76.8 → frameOriginX = 0, frameOriginY = 0.
 */
function maskEnemy(detector?: MaskHitDetector): Enemy {
  const det = detector ?? createDetectorWithMask()
  const enemyX = DISPLAY_W / 2 // 64
  const enemyY = DISPLAY_H * 0.6 // 76.8
  return new Enemy(enemyX, enemyY, 'test_enemy', undefined, det, DISPLAY_W, DISPLAY_H)
}

// ---------------------------------------------------------------------------
// Mask-based hit detection — zone resolution
// ---------------------------------------------------------------------------

describe('Enemy — mask-based hit detection', () => {
  it('returns CRIT for point in mask crit zone (red area)', () => {
    const e = maskEnemy()
    // Point at (64, 25) in world = (64, 25) in frame = within top third of bbox
    expect(e.getHitResult({ x: 64, y: 25 })).toBe('CRIT')
  })

  it('returns HIT for point in mask hit zone (yellow area)', () => {
    const e = maskEnemy()
    // Point at (64, 55) in frame = within middle third of bbox
    expect(e.getHitResult({ x: 64, y: 55 })).toBe('HIT')
  })

  it('returns GRAZE for point in mask graze zone (green area)', () => {
    const e = maskEnemy()
    // Point at (64, 90) in frame = within bottom third of bbox
    expect(e.getHitResult({ x: 64, y: 90 })).toBe('GRAZE')
  })

  it('returns MISS for point in transparent area of mask', () => {
    const e = maskEnemy()
    // Point at (10, 10) in frame = outside the painted bbox (transparent)
    expect(e.getHitResult({ x: 10, y: 10 })).toBe('MISS')
  })

  it('returns MISS for point far outside the enemy sprite', () => {
    const e = maskEnemy()
    expect(e.getHitResult({ x: 500, y: 500 })).toBe('MISS')
  })
})

// ---------------------------------------------------------------------------
// No mask → always MISS
// ---------------------------------------------------------------------------

describe('Enemy — no mask detector (always MISS)', () => {
  it('returns MISS when no maskDetector is set', () => {
    const e = new Enemy(EX, EY)
    expect(e.getHitResult({ x: EX, y: EY })).toBe('MISS')
  })

  it('returns MISS for any point when no mask data is loaded', () => {
    const e = new Enemy(EX, EY, 'some_key', undefined, new MaskHitDetector(), 128, 128)
    expect(e.getHitResult({ x: EX, y: EY })).toBe('MISS')
  })
})

// ---------------------------------------------------------------------------
// getHitZone — zone name mapping
// ---------------------------------------------------------------------------

describe('Enemy.getHitZone — zone name per mask area', () => {
  it('crit area → "head"', () => {
    expect(maskEnemy().getHitZone({ x: 64, y: 25 })).toBe('head')
  })

  it('hit area → "torso"', () => {
    expect(maskEnemy().getHitZone({ x: 64, y: 55 })).toBe('torso')
  })

  it('graze area → "leftLeg"', () => {
    expect(maskEnemy().getHitZone({ x: 64, y: 90 })).toBe('leftLeg')
  })

  it('transparent area → "none"', () => {
    expect(maskEnemy().getHitZone({ x: 10, y: 10 })).toBe('none')
  })

  it('far away → "none"', () => {
    expect(maskEnemy().getHitZone({ x: 500, y: 500 })).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// Enemy position independence — mask detection respects enemy world position
// ---------------------------------------------------------------------------

describe('Enemy — position-dependent mask detection', () => {
  it('hit detection works when enemy is repositioned', () => {
    const detector = createDetectorWithMask()
    // Enemy at (100, 100) — frame origin will be different from default
    const e = new Enemy(100, 100, 'test_enemy', undefined, detector, DISPLAY_W, DISPLAY_H)
    // frameOriginX = 100 - 64 = 36, frameOriginY = 100 - 76.8 = 23.2
    // World (100, 50) → frame ((100-36)*1, (50-23.2)*1) = (64, 26.8)
    // frame y=26.8 → in bbox, relY = 26.8 - 20 = 6.8 < 29.3 (third) → crit
    expect(e.getHitResult({ x: 100, y: 50 })).toBe('CRIT')
  })

  it('point at enemy centre maps to the correct mask area', () => {
    const detector = createDetectorWithMask()
    const e = new Enemy(100, 100, 'test_enemy', undefined, detector, DISPLAY_W, DISPLAY_H)
    // World (100, 100) → frame ((100-36)*1, (100-23.2)*1) = (64, 76.8)
    // frame y=76.8 → in bbox, relY = 76.8 - 20 = 56.8; third = 29.3; 56.8 > 58.6? no, 56.8 < 58.6 → torso (yellow)
    expect(e.getHitResult({ x: 100, y: 100 })).toBe('HIT')
  })

  it('miss for point far from repositioned enemy', () => {
    const detector = createDetectorWithMask()
    const e = new Enemy(100, 100, 'test_enemy', undefined, detector, DISPLAY_W, DISPLAY_H)
    expect(e.getHitResult({ x: EX, y: EY })).toBe('MISS')
  })
})

// ---------------------------------------------------------------------------
// Display width scaling — mask detection with non-128px display size
// ---------------------------------------------------------------------------

describe('Enemy — display size scaling', () => {
  it('mask detection works with 256px display width (2x scale)', () => {
    const detector = createDetectorWithMask()
    // With 256px display, frame coords are scaled: frame = (world - origin) * (128/256) = *0.5
    const displayW = 256
    const displayH = 256
    const enemyX = displayW / 2 // 128
    const enemyY = displayH * 0.6 // 153.6
    const e = new Enemy(enemyX, enemyY, 'test_enemy', undefined, detector, displayW, displayH)

    // frameOriginX = 128 - 128 = 0, frameOriginY = 153.6 - 153.6 = 0
    // World (128, 50) → frame ((128-0)*0.5, (50-0)*0.5) = (64, 25) → crit zone
    expect(e.getHitResult({ x: 128, y: 50 })).toBe('CRIT')

    // World (128, 110) → frame (64, 55) → hit zone
    expect(e.getHitResult({ x: 128, y: 110 })).toBe('HIT')

    // World (128, 180) → frame (64, 90) → graze zone
    expect(e.getHitResult({ x: 128, y: 180 })).toBe('GRAZE')
  })
})

// ---------------------------------------------------------------------------
// AnimationController integration
// ---------------------------------------------------------------------------

describe('Enemy — AnimationController integration', () => {
  const animDefs: Record<string, AnimationDef> = {
    idle: { frameCount: 3, frameDurationMs: 100, loop: true },
    attack: { frameCount: 2, frameDurationMs: 50, loop: false },
  }

  it('delegates currentAnimKey to AnimationController', () => {
    const ctrl = new AnimationController(animDefs)
    const e = new Enemy(EX, EY, 'test', ctrl)
    expect(e.currentAnimKey).toBe('idle')
  })

  it('delegates currentFrameIndex to AnimationController', () => {
    const ctrl = new AnimationController(animDefs)
    const e = new Enemy(EX, EY, 'test', ctrl)
    expect(e.currentFrameIndex).toBe(0)
  })

  it('playAnimation delegates to controller', () => {
    const ctrl = new AnimationController(animDefs)
    const e = new Enemy(EX, EY, 'test', ctrl)
    e.playAnimation('attack')
    expect(e.currentAnimKey).toBe('attack')
    expect(e.currentFrameIndex).toBe(0)
  })

  it('updateAnimation advances the controller', () => {
    const ctrl = new AnimationController(animDefs)
    const e = new Enemy(EX, EY, 'test', ctrl)
    e.updateAnimation(100) // advance 100ms → frame 1 of idle
    expect(e.currentFrameIndex).toBe(1)
  })

  it('isAnimPlaying is true during oneshot animation', () => {
    const ctrl = new AnimationController(animDefs)
    const e = new Enemy(EX, EY, 'test', ctrl)
    e.playAnimation('attack')
    expect(e.isAnimPlaying).toBe(true)
  })

  it('isAnimPlaying is false during loop animation', () => {
    const ctrl = new AnimationController(animDefs)
    const e = new Enemy(EX, EY, 'test', ctrl)
    expect(e.isAnimPlaying).toBe(false)
  })

  it('without controller, currentAnimKey/currentFrameIndex use fallback', () => {
    const e = new Enemy(EX, EY)
    expect(e.currentAnimKey).toBe('idle')
    expect(e.currentFrameIndex).toBe(0)
    e.currentAnimKey = 'attack'
    e.currentFrameIndex = 3
    expect(e.currentAnimKey).toBe('attack')
    expect(e.currentFrameIndex).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Mask detection with multiple animation frames
// ---------------------------------------------------------------------------

describe('Enemy — mask detection uses current animation frame', () => {
  it('switches mask lookup based on current animKey and frameIndex', () => {
    const detector = new MaskHitDetector()
    // idle frame 0: all red (crit)
    const data0 = new Uint8Array(MASK_W * MASK_H * 4)
    for (let i = 0; i < MASK_W * MASK_H; i++) {
      data0[i * 4] = 255; data0[i * 4 + 1] = 0; data0[i * 4 + 2] = 0; data0[i * 4 + 3] = 255
    }
    detector.loadMaskData('test', 'idle', 0, data0, MASK_W, MASK_H)

    // attack frame 0: all green (graze)
    const data1 = new Uint8Array(MASK_W * MASK_H * 4)
    for (let i = 0; i < MASK_W * MASK_H; i++) {
      data1[i * 4] = 0; data1[i * 4 + 1] = 255; data1[i * 4 + 2] = 0; data1[i * 4 + 3] = 255
    }
    detector.loadMaskData('test', 'attack', 0, data1, MASK_W, MASK_H)

    const enemyX = DISPLAY_W / 2
    const enemyY = DISPLAY_H * 0.6
    const e = new Enemy(enemyX, enemyY, 'test', undefined, detector, DISPLAY_W, DISPLAY_H)

    // idle frame 0 → CRIT everywhere
    expect(e.getHitResult({ x: 64, y: 64 })).toBe('CRIT')

    // Switch to attack animation
    e.currentAnimKey = 'attack'
    e.currentFrameIndex = 0
    expect(e.getHitResult({ x: 64, y: 64 })).toBe('GRAZE')
  })
})

// ---------------------------------------------------------------------------
// spriteKey namespacing — different characters don't collide
// ---------------------------------------------------------------------------

describe('Enemy — spriteKey namespacing', () => {
  it('enemies with different spriteKeys use independent mask lookups', () => {
    const detector = new MaskHitDetector()

    // enemy_a: all red
    const dataA = new Uint8Array(MASK_W * MASK_H * 4)
    for (let i = 0; i < MASK_W * MASK_H; i++) {
      dataA[i * 4] = 255; dataA[i * 4 + 1] = 0; dataA[i * 4 + 2] = 0; dataA[i * 4 + 3] = 255
    }
    detector.loadMaskData('enemy_a', 'idle', 0, dataA, MASK_W, MASK_H)

    // enemy_b: all green
    const dataB = new Uint8Array(MASK_W * MASK_H * 4)
    for (let i = 0; i < MASK_W * MASK_H; i++) {
      dataB[i * 4] = 0; dataB[i * 4 + 1] = 255; dataB[i * 4 + 2] = 0; dataB[i * 4 + 3] = 255
    }
    detector.loadMaskData('enemy_b', 'idle', 0, dataB, MASK_W, MASK_H)

    const enemyX = DISPLAY_W / 2
    const enemyY = DISPLAY_H * 0.6

    const a = new Enemy(enemyX, enemyY, 'enemy_a', undefined, detector, DISPLAY_W, DISPLAY_H)
    const b = new Enemy(enemyX, enemyY, 'enemy_b', undefined, detector, DISPLAY_W, DISPLAY_H)

    expect(a.getHitResult({ x: 64, y: 64 })).toBe('CRIT')
    expect(b.getHitResult({ x: 64, y: 64 })).toBe('GRAZE')
  })
})

// ---------------------------------------------------------------------------
// critZoneTolerance and projectileRadius — accepted but not used in mask mode
// ---------------------------------------------------------------------------

describe('Enemy — critZoneTolerance and projectileRadius params', () => {
  it('accepts critZoneTolerance without affecting mask result', () => {
    const e = maskEnemy()
    // Transparent area — still MISS even with large tolerance
    expect(e.getHitResult({ x: 10, y: 10 }, 0.5)).toBe('MISS')
    // Crit area — still CRIT regardless of tolerance
    expect(e.getHitResult({ x: 64, y: 25 }, 0.5)).toBe('CRIT')
  })

  it('accepts projectileRadius without affecting mask result', () => {
    const e = maskEnemy()
    // Transparent area — still MISS even with large projectile radius
    expect(e.getHitResult({ x: 10, y: 10 }, 0, 50)).toBe('MISS')
    // Hit area — still HIT regardless of radius
    expect(e.getHitResult({ x: 64, y: 55 }, 0, 50)).toBe('HIT')
  })
})

// ---------------------------------------------------------------------------
// Animation delegation — holdFrame + isAnimPlaying (TASK-60.4)
// ---------------------------------------------------------------------------

describe('Enemy — animation delegation (behaviour-graph driven)', () => {
  const ANIM_DEFS: Record<string, AnimationDef> = {
    idle: { frameCount: 4, frameDurationMs: 100, loop: true },
    attack: { frameCount: 4, frameDurationMs: 100, loop: false },
  }

  it('holdFrame() without a controller sets the fallback anim key and frame', () => {
    const e = new Enemy(0, 0) // no AnimationController
    e.holdFrame('attack', 2)
    expect(e.currentAnimKey).toBe('attack')
    expect(e.currentFrameIndex).toBe(2)
  })

  it('holdFrame() with a controller freezes that frame and stops playback', () => {
    const ctrl = new AnimationController(ANIM_DEFS)
    const e = new Enemy(0, 0, 'sprite', ctrl)
    e.playAnimation('attack')
    expect(e.isAnimPlaying).toBe(true)
    e.holdFrame('idle', 1)
    expect(e.currentAnimKey).toBe('idle')
    expect(e.currentFrameIndex).toBe(1)
    expect(e.isAnimPlaying).toBe(false)
    // Frozen — advancing time does not move the frame.
    e.updateAnimation(1000)
    expect(e.currentFrameIndex).toBe(1)
  })

  it('isAnimPlaying reflects the controller while a one-shot is playing', () => {
    const ctrl = new AnimationController(ANIM_DEFS)
    const e = new Enemy(0, 0, 'sprite', ctrl)
    expect(e.isAnimPlaying).toBe(false) // default idle is a loop
    e.playAnimation('attack')
    expect(e.isAnimPlaying).toBe(true)
    e.updateAnimation(500) // 4 frames * 100ms = 400ms → completes, back to idle
    expect(e.isAnimPlaying).toBe(false)
  })

  it('isAnimPlaying is false (and play/update are no-ops) without a controller', () => {
    const e = new Enemy(0, 0) // no AnimationController
    expect(e.isAnimPlaying).toBe(false)
    e.playAnimation('attack') // no-op
    e.updateAnimation(1000) // no-op
    expect(e.isAnimPlaying).toBe(false)
  })

  it('getHitZone resolves a zone using the default tolerance/radius arguments', () => {
    const e = maskEnemy()
    // Called with only the point — exercises the default parameter values.
    expect(e.getHitZone({ x: 64, y: 25 })).toBe('head')
    expect(e.getHitZone({ x: 10, y: 10 })).toBe('none')
  })

  it('returns "none" when a mask exists but its dimensions cannot be read', () => {
    // Defensive guard: hasMask() says yes but getMaskDimensions() returns undefined.
    // Unreachable with the real detector (both read one map) — covered via a stub.
    const stub = {
      hasMask: () => true,
      getMaskDimensions: () => undefined,
      getZone: () => 'head' as const,
    } as unknown as MaskHitDetector
    const e = new Enemy(64, 76.8, 'test_enemy', undefined, stub, DISPLAY_W, DISPLAY_H)
    expect(e.getHitZone({ x: 64, y: 25 })).toBe('none')
  })
})
