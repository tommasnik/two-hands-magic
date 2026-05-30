import type { SkillType, HitResult, EnemyDef, TouchPointDef, HitZoneEntry, GlobalUpgradeState, UpgradeNodeDef, UpgradeNodeId } from '../types'
export type { TouchPointDef, MovementPattern, EnemyBehaviorDef } from '../types'

// Re-export all attack constants so consumers can still import from 'constants'.
export * from './enemyAttackConstants'

// Behavior graphs for ENEMY_POOL — defined in enemyGraphs.ts to avoid circular deps.
import {
  stoneGiantGraph,
  plagueRatGraph,
  iceGiantGraph,
  crystalSpiderGraph,
  emberWispGraph,
  ironGolemGraph,
  ancientTreantGraph,
  goblinScoutGraph,
  orcWarriorGraph,
  mirrorKnightGraph,
  insectSwarmGraph,
} from './enemyGraphs'

// ============================================================
// Game canvas dimensions
// ============================================================

/** Logical canvas width. Unit: px. Affects: layout, coordinate math. */
export const GAME_WIDTH = 390

/** Logical canvas height. Unit: px. Affects: layout, coordinate math. */
export const GAME_HEIGHT = 844

// ============================================================
// Frame timing
// ============================================================

/** Maximum delta time per frame. Prevents spiral-of-death on tab switch or slow device. Unit: ms. */
export const MAX_DELTA_MS = 50

// ============================================================
// Touch input limits
// ============================================================

/**
 * Maximum number of simultaneous active touch pointers the game accepts.
 * One per hand — the third (and any further) finger is ignored.
 * Unit: count. Affects: InputManager pointer acceptance, multi-touch fairness.
 */
export const MAX_SIMULTANEOUS_TOUCHES = 2

// ============================================================
// Aim / input model
// ============================================================

/**
 * Horizontal drag multiplier applied to finger drift when computing aim target X.
 * Higher = more sensitive / wider sweep. Unit: dimensionless multiplier. Affects: aim spread.
 */
export const AIM_GAIN = 4.0

// ============================================================
// Projectile
// ============================================================

/** Base projectile travel speed. Unit: cm/s. Affects: time-to-hit and difficulty feel. */
export const PROJECTILE_SPEED_CM = 70

/** Fireball skill projectile speed — significantly slower than base for a heavy, telegraphed shot. Unit: cm/s. */
export const FIREBALL_SPEED_CM = PROJECTILE_SPEED_CM * 0.4

/**
 * Base projectile radius — the projectile is treated as a disc of this size for hit detection.
 * Kept small enough that baseline hit results are indistinguishable from a point-vs-circle test
 * (existing unit and design tests assume zero radius at base). Spell area upgrades multiply
 * this radius via spellAreaMultiplier; tier 3 (×1.60) ≈ 0.08 cm ≈ 4.5 px.
 * Unit: cm. Affects: circle-vs-circle and circle-vs-rect hit detection in ProjectileSystem / Enemy.
 */
export const PROJECTILE_BASE_RADIUS_CM = 0.05

// ============================================================
// Player HP & enemy-attack feedback
// ============================================================

/**
 * Player starting / maximum HP. Resets on every level (start, level transition, restart-from-game-over).
 * Unit: HP. Affects: how many enemy missiles the player can absorb before game over.
 */
export const PLAYER_MAX_HP = 30

// ============================================================
// Player XP / leveling
// ============================================================

/**
 * Starting player level at the beginning of a run.
 * Unit: level. Affects: initial XP gating curve.
 */
export const PLAYER_START_LEVEL = 1

/**
 * Maximum player level — reached after killing every enemy in the campaign.
 * Unit: level. Must match the highest key in XP_LEVEL_THRESHOLDS.
 * Affects: when level-up picks stop being offered.
 */
export const PLAYER_MAX_LEVEL = 12

/**
 * Cumulative kill counts that promote the player to each level.
 * Key = target level, value = cumulative enemy kills required to reach it.
 * One level-up per kill across the full ENEMY_POOL campaign — the last kill
 * coincides with reaching PLAYER_MAX_LEVEL.
 * Unit: enemy kills. Affects: pacing of upgrade picks.
 */
