import type { HitResult, HitZoneEntry } from '../../types'
import { PIXELS_PER_CM, GAME_HEIGHT, GAME_WIDTH } from './canvas'

// ============================================================
// Projectile
// ============================================================

/** Base projectile travel speed. Unit: cm/s. Affects: time-to-hit and difficulty feel. */
export const PROJECTILE_SPEED_CM = 70

/**
 * Base projectile radius — the projectile is treated as a disc of this size for hit detection.
 * Kept small enough that baseline hit results are indistinguishable from a point-vs-circle test
 * (existing unit and design tests assume zero radius at base). Spell area upgrades multiply
 * this radius via spellAreaMultiplier; tier 3 (×1.60) ≈ 0.08 cm ≈ 4.5 px.
 * Unit: cm. Affects: circle-vs-circle and circle-vs-rect hit detection in ProjectileSystem / Enemy.
 */
export const PROJECTILE_BASE_RADIUS_CM = 0.05

/** Base projectile radius in pixels. Derived from PROJECTILE_BASE_RADIUS_CM. Unit: px. */
export const PROJECTILE_BASE_RADIUS_PX = PROJECTILE_BASE_RADIUS_CM * PIXELS_PER_CM

// ============================================================
// Enemy body dimensions (in cm; runtime code multiplies by PX_CM)
// Legacy constants — still used by GameStateMachine for bbox
// computation and by BattleScene for HP bar positioning.
// ============================================================

/** Head hit zone radius. Unit: cm. Affects: CRIT hit area size. */
export const ENEMY_HEAD_RADIUS_CM = 1.1

/** Torso width. Unit: cm. Affects: HIT body area width. */
export const ENEMY_TORSO_WIDTH_CM = 2.6

/** Torso height. Unit: cm. Affects: HIT body area height. */
export const ENEMY_TORSO_HEIGHT_CM = 3.6

/** Leg length. Unit: cm. Affects: bbox height computation. */
export const ENEMY_LEG_LENGTH_CM = 4.2

/** Leg length in pixels. Used for bbox computation. */
export const ENEMY_LEG_LENGTH_PX = ENEMY_LEG_LENGTH_CM * PIXELS_PER_CM

/** Head hit zone radius in pixels. Derived from ENEMY_HEAD_RADIUS_CM. Unit: px. */
export const ENEMY_HEAD_RADIUS_PX = ENEMY_HEAD_RADIUS_CM * PIXELS_PER_CM

/** Torso width in pixels. Derived from ENEMY_TORSO_WIDTH_CM. Unit: px. */
export const ENEMY_TORSO_WIDTH_PX = ENEMY_TORSO_WIDTH_CM * PIXELS_PER_CM

/** Torso height in pixels. Derived from ENEMY_TORSO_HEIGHT_CM. Unit: px. */
export const ENEMY_TORSO_HEIGHT_PX = ENEMY_TORSO_HEIGHT_CM * PIXELS_PER_CM

// ============================================================
// Damage multipliers by hit result zone
// ============================================================

/**
 * Damage multiplier applied when a projectile hits the crit zone (head).
 * Unit: dimensionless multiplier. Affects: CRIT damage output.
 */
export const CRIT_DAMAGE_MULTIPLIER = 2.0

/**
 * Damage multiplier applied when a projectile hits the torso zone (normal hit).
 * Unit: dimensionless multiplier. Affects: HIT damage output.
 */
export const HIT_DAMAGE_MULTIPLIER = 1.0

/**
 * Damage multiplier for the green zone (GRAZE / limb hit).
 * Green zone deals 60 % of a normal HIT (yellow zone).
 * Unit: dimensionless multiplier. Affects: GRAZE_DAMAGE_MULTIPLIER derivation.
 */
export const GREEN_ZONE_DAMAGE_MULTIPLIER = 0.6

/**
 * Damage multiplier applied when a projectile grazes a limb zone (green zone).
 * Derived from HIT_DAMAGE_MULTIPLIER * GREEN_ZONE_DAMAGE_MULTIPLIER — glancing blow deals partial damage.
 * Unit: dimensionless multiplier. Affects: GRAZE damage output.
 */
export const GRAZE_DAMAGE_MULTIPLIER = HIT_DAMAGE_MULTIPLIER * GREEN_ZONE_DAMAGE_MULTIPLIER

// ============================================================
// Score values
// ============================================================

/** Points awarded for a critical hit (head). */
export const CRIT_SCORE = 3

/** Points awarded for a normal hit (torso). */
export const HIT_SCORE = 1

/** Points awarded for a graze (limbs). */
export const GRAZE_SCORE = 0

/** Points awarded for a complete miss. */
export const MISS_SCORE = 0

