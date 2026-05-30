// ============================================================
// Enemy entity — pure TypeScript, no Phaser dependency
// Hit detection uses pixel-perfect masks via MaskHitDetector.
// Legacy 6-part body and 3-circle hitZoneLayout detection removed (task-54).
// ============================================================

import type { HitResult, HitZoneName } from '../../types'
import type { MaskHitDetector } from '../systems/MaskHitDetector'
import type { AnimationController } from '../systems/AnimationController'

/**
 * Zone-to-result mapping for mask-based detection.
 * Maps mask zone names (head, torso, leftLeg) and 'none' to HitResult.
 */
const ZONE_TO_HIT_RESULT: Record<string, HitResult> = {
  head: 'CRIT',
  torso: 'HIT',
  leftArm: 'GRAZE',
  rightArm: 'GRAZE',
  leftLeg: 'GRAZE',
  rightLeg: 'GRAZE',
  none: 'MISS',
}

/**
 * Enemy entity.
 *
 * `x` and `y` define the centre of the enemy sprite in logical canvas pixels.
 *
 * Hit detection is exclusively mask-based via MaskHitDetector:
 * - When maskDetector is available and has data for the current frame,
 *   world coordinates are converted to mask-local pixel coords and looked up.
 * - When no mask is available, the hit is a miss ('none').
 *
 * Animation state is delegated to AnimationController (if provided).
 */
export class Enemy {
  /**
   * Sprite key prefix for the character (e.g. 'stone_giant', 'plague_rat').
   * Used as namespace in MaskHitDetector lookups.
   */
  readonly spriteKey: string

  /**
   * Optional pixel-perfect mask detector for sprite-based enemies.
   */
  readonly maskDetector: MaskHitDetector | undefined

  /**
   * Display width of the sprite in canvas pixels.
   * Used for world-to-frame coordinate conversion when maskDetector is active.
   * Unit: px. Default: 128 (1:1 with mask dimensions).
   */
  readonly displayWidth: number

  /**
   * Display height of the sprite in canvas pixels.
   * Used for world-to-frame coordinate conversion when maskDetector is active.
   * Unit: px. Default: 128 (1:1 with mask dimensions).
   */
  readonly displayHeight: number

  /**
   * Optional AnimationController driving frame-based animation.
   * When provided, currentAnimKey and currentFrameIndex are delegated to it.
   */
  private _animController: AnimationController | undefined

  /** Fallback current animation key (used when no AnimationController is set). */
  private _currentAnimKey = 'idle'

  /** Fallback current frame index (used when no AnimationController is set). */
  private _currentFrameIndex = 0

  constructor(
    public x: number,
    public y: number,
    spriteKey = '',
    animController?: AnimationController,
    maskDetector?: MaskHitDetector,
    displayWidth = 128,
    displayHeight = 128,
  ) {
    this.spriteKey = spriteKey
    this._animController = animController
    this.maskDetector = maskDetector
    this.displayWidth = displayWidth
    this.displayHeight = displayHeight
  }

  // ------------------------------------------------------------------
  // Animation delegation
  // ------------------------------------------------------------------

  /** Current animation key (e.g. 'idle', 'attack'). */
  get currentAnimKey(): string {
    return this._animController ? this._animController.currentAnimKey : this._currentAnimKey
  }

  /** Set the current animation key (only used when no AnimationController). */
  set currentAnimKey(value: string) {
    this._currentAnimKey = value
  }

  /** Current frame index within the active animation. */
  get currentFrameIndex(): number {
    return this._animController ? this._animController.currentFrameIndex : this._currentFrameIndex
  }

  /** Set the current frame index (only used when no AnimationController). */
  set currentFrameIndex(value: number) {
    this._currentFrameIndex = value
  }

  /** Whether an animation (oneshot) is currently playing. */
  get isAnimPlaying(): boolean {
    return this._animController ? this._animController.isPlaying : false
  }

  /** Play an animation via the AnimationController. No-op if no controller. */
  playAnimation(key: string): void {
    if (this._animController) {
      this._animController.play(key)
    }
  }