export const XP_LEVEL_THRESHOLDS: Readonly<Record<number, number>> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 7,
  9: 8,
  10: 9,
  11: 10,
  12: 11,
}

/**
 * Height of the player HP bar (DOM track) below the touch points.
 * Unit: px. Affects: visual prominence of the player HP indicator.
 */
export const PLAYER_HP_BAR_HEIGHT_PX = 10

/**
 * Duration of the red flash overlay when the player is hit by an enemy missile.
 * Unit: ms. Affects: how long the red screen flash lingers.
 */
export const PLAYER_HIT_FLASH_DURATION_MS = 300

/**
 * CSS colour of the floating damage number rendered above the player HP bar on a hit.
 * Unit: CSS color string. Affects: player-hit float text colour.
 */
export const PLAYER_HIT_FLOAT_COLOR = '#ff2244'



// ============================================================
// Touch point definitions
// 6 fixed points: 3 on the left side, 3 on the right side.
// Colors and rotation speeds are intentionally scrambled —
// not ordered slow→fast or left→right.
// ============================================================

/** Green — left side, slow-ish. */
export const TP_GREEN: TouchPointDef = { side: 'left',  angle: 22, color: '#5cff3a', rotationPeriodMs: 2200 }

/** Violet — left side, very fast. */
export const TP_VIOLET: TouchPointDef = { side: 'left',  angle: 50, color: '#b833ff', rotationPeriodMs: 600 }

/** Orange — left side, medium. */
export const TP_ORANGE: TouchPointDef = { side: 'left',  angle: 78, color: '#ff9410', rotationPeriodMs: 1400 }

/** Blue — right side, slowest. */
export const TP_BLUE: TouchPointDef  = { side: 'right', angle: 22, color: '#3a8cff', rotationPeriodMs: 2800 }

/** Red — right side, fast. */
export const TP_RED: TouchPointDef   = { side: 'right', angle: 50, color: '#ff2a3c', rotationPeriodMs: 900 }

/** Yellow — right side, medium-slow. */
export const TP_YELLOW: TouchPointDef = { side: 'right', angle: 78, color: '#ffe53a', rotationPeriodMs: 1700 }

/** All 6 touch-point definitions in render/assignment order. */
export const TOUCH_POINT_DEFS: readonly TouchPointDef[] = [
  TP_GREEN,
  TP_VIOLET,
  TP_ORANGE,
  TP_BLUE,
  TP_RED,
  TP_YELLOW,
]

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

// ============================================================
// Pixel density — used to convert cm constants to pixels
// ============================================================

/**
 * Pixels per centimeter for hit geometry.
 * Based on ~150 dpi mobile screen (a typical modern phone at ~56 px/cm).
 * Unit: px/cm. Affects: all hitbox sizes derived from cm constants.
 */
export const PIXELS_PER_CM = 56

/**
 * Arc radius for touch point layout along bottom corners.
 * Larger value spreads points further apart for easier individual targeting.
 * Unit: cm. Affects: horizontal and vertical spacing between touch points.
 */
export const TOUCHPOINT_ARC_CM = 3.4

/** Minimum horizontal offset from screen edge for touch point arc. Unit: cm. */
export const TOUCHPOINT_EDGE_X_CM = 1.0

/** Minimum vertical offset from screen bottom for touch point arc. Unit: cm. */
export const TOUCHPOINT_EDGE_Y_CM = 1.0

/**
 * Minimum arc angle for touch point layout (closest to corner edge).
 * Unit: degrees. Affects: touch point arc start position.
 */
export const TOUCHPOINT_ARC_ANGLE_MIN = 22

/**
 * Maximum arc angle for touch point layout (furthest from corner edge).
 * Unit: degrees. Affects: touch point arc end position.
 */
export const TOUCHPOINT_ARC_ANGLE_MAX = 78

/**
 * Fixed Y origin for all laser sweeps — equals the Y position of the highest
 * touch point in a full 6-slot layout (angle = TOUCHPOINT_ARC_ANGLE_MAX).
 * Laser reticles sweep from this Y up to 0; the aim is never below this level.
 * Unit: px.
 */