// ============================================================
// Default hit zone map — three-zone layout (crit/mid/low)
// Coordinates are relative to the enemy bounding box (0–1 space):
//   x=0 is left edge, y=0 is top edge of the enemy bbox.
// Layout:
//   crit (head) : top 25% of bbox, centered horizontally (30% wide)
//   mid  (torso): middle 45% of bbox, full width
//   low  (legs) : bottom 30% of bbox, full width
// active is always true for static zones — reserved for future dynamic zones.
// ============================================================

/**
 * Default three-zone hit zone map used by all enemies that do not define their own.
 * Zones: crit (head, top 25%), mid (torso, middle 45%), low (legs, bottom 30%).
 * Relative coords (0–1) — pass to scaleHitZoneMap() to get absolute pixel rects.
 * Unit: HitZoneEntry[]. Affects: hit detection overlay in BattleScene.
 */
export const DEFAULT_HIT_ZONE_MAP: readonly HitZoneEntry[] = [
  { zone: 'head',   rect: { x: 0.35, y: 0.00, w: 0.30, h: 0.25 }, active: true },
  { zone: 'torso',  rect: { x: 0.00, y: 0.25, w: 1.00, h: 0.45 }, active: true },
  { zone: 'leftLeg', rect: { x: 0.00, y: 0.70, w: 0.50, h: 0.30 }, active: true },
  { zone: 'rightLeg', rect: { x: 0.50, y: 0.70, w: 0.50, h: 0.30 }, active: true },
]

// ============================================================
// Visual effects timing
// ============================================================

/**
 * Duration for which a hit zone flashes its type color after being struck.
 * After this duration the zone returns to its neutral appearance.
 * Unit: ms. Affects: zone flash visual feedback duration.
 */
export const ZONE_FLASH_DURATION_MS = 400

// ============================================================
// Floating damage number font sizes (3 tiers)
// ============================================================

/**
 * Font size for damage numbers on a CRIT hit (head zone).
 * Largest tier — emphasises critical strikes visually.
 * Unit: px. Affects: float text rendering in BattleScene.
 */
export const FLOAT_TEXT_FONT_CRIT = 36

/**
 * Font size for damage numbers on a normal HIT (torso zone).
 * Mid tier. Derived from FLOAT_TEXT_FONT_CRIT * 0.75.
 * Unit: px. Affects: float text rendering in BattleScene.
 */
export const FLOAT_TEXT_FONT_HIT = FLOAT_TEXT_FONT_CRIT * 0.75

/**
 * Font size for damage numbers on a GRAZE hit (limb zone).
 * Smallest tier — visually de-emphasises glancing blows.
 * Derived from FLOAT_TEXT_FONT_CRIT * 0.5.
 * Unit: px. Affects: float text rendering in BattleScene.
 */
export const FLOAT_TEXT_FONT_GRAZE = FLOAT_TEXT_FONT_CRIT * 0.5

// ============================================================
// Floating damage number colors (by hit result)
// Colors indicate zone type without relying on zone flash.
// ============================================================

/**
 * Color for floating damage number on a CRIT hit (head zone).
 * Bright red-gold — highest visual impact, signals critical strike.
 * Unit: CSS color string. Affects: float text color in BattleScene.
 */
export const FLOAT_TEXT_COLOR_CRIT = '#ff2255'

/**
 * Color for floating damage number on a normal HIT (torso zone).
 * Golden yellow — mid-tier impact, clear but not alarm-level.
 * Unit: CSS color string. Affects: float text color in BattleScene.
 */
export const FLOAT_TEXT_COLOR_HIT = '#ffcc00'

/**
 * Color for floating damage number on a GRAZE hit (limb zone).
 * Green — low-tier, matches zone type color for limbs.
 * Unit: CSS color string. Affects: float text color in BattleScene.
 */
export const FLOAT_TEXT_COLOR_GRAZE = '#66ff88'

/**
 * Color for floating damage number on a MISS (no zone hit).
 * Grey — neutral, de-emphasised, signals no damage.
 * Unit: CSS color string. Affects: float text color in BattleScene.
 */
export const FLOAT_TEXT_COLOR_MISS = '#888888'

/**
 * Pure function — returns the CSS color string for a floating damage number
 * based on the hit result. Used by BattleScene to color damage numbers.
 * No Phaser dependency — fully unit-testable.
 *
 * @param result - The hit result category
 * @returns CSS color string for the damage number
 */
export function getHitResultColor(result: HitResult): string {
  const colors: Record<HitResult, string> = {
    CRIT: FLOAT_TEXT_COLOR_CRIT,
    HIT: FLOAT_TEXT_COLOR_HIT,
    GRAZE: FLOAT_TEXT_COLOR_GRAZE,
    MISS: FLOAT_TEXT_COLOR_MISS,
  }
  return colors[result]
}

// ============================================================
// Phase transition delays
// ============================================================

/**
 * Delay after level_complete phase before advancing to the next level.
 * BattleScene shows 'Level X Complete!' for this duration, then calls game.nextLevel().
 * Unit: ms. Affects: pacing between levels.
 */