  /**
   * Freeze the displayed sprite on a single frame of an animation.
   * Used by behaviour-graph holdFrame nodes. Delegates to the AnimationController
   * when present; otherwise updates the fallback anim/frame fields so getState()
   * and mask hit detection still report the held frame.
   */
  holdFrame(animKey: string, frameIndex: number): void {
    if (this._animController) {
      this._animController.hold(animKey, frameIndex)
    } else {
      this._currentAnimKey = animKey
      this._currentFrameIndex = frameIndex
    }
  }

  /** Advance the animation timer. No-op if no controller. */
  updateAnimation(dtMs: number): void {
    if (this._animController) {
      this._animController.update(dtMs)
    }
  }

  // ------------------------------------------------------------------
  // Hit detection — exclusively mask-based
  // ------------------------------------------------------------------

  /**
   * Single source of hit geometry — returns the zone name for a given point.
   *
   * Uses MaskHitDetector exclusively. If no mask is available for the current
   * frame, returns 'none' (miss).
   *
   * `critZoneTolerance` and `projectileRadius` are accepted for interface
   * compatibility with ProjectileSystem but are not used in mask-based detection
   * (mask pixels are binary — the point is either in a zone or not).
   */
  private _resolveZone(
    point: { x: number; y: number },
    _critZoneTolerance: number,
    _projectileRadius: number,
  ): HitZoneName {
    if (this.maskDetector && this.maskDetector.hasMask(this.spriteKey, this.currentAnimKey, this.currentFrameIndex)) {
      return this._resolveZoneFromMask(point.x, point.y, this.x, this.y)
    }
    return 'none'
  }

  /**
   * Pixel-perfect mask-based hit zone resolution.
   * Converts world coordinates to frame-local pixel coordinates and looks up
   * the zone from the mask data via maskDetector.
   *
   * World-to-frame mapping:
   *   The sprite is rendered centred at (ex, ey) with a vertical offset of -0.6*displayHeight
   *   (matching BattleScene._drawEnemySprite). The frame origin is at the top-left of the
   *   drawn rectangle: (ex - displayWidth/2, ey - displayHeight * 0.6).
   *   Frame pixel = (worldX - frameOriginX) * (maskWidth / displayWidth)
   *
   * Mask dimensions are read per-frame from the MaskHitDetector (getMaskDimensions),
   * so non-square and varying-size masks map correctly.
   */
  private _resolveZoneFromMask(
    px: number, py: number,
    ex: number, ey: number,
  ): HitZoneName {
    const dims = this.maskDetector!.getMaskDimensions(this.spriteKey, this.currentAnimKey, this.currentFrameIndex)
    if (!dims) return 'none'

    const frameOriginX = ex - this.displayWidth / 2
    const frameOriginY = ey - this.displayHeight * 0.6

    const frameX = (px - frameOriginX) * (dims.width / this.displayWidth)
    const frameY = (py - frameOriginY) * (dims.height / this.displayHeight)

    return this.maskDetector!.getZone(this.spriteKey, this.currentAnimKey, this.currentFrameIndex, frameX, frameY)
  }

  /**
   * Returns the zone name for a point, or 'none' for a miss.
   * critZoneTolerance and projectileRadius are accepted for interface compatibility.
   */
  getHitZone(
    point: { x: number; y: number },
    critZoneTolerance = 0,
    projectileRadius = 0,
  ): HitZoneName {
    return this._resolveZone(point, critZoneTolerance, projectileRadius)
  }

  /**
   * Returns the HitResult for a point. Delegates zone resolution to _resolveZone().
   * critZoneTolerance and projectileRadius are accepted for interface compatibility.
   */
  getHitResult(
    point: { x: number; y: number },
    critZoneTolerance = 0,
    projectileRadius = 0,
  ): HitResult {
    return ZONE_TO_HIT_RESULT[this._resolveZone(point, critZoneTolerance, projectileRadius)]
  }
}