export const LASER_ORIGIN_Y =
  GAME_HEIGHT
  - TOUCHPOINT_EDGE_Y_CM * PIXELS_PER_CM
  - TOUCHPOINT_ARC_CM * PIXELS_PER_CM * Math.sin(TOUCHPOINT_ARC_ANGLE_MAX * Math.PI / 180)

// ============================================================
// Active skill layout — initial 1+1 configuration
// Left side: slow_shot (1 point), right side: fast_shot (1 point)
// ============================================================

/**
 * Skill type assigned to the left-side touch points.
 * Left = white_shot (rapid low-damage skill; task-38 new skill).
 */
export const LEFT_SIDE_SKILL: SkillType = 'white_shot'

/**
 * Skill type assigned to the right-side touch points.
 * Right = fireball (slow burst skill; task-38 new skill).
 */
export const RIGHT_SIDE_SKILL: SkillType = 'fireball'

// ============================================================
// Skill slot configuration
// ============================================================

/**
 * A single entry in the player's active skill configuration.
 * Assigns a skill type to a numbered slot on one side of the screen.
 *
 * - skillType: which skill fires from this slot
 * - side: which bottom corner the slot is anchored to
 * - slotIndex: 0-based index within that side (0 = first slot)
 *
 * Rules:
 *   - Valid slotIndex range: 0–2 (max 3 slots per side)
 *   - Total slots across both sides: 2–6
 *   - At least 1 slot must be on each side
 */
export interface SkillSlotConfig {
  /** Skill type determines damage, rotation speed, and projectile behaviour. Unit: SkillType. */
  skillType: SkillType
  /** Which side of the screen this slot belongs to. */
  side: 'left' | 'right'
  /** Zero-based index within this side (0 = first slot, max 2). */
  slotIndex: number
}

/**
 * Default skill slot configuration: 2+2 layout (white_shot + ice_crystal left, fireball + lightning_blast right).
 * Unit: SkillSlotConfig[]. Affects: touch point layout and skill routing in GameStateMachine.
 */
export const DEFAULT_SKILL_CONFIG: readonly SkillSlotConfig[] = [
  { skillType: 'white_shot',      side: 'left',  slotIndex: 0 },
  { skillType: 'ice_crystal',     side: 'left',  slotIndex: 1 },
  { skillType: 'fireball',        side: 'right', slotIndex: 0 },
  { skillType: 'lightning_blast', side: 'right', slotIndex: 1 },
]

/**
 * Visual radius of touch point circles.
 * Increased from 22 to 30 for more comfortable thumb targeting on mobile.
 * Unit: px. Affects: tap target size and visual prominence of touch points.
 */
export const TOUCHPOINT_RADIUS = 30

/** Leg length in pixels. Used for bbox computation. */
export const ENEMY_LEG_LENGTH_PX = ENEMY_LEG_LENGTH_CM * PIXELS_PER_CM

/** Head hit zone radius in pixels. Derived from ENEMY_HEAD_RADIUS_CM. Unit: px. */
export const ENEMY_HEAD_RADIUS_PX = ENEMY_HEAD_RADIUS_CM * PIXELS_PER_CM

/** Torso width in pixels. Derived from ENEMY_TORSO_WIDTH_CM. Unit: px. */
export const ENEMY_TORSO_WIDTH_PX = ENEMY_TORSO_WIDTH_CM * PIXELS_PER_CM

/** Torso height in pixels. Derived from ENEMY_TORSO_HEIGHT_CM. Unit: px. */
export const ENEMY_TORSO_HEIGHT_PX = ENEMY_TORSO_HEIGHT_CM * PIXELS_PER_CM

/** Base projectile radius in pixels. Derived from PROJECTILE_BASE_RADIUS_CM. Unit: px. */
export const PROJECTILE_BASE_RADIUS_PX = PROJECTILE_BASE_RADIUS_CM * PIXELS_PER_CM

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
// Skill damage values
// ============================================================