export const LEVEL_COMPLETE_DELAY_MS = 1500

/**
 * Delay after victory phase before restarting from level 1 (testing loop).
 * BattleScene shows 'Victory!' for this duration, then calls game.restartGame().
 * Unit: ms. Affects: pacing after final boss kill.
 */
export const VICTORY_RESTART_DELAY_MS = 2000

/**
 * Delay after game_over phase before restarting the current level.
 * BattleScene shows 'Game Over' for this duration, then calls game.restartLevel().
 * Unit: ms. Affects: pacing between player death and respawn.
 */
export const GAME_OVER_RESTART_DELAY_MS = 1500

// ============================================================
// Delivery visuals (enemy attack render layer — EnemyAttacks.md §5)
// ============================================================

/**
 * Base radius of a procedural flying orb delivery (OrbVisual).
 * Unit: px. Affects: size of incoming enemy orb attacks on screen.
 */
export const DELIVERY_ORB_RADIUS_PX = 11

/**
 * Half-width of the procedural teeth overlay delivery (TeethVisual).
 * Unit: px. Affects: how wide the jaws appear at the player on overlay attacks.
 */
export const DELIVERY_TEETH_HALF_WIDTH_PX = 46

/**
 * Duration of the post-connect impact/chomp flash a delivery visual keeps
 * drawing after the delivery itself has connected and left the game snapshot.
 * Unit: ms. Affects: how long the orb burst / teeth snap lingers on screen.
 */
export const DELIVERY_CONNECT_FLASH_MS = 180

// ============================================================
// Enemy default position
// ============================================================

/**
 * Default Y coordinate for the enemy torso centre on game start.
 * Derived from GAME_HEIGHT * 0.32 — places the enemy in the upper third of the canvas.
 * Ensures the full body (head + torso + limbs) is visible in the upper ~40% of the screen.
 * Unit: px. Affects: enemy initial vertical placement.
 */
export const ENEMY_DEFAULT_Y = GAME_HEIGHT * 0.32

// ============================================================
// Enemy movement behavior constants
// Used by BehaviorSystem to compute position each tick.
// ============================================================

/**
 * Base movement speed for standard-speed enemies (strafe / approach).
 * Used as the reference speed; per-enemy speeds are derived from this.
 * Unit: px/s. Affects: how quickly a moving enemy traverses its pattern.
 */
export const ENEMY_MOVE_SPEED_BASE = GAME_WIDTH * 0.25   // 25% of canvas width per second

/**
 * Slow enemy movement speed — used for large / high-HP enemies where
 * movement is a secondary pressure mechanic (e.g. Plague Rat zigzag).
 * Derived from ENEMY_MOVE_SPEED_BASE * 0.5.
 * Unit: px/s.
 */
export const ENEMY_MOVE_SPEED_SLOW = ENEMY_MOVE_SPEED_BASE * 0.5

/**
 * Fast enemy movement speed — used for small / evasive enemies.
 * Derived from ENEMY_MOVE_SPEED_BASE * 1.8.
 * Unit: px/s.
 */
export const ENEMY_MOVE_SPEED_FAST = ENEMY_MOVE_SPEED_BASE * 1.8

/**
 * Default horizontal amplitude for the lr_oscillate movement pattern.
 * Half-width of the left-right sweep around the enemy's origin X.
 * Derived from GAME_WIDTH * 0.25 — sweeps through the middle half of the screen.
 * Unit: px.
 */
export const ENEMY_LR_AMPLITUDE_DEFAULT = GAME_WIDTH * 0.25

/**
 * Wide horizontal amplitude for slow, large enemies on the lr_oscillate pattern.
 * Derived from GAME_WIDTH * 0.35.
 * Unit: px.
 */
export const ENEMY_LR_AMPLITUDE_WIDE = GAME_WIDTH * 0.35

/**
 * Approach speed — how fast an approaching enemy moves toward the player per second.
 * Derived from GAME_WIDTH * 0.06 (subtle downward drift; urgency without instant death).
 * Unit: px/s.
 */
export const ENEMY_APPROACH_SPEED = GAME_WIDTH * 0.06

// ============================================================
// Debug overlays
// ============================================================

/**
 * Whether to render the hit-zone mask overlay on top of enemy sprites.
 * Debug aid only — the colored zones show where CRIT/HIT/GRAZE land.
 * When false, the overlay is not drawn at all (hit detection is unaffected —
 * masks still load for the MaskHitDetector). Affects: rendering only.
 */
export const HIT_ZONE_OVERLAY_ENABLED = false

/**
 * Opacity of the hit-zone mask overlay when enabled. Unit: 0–1 alpha.
 * Affects: visibility of the debug overlay over the sprite.
 */
export const HIT_ZONE_OVERLAY_OPACITY = 0.2