/**
 * Base damage dealt by the slow shot skill on a normal hit (before multipliers).
 * Unit: HP. Affects: enemy HP reduction per slow_shot hit.
 */
export const SLOW_SKILL_DAMAGE = 20

/**
 * Base damage dealt by the fast shot skill on a normal hit (before multipliers).
 * Derived from SLOW_SKILL_DAMAGE * 0.5 — faster shot trades power for speed.
 * Unit: HP. Affects: enemy HP reduction per fast_shot hit.
 */
export const FAST_SKILL_DAMAGE = SLOW_SKILL_DAMAGE * 0.5

/**
 * Minimum base damage dealt by the white shot skill on a normal hit (before multipliers).
 * White Shot is a rapid-fire low-damage skill (quick DPS). Spread: 2–4.
 * Unit: HP. Affects: enemy HP reduction per white_shot hit.
 */
export const WHITE_SHOT_SKILL_DAMAGE_MIN = 2

/**
 * Maximum base damage dealt by the white shot skill on a normal hit (before multipliers).
 * White Shot is a rapid-fire low-damage skill (quick DPS). Spread: 2–4.
 * Unit: HP. Affects: enemy HP reduction per white_shot hit.
 */
export const WHITE_SHOT_SKILL_DAMAGE_MAX = 4


/**
 * Minimum base damage dealt by the fireball skill on a normal hit (before multipliers).
 * Fireball is a slow burst skill (high single-hit damage). Spread: 10–14.
 * Unit: HP. Affects: enemy HP reduction per fireball hit.
 */
export const FIREBALL_SKILL_DAMAGE_MIN = 10

/**
 * Maximum base damage dealt by the fireball skill on a normal hit (before multipliers).
 * Fireball is a slow burst skill (high single-hit damage). Spread: 10–14.
 * Unit: HP. Affects: enemy HP reduction per fireball hit.
 */
export const FIREBALL_SKILL_DAMAGE_MAX = 14


/**
 * Damage multiplier for vs-green-zone hits on white_shot and fireball.
 * Both new skills deal 50% damage to green (graze/limb) zones.
 * Unit: dimensionless multiplier. Affects: GRAZE damage for white_shot and fireball.
 */
export const NEW_SKILL_GREEN_ZONE_MULTIPLIER = 0.5

// ============================================================
// Skill rotation periods (mapped to Green-speed and Orange-speed)
// ============================================================

/**
 * Laser rotation period for the slow shot skill. Matches TP_GREEN rotation speed.
 * Slower sweep = more deliberate aiming window.
 * Unit: ms. Affects: slow_shot laser sweep rate.
 */
export const SLOW_SKILL_ROTATION_PERIOD_MS = 2200

/**
 * Laser rotation period for the fast shot skill. Matches TP_ORANGE rotation speed.
 * Faster sweep = tighter timing window but higher DPS.
 * Unit: ms. Affects: fast_shot laser sweep rate.
 */
export const FAST_SKILL_ROTATION_PERIOD_MS = 1400

/**
 * Laser rotation period for the white shot skill. Matches TP_VIOLET rotation speed (fastest).
 * Very fast sweep = very tight aiming window, requires high reaction speed.
 * Derived from TP_VIOLET.rotationPeriodMs = 600ms.
 * Unit: ms. Affects: white_shot laser sweep rate.
 */
export const WHITE_SHOT_ROTATION_PERIOD_MS = 600

/**
 * Laser rotation period for the fireball skill.
 * Slow sweep = wide aiming window, compensated by long cooldown (2 s).
 * 2000 ms aligns with the 2 s design cooldown intent.
 * Unit: ms. Affects: fireball laser sweep rate.
 */
export const FIREBALL_ROTATION_PERIOD_MS = 2000

// ============================================================
// Ice Crystal skill constants
// ============================================================

/** Ice Crystal projectile speed. Very slow — telegraphed. Unit: cm/s. Affects: ice_crystal time-to-hit. */
export const ICE_CRYSTAL_SPEED_CM = 20

/** Ice Crystal laser rotation period. Same cadence as fireball. Unit: ms. Affects: ice_crystal aiming window. */
export const ICE_CRYSTAL_ROTATION_PERIOD_MS = 2000

/** Ice Crystal minimum base damage (before multipliers). Spread: 3–5. Unit: HP. Affects: ice_crystal damage output. */
export const ICE_CRYSTAL_DAMAGE_MIN = 3

/** Ice Crystal maximum base damage (before multipliers). Spread: 3–5. Unit: HP. Affects: ice_crystal damage output. */
export const ICE_CRYSTAL_DAMAGE_MAX = 5

/** Freeze duration applied on CRIT (head zone). Unit: ms. Affects: enemy frozen state duration. */
export const ICE_CRYSTAL_FREEZE_CRIT_MS = 2000

/** Freeze duration applied on HIT (torso zone). Unit: ms. Affects: enemy frozen state duration. */
export const ICE_CRYSTAL_FREEZE_HIT_MS = 1000

// ============================================================
// Lightning Blast skill constants
// ============================================================

/** Lightning Blast laser rotation period. Fast sweep — tight timing window. Unit: ms. Affects: lightning_blast aiming window. */
export const LIGHTNING_BLAST_ROTATION_PERIOD_MS = 1200

/** Lightning Blast minimum base damage (before multipliers). Spread: 9–12. Unit: HP. Affects: lightning_blast damage output. */
export const LIGHTNING_BLAST_DAMAGE_MIN = 9

/** Lightning Blast maximum base damage (before multipliers). Spread: 9–12. Unit: HP. Affects: lightning_blast damage output. */
export const LIGHTNING_BLAST_DAMAGE_MAX = 12

/** Lightning Blast visual discharge duration on CRIT (head zone). Unit: ms. Affects: lightning_blast render duration. */
export const LIGHTNING_BLAST_DURATION_CRIT_MS = 600

/** Lightning Blast visual discharge duration on HIT (torso zone). Unit: ms. Affects: lightning_blast render duration. */
export const LIGHTNING_BLAST_DURATION_HIT_MS = 300

/** Lightning Blast visual discharge duration on GRAZE (limb zone). Unit: ms. Affects: lightning_blast render duration. */
export const LIGHTNING_BLAST_DURATION_GRAZE_MS = 150

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
// Enemy definitions — 11 sprite-based characters
// ============================================================

/**
 * Stone Giant — sprite-based enemy with pixel-perfect mask hit detection.
 * Uses PNG mask-based hit detection for precise crit/hit/graze/miss resolution.
 */
export const ENEMY_STONE_GIANT: EnemyDef = {
  name: 'Stone Giant',
  maxHp: 70,
  manifestId: 'stone-giant',
  spriteKey: 'stone_giant',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 400,
  behaviorGraph: stoneGiantGraph,
}

/**
 * Ice Giant — sprite-based enemy. Two attack phases (windup + throw), no idle yet.
 * Uses first attack animation frame as idle placeholder until idle animation is created.
 */
export const ENEMY_ICE_GIANT: EnemyDef = {
  name: 'Ice Giant',
  maxHp: 65,
  manifestId: 'ice-giant',
  spriteKey: 'ice_giant',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 248,
  behaviorGraph: iceGiantGraph,
}

/** Ember Wisp — tiny, barely visible. Difficulty from precision, not prediction. */
export const ENEMY_EMBER_WISP: EnemyDef = {
  name: 'Ember Wisp',
  maxHp: 20,
  manifestId: 'ember-wisp',
  spriteKey: 'ember_wisp',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  behaviorGraph: emberWispGraph,
}

/** Crystal Spider — disproportionately large crit field; low HP forces crit-focused play. */
export const ENEMY_CRYSTAL_SPIDER: EnemyDef = {
  name: 'Crystal Spider',
  maxHp: 15,
  manifestId: 'crystal-spider',
  spriteKey: 'crystal_spider',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 224,
  behaviorGraph: crystalSpiderGraph,
}

/** Plague Rat — extremely small. Accuracy is the true obstacle. Holds position (no lateral movement). */
export const ENEMY_PLAGUE_RAT: EnemyDef = {
  name: 'Plague Rat',
  maxHp: 13,
  manifestId: 'plague-rat',
  spriteKey: 'plague_rat',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 180,
  behaviorGraph: plagueRatGraph,
}

/** Iron Golem — massive dark iron construct. Very high HP, punishes misses. */
export const ENEMY_IRON_GOLEM: EnemyDef = {
  name: 'Iron Golem',
  maxHp: 80,
  manifestId: 'iron-golem',
  spriteKey: 'iron_golem',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 240,
  behaviorGraph: ironGolemGraph,
}

/** Ancient Treant — highest HP enemy. Endurance fight against a massive tree. */
export const ENEMY_ANCIENT_TREANT: EnemyDef = {
  name: 'Ancient Treant',
  maxHp: 90,
  manifestId: 'ancient-treant',
  spriteKey: 'ancient_treant',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  behaviorGraph: ancientTreantGraph,
}

/** Goblin Scout — small, lightly armoured skirmisher. Low HP, easy warm-up enemy. */
export const ENEMY_GOBLIN_SCOUT: EnemyDef = {
  name: 'Goblin Scout',
  maxHp: 18,
  manifestId: 'goblin-scout',
  spriteKey: 'goblin_scout',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 120,
  behaviorGraph: goblinScoutGraph,
}

/** Orc Warrior — heavy bruiser with an axe. High HP, punishes slow play. */
export const ENEMY_ORC_WARRIOR: EnemyDef = {
  name: 'Orc Warrior',
  maxHp: 55,
  manifestId: 'orc-warrior',
  spriteKey: 'orc_warrior',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 220,
  behaviorGraph: orcWarriorGraph,
}

/** Mirror Knight — armoured duelist with sword and shield. Tanky mid-campaign wall. */
export const ENEMY_MIRROR_KNIGHT: EnemyDef = {
  name: 'Mirror Knight',
  maxHp: 60,
  manifestId: 'mirror-knight',
  spriteKey: 'mirror_knight',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 160,
  behaviorGraph: mirrorKnightGraph,
}

/**
 * Insect Swarm — a cloud of insects that flies left-to-right across the arena.
 * Moderate HP, but the constant lateral sweep makes it the hardest enemy to track.
 */
export const ENEMY_INSECT_SWARM: EnemyDef = {
  name: 'Insect Swarm',
  maxHp: 25,
  manifestId: 'insect-swarm',
  spriteKey: 'insect_swarm',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: {
    pattern: 'lr_oscillate',
    speed: ENEMY_MOVE_SPEED_BASE,
    amplitude: ENEMY_LR_AMPLITUDE_WIDE,
  },
  displayWidth: 128,
  behaviorGraph: insectSwarmGraph,
}

// ============================================================
// Bench enemies — NOT in ENEMY_POOL, NOT in the campaign.
// Each needs a behaviorGraph (see enemyGraphs.ts) before being added to ENEMY_POOL.
// ============================================================

/** Barn Spider — dog-sized ambush spider. Low HP beast enemy; precision over endurance. */
export const ENEMY_BARN_SPIDER: EnemyDef = {
  name: 'Barn Spider',
  maxHp: 16,
  manifestId: 'barn-spider',
  spriteKey: 'barn_spider',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 200,
}

/** Wolf — lean gray predator. Moderate HP beast; a step up from the early vermin enemies. */
export const ENEMY_WOLF: EnemyDef = {
  name: 'Wolf',
  maxHp: 30,
  manifestId: 'wolf',
  spriteKey: 'wolf',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 210,
}

/** Wild Boar — stocky, mud-caked charging beast. Tankier than the wolf; a heavy mid-tier beast. */
export const ENEMY_WILD_BOAR: EnemyDef = {
  name: 'Wild Boar',
  maxHp: 40,
  manifestId: 'wild-boar',
  spriteKey: 'wild_boar',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 230,
}

/** Bandit — hooded dual-wielding outlaw. Humanoid mid-tier; nimble roadside robber. */
export const ENEMY_BANDIT: EnemyDef = {
  name: 'Bandit',
  maxHp: 35,
  manifestId: 'bandit',
  spriteKey: 'bandit',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 150,
}

// ============================================================
// Enemy pool — sequential rotation through all sprite-based characters
// ============================================================

/** After each kill the next enemy in the pool is loaded. Wraps around modulo length. */
export const ENEMY_POOL: readonly EnemyDef[] = [
  ENEMY_STONE_GIANT,
  ENEMY_PLAGUE_RAT,
  ENEMY_ICE_GIANT,
  ENEMY_CRYSTAL_SPIDER,
  ENEMY_EMBER_WISP,
  ENEMY_IRON_GOLEM,
  ENEMY_ANCIENT_TREANT,
  ENEMY_GOBLIN_SCOUT,
  ENEMY_ORC_WARRIOR,
  ENEMY_MIRROR_KNIGHT,
  ENEMY_INSECT_SWARM,
]

// ============================================================
// Global upgrade tree — pure data model
// Defines starting GlobalUpgradeState and the full node graph.
// Game systems read the aggregated state — they never look at nodes directly.
// ============================================================

/**
 * Starting global upgrade state at the beginning of a run.
 * critDamageMultiplier reuses CRIT_DAMAGE_MULTIPLIER so the default upgrade
 * state matches the unmodified damage formula.
 * Frozen so the shared reference can't be mutated by accident.
 */
export const DEFAULT_GLOBAL_UPGRADE_STATE: GlobalUpgradeState = Object.freeze({
  castTimeMultiplier: 1.0,
  critDamageMultiplier: CRIT_DAMAGE_MULTIPLIER,
  critZoneTolerance: 0,
  critStunChance: 0,
  critStunDurationMs: 0,
  projectileSpeedMultiplier: 1.0,
  quickChainBonus: 0,
  quickChainWindowMs: 0,
  spellAreaMultiplier: 1.0,
  unlockedNodeIds: Object.freeze([]) as readonly UpgradeNodeId[],
})

/**
 * Full upgrade tree definition.
 * Five paths × ~3 tiers each. Tier N requires tier N-1 of the same path.
 * quick_chain_1 has OR prerequisites (cast_time_1 OR proj_speed_1) — getAvailableNodes
 * resolves OR semantics via `requires.some(...)`.
 */
export const UPGRADE_NODES: readonly UpgradeNodeDef[] = [
  { id: 'cast_time_1',  title: 'Zrychlení I',          description: 'Laser sweep o 10 % rychlejší',                   path: 'cast_time',  requires: [],              applyTo: (s) => ({ ...s, castTimeMultiplier: 0.90 }) },
  { id: 'cast_time_2',  title: 'Zrychlení II',         description: 'Laser sweep o 20 % rychlejší',                   path: 'cast_time',  requires: ['cast_time_1'], applyTo: (s) => ({ ...s, castTimeMultiplier: 0.80 }) },
  { id: 'cast_time_3',  title: 'Zrychlení III',        description: 'Laser sweep o 30 % rychlejší',                   path: 'cast_time',  requires: ['cast_time_2'], applyTo: (s) => ({ ...s, castTimeMultiplier: 0.70 }) },
  { id: 'crit_dmg_1',   title: 'Ostré hroty I',        description: 'Crit damage multiplier 2.3×',                    path: 'crit',       requires: [],              applyTo: (s) => ({ ...s, critDamageMultiplier: 2.3 }) },
  { id: 'crit_dmg_2',   title: 'Ostré hroty II',       description: 'Crit damage multiplier 2.7×',                    path: 'crit',       requires: ['crit_dmg_1'],  applyTo: (s) => ({ ...s, critDamageMultiplier: 2.7 }) },
  { id: 'crit_dmg_3',   title: 'Ostré hroty III',      description: 'Crit damage multiplier 3.2×',                    path: 'crit',       requires: ['crit_dmg_2'],  applyTo: (s) => ({ ...s, critDamageMultiplier: 3.2 }) },
  { id: 'crit_zone_1',  title: 'Rozšířená slabina I',  description: 'Crit zóna o 15 % širší tolerance',               path: 'crit',       requires: ['crit_dmg_1'],  applyTo: (s) => ({ ...s, critZoneTolerance: 0.15 }) },
  { id: 'crit_zone_2',  title: 'Rozšířená slabina II', description: 'Crit zóna o 30 % širší tolerance',               path: 'crit',       requires: ['crit_zone_1'], applyTo: (s) => ({ ...s, critZoneTolerance: 0.30 }) },
  { id: 'crit_stun_1',  title: 'Omráčení I',           description: '20% šance omráčit nepřítele na 1.5 s při critu', path: 'crit',       requires: ['crit_dmg_2'],  applyTo: (s) => ({ ...s, critStunChance: 0.20, critStunDurationMs: 1500 }) },
  { id: 'crit_stun_2',  title: 'Omráčení II',          description: '35% šance omráčit nepřítele na 2.0 s při critu', path: 'crit',       requires: ['crit_stun_1'], applyTo: (s) => ({ ...s, critStunChance: 0.35, critStunDurationMs: 2000 }) },
  { id: 'proj_speed_1', title: 'Rychlý výstřel I',     description: 'Projektily o 15 % rychlejší',                    path: 'proj_speed', requires: [],              applyTo: (s) => ({ ...s, projectileSpeedMultiplier: 1.15 }) },
  { id: 'proj_speed_2', title: 'Rychlý výstřel II',    description: 'Projektily o 30 % rychlejší',                    path: 'proj_speed', requires: ['proj_speed_1'], applyTo: (s) => ({ ...s, projectileSpeedMultiplier: 1.30 }) },
  { id: 'proj_speed_3', title: 'Rychlý výstřel III',   description: 'Projektily o 50 % rychlejší',                    path: 'proj_speed', requires: ['proj_speed_2'], applyTo: (s) => ({ ...s, projectileSpeedMultiplier: 1.50 }) },
  // quick_chain_1: OR dependency — cast_time_1 OR proj_speed_1 unlocks it.
  { id: 'quick_chain_1', title: 'Řetěz I',  description: '+20 % damage při dvou výstřelech do 800 ms',  path: 'quick_chain', requires: ['cast_time_1', 'proj_speed_1'], applyTo: (s) => ({ ...s, quickChainBonus: 0.20, quickChainWindowMs: 800 }) },
  { id: 'quick_chain_2', title: 'Řetěz II', description: '+35 % damage při dvou výstřelech do 1000 ms', path: 'quick_chain', requires: ['quick_chain_1'],               applyTo: (s) => ({ ...s, quickChainBonus: 0.35, quickChainWindowMs: 1000 }) },
  { id: 'spell_area_1', title: 'Větší dopad I',   description: 'Plocha kouzla o 20 % větší', path: 'spell_area', requires: [],               applyTo: (s) => ({ ...s, spellAreaMultiplier: 1.20 }) },
  { id: 'spell_area_2', title: 'Větší dopad II',  description: 'Plocha kouzla o 40 % větší', path: 'spell_area', requires: ['spell_area_1'], applyTo: (s) => ({ ...s, spellAreaMultiplier: 1.40 }) },
  { id: 'spell_area_3', title: 'Větší dopad III', description: 'Plocha kouzla o 60 % větší', path: 'spell_area', requires: ['spell_area_2'], applyTo: (s) => ({ ...s, spellAreaMultiplier: 1.60 }) },
]

/**
 * Display titles for each upgrade path — used as column headers in the
 * level-up picker. Keeps copy out of the renderer so designers can retune.
 */
export const UPGRADE_PATH_TITLES: Readonly<Record<import('../types').UpgradePath, string>> = {
  cast_time:   'CAST TIME',
  crit:        'CRIT DMG',
  proj_speed:  'PROJ SPEED',
  spell_area:  'SPELL AREA',
  quick_chain: 'QUICK CHAIN',
}

/**
 * Column ordering for the level-up picker tree (left → right).
 * quick_chain is rendered separately as a cross-path row below the tree.
 */
export const UPGRADE_TREE_COLUMNS: readonly import('../types').UpgradePath[] = [
  'cast_time',
  'crit',
  'proj_speed',
  'spell_area',
]

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
