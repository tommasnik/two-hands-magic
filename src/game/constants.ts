import type { SkillType, HitResult, EnemyDef, LevelDef, TouchPointDef, HitZoneEntry, ShapeDescriptor, HitZoneLayout, EnemyAttackDef, GlobalUpgradeState, UpgradeNodeDef, UpgradeNodeId } from '../types'
export type { TouchPointDef, MovementPattern, EnemyBehaviorDef, ShapeDescriptor, HitZoneLayout } from '../types'

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
export const PLAYER_MAX_LEVEL = 6

/**
 * Cumulative kill counts that promote the player to each level.
 * Key = target level, value = cumulative enemy kills required to reach it.
 * Derived from the 18-level campaign: 5 level-ups across the full run.
 * Unit: enemy kills. Affects: pacing of upgrade picks.
 */
export const XP_LEVEL_THRESHOLDS: Readonly<Record<number, number>> = {
  2: 1,
  3: 3,
  4: 6,
  5: 11,
  6: 18,
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

/**
 * Default enemy missile speed (cm/s). Slower than the base player projectile so that
 * incoming attacks read as telegraphed orbs.
 * Derived from PROJECTILE_SPEED_CM * 0.5.
 * Unit: cm/s.
 */
export const ENEMY_MISSILE_SPEED_BASE_CMS = PROJECTILE_SPEED_CM * 0.5

/**
 * Standard Goblin Scout pebble throw — sole attack of the introductory enemy.
 * Cooldown is long enough that a power user kills the goblin before the first
 * missile reaches the player; short enough that a casual player gets hit once
 * during a typical encounter.
 */
export const GOBLIN_SCOUT_PEBBLE_ATTACK: EnemyAttackDef = {
  name: 'Pebble Throw',
  /** damage: 6 HP — one hit removes 20% of PLAYER_MAX_HP (= 30). Survivable, signals pressure. Unit: HP. */
  damage: 6,
  /** cooldownMs: 3500 — first pebble lands at ~3.5 s + flight time. Unit: ms. */
  cooldownMs: 3500,
  /** weight: 1 — sole attack, single weight has no effect. */
  weight: 1,
  /** projectileColor: dirty-amber, evokes a thrown rock. */
  projectileColor: '#c98d3a',
  /** projectileSpeedCmS: half the base so the orb reads as telegraphed. Unit: cm/s. */
  projectileSpeedCmS: ENEMY_MISSILE_SPEED_BASE_CMS,
  /** castPoint: enemy torso centre — neutral origin for the prototype humanoid. Unit: px. */
  castPoint: { dx: 0, dy: 0 },
}

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
// ============================================================

/** Head hit zone radius. Unit: cm. Affects: CRIT hit area size. */
export const ENEMY_HEAD_RADIUS_CM = 1.1

/** Torso width. Unit: cm. Affects: HIT body area width. */
export const ENEMY_TORSO_WIDTH_CM = 2.6

/** Torso height. Unit: cm. Affects: HIT body area height. */
export const ENEMY_TORSO_HEIGHT_CM = 3.6

/** Arm length. Unit: cm. Affects: GRAZE arm reach. */
export const ENEMY_ARM_LENGTH_CM = 3.4

/** Leg length. Unit: cm. Affects: GRAZE leg reach. */
export const ENEMY_LEG_LENGTH_CM = 4.2

/** Limb (arm/leg) capsule radius. Unit: cm. Affects: GRAZE limb hit width. Derived from torso. */
export const ENEMY_LIMB_RADIUS_CM = ENEMY_TORSO_WIDTH_CM * (0.45 / 2.6)

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
 * Default skill slot configuration: 1 slow_shot on the left, 1 fast_shot on the right.
 * This is the initial 1+1 layout — backward-compatible with the single-touch-point UI.
 * Unit: SkillSlotConfig[]. Affects: touch point layout and skill routing in GameStateMachine.
 */
export const DEFAULT_SKILL_CONFIG: readonly SkillSlotConfig[] = [
  { skillType: LEFT_SIDE_SKILL,  side: 'left',  slotIndex: 0 },
  { skillType: RIGHT_SIDE_SKILL, side: 'right', slotIndex: 0 },
]

/**
 * Visual radius of touch point circles.
 * Increased from 22 to 30 for more comfortable thumb targeting on mobile.
 * Unit: px. Affects: tap target size and visual prominence of touch points.
 */
export const TOUCHPOINT_RADIUS = 30

/** Arm length in pixels. Used for rendering arm capsules. */
export const ENEMY_ARM_LENGTH_PX = ENEMY_ARM_LENGTH_CM * PIXELS_PER_CM

/** Leg length in pixels. Used for rendering leg capsules. */
export const ENEMY_LEG_LENGTH_PX = ENEMY_LEG_LENGTH_CM * PIXELS_PER_CM

/** Head hit zone radius in pixels. Derived from ENEMY_HEAD_RADIUS_CM. Unit: px. */
export const ENEMY_HEAD_RADIUS_PX = ENEMY_HEAD_RADIUS_CM * PIXELS_PER_CM

/** Torso width in pixels. Derived from ENEMY_TORSO_WIDTH_CM. Unit: px. */
export const ENEMY_TORSO_WIDTH_PX = ENEMY_TORSO_WIDTH_CM * PIXELS_PER_CM

/** Torso height in pixels. Derived from ENEMY_TORSO_HEIGHT_CM. Unit: px. */
export const ENEMY_TORSO_HEIGHT_PX = ENEMY_TORSO_HEIGHT_CM * PIXELS_PER_CM

/** Limb (arm/leg) hit zone radius in pixels. Derived from ENEMY_LIMB_RADIUS_CM. Unit: px. */
export const ENEMY_LIMB_RADIUS_PX = ENEMY_LIMB_RADIUS_CM * PIXELS_PER_CM

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

/** @deprecated Use WHITE_SHOT_SKILL_DAMAGE_MIN / MAX — kept for legacy reference only. */
export const WHITE_SHOT_SKILL_DAMAGE = FAST_SKILL_DAMAGE * 0.3

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

/** @deprecated Use FIREBALL_SKILL_DAMAGE_MIN / MAX — kept for legacy reference only. */
export const FIREBALL_SKILL_DAMAGE = SLOW_SKILL_DAMAGE * 0.6

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
 * movement is a secondary pressure mechanic (Lava Slug, Void Wraith, Titan Lord).
 * Derived from ENEMY_MOVE_SPEED_BASE * 0.5.
 * Unit: px/s.
 */
export const ENEMY_MOVE_SPEED_SLOW = ENEMY_MOVE_SPEED_BASE * 0.5

/**
 * Fast enemy movement speed — used for small / evasive enemies
 * (Plague Rat, Thornback, Thunder Hawk).
 * Derived from ENEMY_MOVE_SPEED_BASE * 1.8.
 * Unit: px/s.
 */
export const ENEMY_MOVE_SPEED_FAST = ENEMY_MOVE_SPEED_BASE * 1.8

/**
 * Default horizontal amplitude for lr_oscillate pattern (Shadow Dancer, Swarm, Lava Slug).
 * Half-width of the left-right sweep around the enemy's origin X.
 * Derived from GAME_WIDTH * 0.25 — sweeps through the middle half of the screen.
 * Unit: px.
 */
export const ENEMY_LR_AMPLITUDE_DEFAULT = GAME_WIDTH * 0.25

/**
 * Wide horizontal amplitude for slow, large enemies (Void Wraith, Titan Lord).
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
// Enemy sprite placeholder key
// ============================================================

/**
 * Fallback Phaser texture key used when an enemy's spriteKey texture is not loaded.
 * BattleScene checks texture existence before using it; if absent, this key is used instead.
 * Unit: string (Phaser texture key). Affects: enemy rendering fallback.
 */
export const ENEMY_SPRITE_PLACEHOLDER_KEY = 'enemy_placeholder'

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
// Default hit zone layout — three-zone model (crit/mid/low) for the base humanoid
// All values are in canvas pixels, relative to the enemy torso centre.
// crit  = head circle above torso
// mid   = torso circle (centred at torso anchor)
// low   = outer circle covering limbs
// ============================================================

/**
 * Default hit zone layout derived from the base humanoid body constants.
 * Used by enemies that do not define their own hitZoneLayout.
 * Crit zone: head circle, offset up by half torso height + head radius.
 * Mid zone: torso circle, radius = half torso width.
 * Low zone: outer body circle encompassing limbs, radius = torso height.
 * Unit: px. Affects: hit detection in Enemy.getHitZone() and getHitResult().
 */
export const DEFAULT_HIT_ZONE_LAYOUT: HitZoneLayout = {
  critDx: 0,
  critDy: -(ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_HEAD_RADIUS_PX),
  critRadius: ENEMY_HEAD_RADIUS_PX,
  midDx: 0,
  midDy: 0,
  midRadius: ENEMY_TORSO_WIDTH_PX / 2,
  lowDx: 0,
  lowDy: ENEMY_TORSO_HEIGHT_PX * 0.2,
  lowRadius: ENEMY_TORSO_HEIGHT_PX,
}

/**
 * Default humanoid shape descriptor for medium-sized enemies.
 * Scale 1.0, head scale 1.0, standard torso width ratio.
 * Unit: ShapeDescriptor. Affects: procedural rendering in BattleScene.
 */
export const DEFAULT_SHAPE: ShapeDescriptor = {
  type: 'humanoid',
  scale: 1.0,
  headScale: 1.0,
  widthRatio: 1.0,
}

// ============================================================
// Enemy definitions
// ============================================================

/**
 * Goblin Scout — Level 1 enemy. Easy introduction fight.
 * Standard crit zone, low HP pool. Small humanoid with generous hit zones.
 */
export const ENEMY_GOBLIN_SCOUT: EnemyDef = {
  name: 'Goblin Scout',
  /** HP: 60. Unit: HP. Affects: number of hits required to defeat. */
  maxHp: 60,
  /** critZoneScale: 1.0 — default head radius, easiest crit target. Unit: dimensionless multiplier. */
  critZoneScale: 1.0,
  /** spriteKey: Phaser texture key for the goblin scout sprite. */
  spriteKey: 'goblin_scout',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** behavior: static — teaches mechanics without movement pressure. */
  behavior: { pattern: 'static', speed: 0 },
  /** shape: small humanoid — slightly shorter and thinner than base. */
  shape: { type: 'humanoid', scale: 0.85, headScale: 1.0, widthRatio: 0.85 },
  /**
   * hitZoneLayout: goblin scout — standard humanoid crit/mid/low.
   * Crit (head): above torso, radius = HEAD_RADIUS_PX. Full-size head = easy crit.
   * Mid (torso): centred, radius = TORSO_WIDTH_PX * 0.5. Wide body = easy hit.
   * Low (limbs): outer ring, radius = TORSO_HEIGHT_PX * 0.95. Generous limb area.
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: -(ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_HEAD_RADIUS_PX),
    critRadius: ENEMY_HEAD_RADIUS_PX,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.5,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.15,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 0.95,
  },
  /** attacks: single Pebble Throw — slow telegraph, mild damage. */
  attacks: [GOBLIN_SCOUT_PEBBLE_ATTACK],
}

/**
 * Orc Warrior — Level 2 enemy. Reduced crit zone, more HP. Stocky humanoid.
 */
export const ENEMY_ORC_WARRIOR: EnemyDef = {
  name: 'Orc Warrior',
  /** HP: 80. Unit: HP. Affects: number of hits required to defeat. */
  maxHp: 80,
  /** critZoneScale: 0.7 — smaller head, harder crit. Unit: dimensionless multiplier. */
  critZoneScale: 0.7,
  /** spriteKey: Phaser texture key for the orc warrior sprite. */
  spriteKey: 'orc_warrior',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** behavior: static — stands firm, raw crit difficulty is the challenge. */
  behavior: { pattern: 'static', speed: 0 },
  /** shape: stocky humanoid — wider torso, smaller head relative to body. */
  shape: { type: 'humanoid', scale: 1.1, headScale: 0.7, widthRatio: 1.2 },
  /**
   * hitZoneLayout: orc warrior — smaller crit zone, wide torso.
   * Crit (head): tighter radius = ENEMY_HEAD_RADIUS_PX * 0.7 — requires precision.
   * Mid (torso): wider radius = TORSO_WIDTH_PX * 0.6 — stocky build.
   * Low (limbs): slightly larger outer ring — heavy limbs are easy GRAZE targets.
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: -(ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_HEAD_RADIUS_PX * 0.7),
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.7,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.6,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.2,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 1.05,
  },
}

/**
 * Stone Troll — Level 3 enemy (boss). Smallest crit zone, highest HP. Massive humanoid.
 */
export const ENEMY_STONE_TROLL: EnemyDef = {
  name: 'Stone Troll',
  /** HP: 104. Unit: HP. Affects: number of hits required to defeat. */
  maxHp: 104,
  /** critZoneScale: 0.55 — very small head, hardest crit. Unit: dimensionless multiplier. */
  critZoneScale: 0.55,
  /** spriteKey: Phaser texture key for the stone troll sprite. */
  spriteKey: 'stone_troll',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** behavior: static — challenge is precision, not prediction. */
  behavior: { pattern: 'static', speed: 0 },
  /** shape: massive humanoid — larger scale, very small head relative to huge body. */
  shape: { type: 'humanoid', scale: 1.4, headScale: 0.55, widthRatio: 1.3 },
  /**
   * hitZoneLayout: stone troll — tiny crit, huge body.
   * Crit (head): very small radius = ENEMY_HEAD_RADIUS_PX * 0.55 — extremely precise.
   * Mid (torso): very wide radius = TORSO_WIDTH_PX * 0.75 — large body = easy hit.
   * Low (limbs): very large outer ring — massive limbs everywhere.
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: -(ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_HEAD_RADIUS_PX * 0.55),
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.55,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.75,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.25,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 1.2,
  },
}

/** Stone Giant sprite display width. Unit: px. Affects: sprite rendering scale and mask coordinate conversion. */
export const STONE_GIANT_DISPLAY_WIDTH = ENEMY_TORSO_WIDTH_PX * 2.5

/**
 * Stone Giant — Level 3 enemy. Replaces Stone Troll with pixel-perfect sprite.
 * Uses PNG mask-based hit detection for precise crit/hit/graze/miss resolution.
 * HP is higher than Stone Troll to account for the larger sprite and visual presence.
 * Inherits Stone Troll's attack patterns and fallback hitZoneLayout geometry.
 */
export const ENEMY_STONE_GIANT: EnemyDef = {
  name: 'Stone Giant',
  /** HP: 140. Stronger than Stone Troll (104) but not overwhelming for level 3. Unit: HP. */
  maxHp: 140,
  /** critZoneScale: 0.55 — same as Stone Troll; very small head, hardest crit. Unit: dimensionless multiplier. */
  critZoneScale: 0.55,
  /** spriteKey: Phaser texture key for the Stone Giant animated sprite. */
  spriteKey: 'stone_giant',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** behavior: static — challenge is precision, not prediction. */
  behavior: { pattern: 'static', speed: 0 },
  /** shape: massive humanoid — larger scale, very small head relative to huge body. */
  shape: { type: 'humanoid', scale: 1.4, headScale: 0.55, widthRatio: 1.3 },
  /**
   * hitZoneLayout: fallback geometric layout matching Stone Troll.
   * Used when mask data is not available (e.g. in unit tests without Phaser).
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: -(ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_HEAD_RADIUS_PX * 0.55),
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.55,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.75,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.25,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 1.2,
  },
  /** attacks: inherited from Stone Troll. */
  attacks: ENEMY_STONE_TROLL.attacks,
  /** maskConfig: pixel-perfect PNG masks for idle (10 frames) and throw (7 frames). */
  maskConfig: {
    idle: { frameCount: 10, prefix: 'mask_idle_' },
    throw: { frameCount: 7, prefix: 'mask_throw_' },
  },
  /** displayWidth: must match STONE_GIANT_DISPLAY_WIDTH so mask coords align with rendering. */
  displayWidth: STONE_GIANT_DISPLAY_WIDTH,
}

/** Stone Giant idle animation frame count. Unit: frames. Affects: idle loop length. */
export const STONE_GIANT_IDLE_FRAME_COUNT = 10

/** Stone Giant throw animation frame count. Unit: frames. Affects: throw animation length. */
export const STONE_GIANT_THROW_FRAME_COUNT = 7

/** Stone Giant idle animation frame duration. Unit: ms. Affects: idle loop speed (1.5s full cycle). */
export const STONE_GIANT_IDLE_FRAME_MS = 150

/** Stone Giant throw animation frame duration. Unit: ms. Affects: throw animation speed (~700ms total). */
export const STONE_GIANT_THROW_FRAME_MS = 100

// ============================================================
// Extended enemy roster — 15 enemy types for future levels / sandbox use
// Each EnemyDef includes size, movementPattern, hitZone, and critZone metadata.
// hitZone: fraction of the enemy body that can be hit (0–1)
// critZone: fraction of the hit zone that triggers a crit (0–1)
// ============================================================

/**
 * Ember Wisp — tiny, barely visible. Very small hit zone makes every shot a challenge.
 * Design specialty: casual player needs significantly more hits than on a standard enemy.
 * HP is low but the hit zone is so small that overall TTK (time-to-kill) is high.
 */
export const ENEMY_EMBER_WISP: EnemyDef = {
  name: 'Ember Wisp',
  /** HP: 40. Low raw HP, but tiny size means many shots miss entirely. Unit: HP. */
  maxHp: 40,
  /** critZoneScale: 0.6 — small but proportional crit zone to body. Unit: multiplier. */
  critZoneScale: 0.6,
  /** spriteKey: Phaser texture key for the ember wisp sprite. */
  spriteKey: 'ember_wisp',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: tiny — smallest enemy class. Affects: visual scale and base hit zone. */
  size: 'tiny',
  /** movementPattern: static — difficulty comes from precision, not prediction. */
  movementPattern: 'static',
  /** hitZone: 0.3 — only 30% of the usual body area is hittable. Unit: 0–1. */
  hitZone: 0.3,
  /** critZone: 0.2 — 20% of the hit zone triggers CRIT. Unit: 0–1. */
  critZone: 0.2,
  /** behavior: static — difficulty from precision, not prediction. */
  behavior: { pattern: 'static', speed: 0 },
  /** shape: wisp — single glowing orb, very small. */
  shape: { type: 'wisp', scale: 0.35, headScale: 0.6, widthRatio: 1.0 },
  /**
   * hitZoneLayout: ember wisp — very tight zones, all three overlap a tiny central area.
   * Crit: small orb core, radius = ENEMY_HEAD_RADIUS_PX * 0.3 — tiny bright core.
   * Mid: slightly larger orb body, radius = ENEMY_HEAD_RADIUS_PX * 0.6.
   * Low: outer glow edge, radius = ENEMY_HEAD_RADIUS_PX * 0.9 — barely hittable.
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: 0,
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.3,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_HEAD_RADIUS_PX * 0.6,
    lowDx: 0,
    lowDy: 0,
    lowRadius: ENEMY_HEAD_RADIUS_PX * 0.9,
  },
}

/**
 * Iron Golem — enormous, wide hit zone, but compensated by massive HP pool.
 * Design specialty: large hit zone makes aiming trivial; high HP demands sustained DPS.
 */
export const ENEMY_IRON_GOLEM: EnemyDef = {
  name: 'Iron Golem',
  /** HP: 280. Enormous HP — must deal sustained damage to overcome. Unit: HP. */
  maxHp: 280,
  /** critZoneScale: 1.2 — oversized head matching the giant body. Unit: multiplier. */
  critZoneScale: 1.2,
  /** spriteKey: Phaser texture key for the iron golem sprite. */
  spriteKey: 'iron_golem',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: enormous — largest non-boss enemy. Affects: visual scale and hit zone. */
  size: 'enormous',
  /** movementPattern: static — compensated by pure HP bulk. */
  movementPattern: 'static',
  /** hitZone: 0.95 — 95% of the huge body is hittable. Unit: 0–1. */
  hitZone: 0.95,
  /** critZone: 0.5 — 50% of hit zone crits — head is large but HP ratio tests endurance. Unit: 0–1. */
  critZone: 0.5,
  /** behavior: static — compensated by pure HP bulk; no movement pressure. */
  behavior: { pattern: 'static', speed: 0 },
  /** shape: blob-like golem — very wide, squat body with massive proportions. */
  shape: { type: 'blob', scale: 1.8, headScale: 1.2, widthRatio: 1.5 },
  /**
   * hitZoneLayout: iron golem — oversized everything.
   * Crit (head): very large dome, radius = ENEMY_HEAD_RADIUS_PX * 1.2.
   * Mid (torso): massive body width, radius = TORSO_WIDTH_PX * 0.9.
   * Low (limbs): enormous outer ring covering giant arms/legs.
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: -(ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_HEAD_RADIUS_PX * 1.2),
    critRadius: ENEMY_HEAD_RADIUS_PX * 1.2,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.9,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.3,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 1.4,
  },
}

/**
 * Crystal Spider — small body, but disproportionately large crit field (crystalline weak spots).
 * Design specialty: even casual players hit crits, but the low HP forces many crit hits to kill it.
 * Note: small HP means fast death IF you crit; missing means the fight drags.
 */
export const ENEMY_CRYSTAL_SPIDER: EnemyDef = {
  name: 'Crystal Spider',
  /** HP: 30. Low HP — but you need crits, not just hits. Unit: HP. */
  maxHp: 30,
  /** critZoneScale: 1.8 — enormous crit zone relative to its small body. Unit: multiplier. */
  critZoneScale: 1.8,
  /** spriteKey: Phaser texture key for the crystal spider sprite. */
  spriteKey: 'crystal_spider',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: small — low profile, easy to overlook but easy to crit. */
  size: 'small',
  /** movementPattern: static — stays still; challenge is hitting the right zone. */
  movementPattern: 'static',
  /** hitZone: 0.5 — medium hit zone for a small enemy. Unit: 0–1. */
  hitZone: 0.5,
  /** critZone: 0.75 — 75% of its small hit zone is a crit zone. Unit: 0–1. */
  critZone: 0.75,
  /** behavior: static — stays still; challenge is hitting the right zone. */
  behavior: { pattern: 'static', speed: 0 },
  /** shape: spider — low, wide, 8-legged silhouette. */
  shape: { type: 'spider', scale: 0.7, headScale: 1.8, widthRatio: 2.2 },
  /**
   * hitZoneLayout: crystal spider — huge crit zone (crystalline core), small body.
   * Crit (weak point): enormous glowing core, radius = ENEMY_HEAD_RADIUS_PX * 1.0.
   * Mid (body): small torso below core, radius = ENEMY_TORSO_WIDTH_PX * 0.3.
   * Low (legs): very wide flat ring around body, radius = ENEMY_TORSO_WIDTH_PX * 0.7.
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: -(ENEMY_TORSO_HEIGHT_PX * 0.1),
    critRadius: ENEMY_HEAD_RADIUS_PX * 1.0,
    midDx: 0,
    midDy: ENEMY_TORSO_HEIGHT_PX * 0.2,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.3,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.25,
    lowRadius: ENEMY_TORSO_WIDTH_PX * 0.7,
  },
}

/**
 * Shadow Dancer — moves left-to-right in a predictable strafe pattern.
 * Design specialty: power user predicts and leads the target; casual struggles to track.
 */
export const ENEMY_SHADOW_DANCER: EnemyDef = {
  name: 'Shadow Dancer',
  /** HP: 90. Medium HP — enough to require multiple shots. Unit: HP. */
  maxHp: 90,
  /** critZoneScale: 0.8 — slightly smaller crit zone, rewards leading the target. Unit: multiplier. */
  critZoneScale: 0.8,
  /** spriteKey: Phaser texture key for the shadow dancer sprite. */
  spriteKey: 'shadow_dancer',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: medium — standard size, difficulty from movement not body size. */
  size: 'medium',
  /** movementPattern: strafe — rhythmic left-right movement, predictable timing. */
  movementPattern: 'strafe',
  /** hitZone: 0.7 — 70% of the body is hittable when in the right position. Unit: 0–1. */
  hitZone: 0.7,
  /** critZone: 0.3 — 30% of hit zone crits. Small window that requires leading. Unit: 0–1. */
  critZone: 0.3,
  /** behavior: lr_oscillate — rhythmic left-right sweep; power user leads the shot for crits. */
  behavior: { pattern: 'lr_oscillate', speed: ENEMY_MOVE_SPEED_BASE, amplitude: ENEMY_LR_AMPLITUDE_DEFAULT },
  /** shape: lean humanoid — slim silhouette, slightly forward-tilted. */
  shape: { type: 'humanoid', scale: 0.9, headScale: 0.8, widthRatio: 0.75 },
  /**
   * hitZoneLayout: shadow dancer — lean body, slightly off-centre crit due to dance pose.
   * Crit (head): offset slightly left (dancer leans), tighter radius.
   * Mid (torso): slim torso, narrower radius = TORSO_WIDTH_PX * 0.42.
   * Low (limbs): compact limb ring — dancer keeps limbs tucked.
   */
  hitZoneLayout: {
    critDx: -ENEMY_TORSO_WIDTH_PX * 0.08,
    critDy: -(ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_HEAD_RADIUS_PX * 0.8),
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.8,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.42,
    lowDx: ENEMY_TORSO_WIDTH_PX * 0.05,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.1,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 0.85,
  },
}

/**
 * Plague Rat — extremely small and fast-moving. Hardest enemy to land any hit on.
 * Design specialty: damage ceiling is low (low HP) but accuracy is the true obstacle.
 */
export const ENEMY_PLAGUE_RAT: EnemyDef = {
  name: 'Plague Rat',
  /** HP: 25. Very low HP — if you hit it, it dies quickly. Unit: HP. */
  maxHp: 25,
  /** critZoneScale: 0.5 — tiny crit zone on an already tiny body. Unit: multiplier. */
  critZoneScale: 0.5,
  /** spriteKey: Phaser texture key for the plague rat sprite. */
  spriteKey: 'plague_rat',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: tiny — smallest body class; barely a target. */
  size: 'tiny',
  /** movementPattern: zigzag — erratic movement makes tracking very difficult. */
  movementPattern: 'zigzag',
  /** hitZone: 0.25 — only 25% of the small body is hittable. Unit: 0–1. */
  hitZone: 0.25,
  /** critZone: 0.15 — 15% of hit zone crits. Extremely tight precision requirement. Unit: 0–1. */
  critZone: 0.15,
  /** behavior: zigzag — sharp direction changes make tracking very difficult. */
  behavior: { pattern: 'zigzag', speed: ENEMY_MOVE_SPEED_FAST },
  /** shape: beast — low to the ground, small rodent silhouette. */
  shape: { type: 'beast', scale: 0.3, headScale: 0.5, widthRatio: 1.8 },
  /**
   * hitZoneLayout: plague rat — all zones very tight, offset forward (running posture).
   * Crit (head): tiny leading end, radius = ENEMY_HEAD_RADIUS_PX * 0.25.
   * Mid (body): low flat body, radius = ENEMY_TORSO_WIDTH_PX * 0.2.
   * Low (tail/limbs): slightly wider, radius = ENEMY_TORSO_WIDTH_PX * 0.35.
   */
  hitZoneLayout: {
    critDx: ENEMY_TORSO_WIDTH_PX * 0.15,
    critDy: -ENEMY_TORSO_HEIGHT_PX * 0.15,
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.25,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.2,
    lowDx: -ENEMY_TORSO_WIDTH_PX * 0.1,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.05,
    lowRadius: ENEMY_TORSO_WIDTH_PX * 0.35,
  },
}

/**
 * Swarm — represents three small enemies with low individual HP.
 * Design specialty: multi-target — player must distribute damage across all three.
 * HP represents total HP across all three bodies.
 */
export const ENEMY_SWARM: EnemyDef = {
  name: 'Swarm',
  /** HP: 60 (20 × 3). Total HP across 3 small bodies. Unit: HP. */
  maxHp: 60,
  /** critZoneScale: 1.0 — normal crit zone per unit; multi-target is the challenge. Unit: multiplier. */
  critZoneScale: 1.0,
  /** spriteKey: Phaser texture key for the swarm sprite. */
  spriteKey: 'swarm',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: small — each unit is small; combined they cover more area. */
  size: 'small',
  /** movementPattern: strafe — units drift apart at different speeds. */
  movementPattern: 'strafe',
  /** hitZone: 0.6 — moderate hit zone per unit. Unit: 0–1. */
  hitZone: 0.6,
  /** critZone: 0.4 — 40% of each unit's hit zone crits. Unit: 0–1. */
  critZone: 0.4,
  /** behavior: lr_oscillate — units drift apart in predictable left-right waves. */
  behavior: { pattern: 'lr_oscillate', speed: ENEMY_MOVE_SPEED_BASE, amplitude: ENEMY_LR_AMPLITUDE_DEFAULT },
  /** shape: blob — clustered swarm represented as a wide, diffuse mass. */
  shape: { type: 'blob', scale: 0.8, headScale: 1.0, widthRatio: 2.0 },
  /**
   * hitZoneLayout: swarm — spread-out oval hit zone representing multiple small bodies.
   * Crit (leading unit): offset right (first in formation), small radius.
   * Mid (main cluster): wide horizontal spread, radius = TORSO_WIDTH_PX * 0.55.
   * Low (stragglers): very wide outer ring, radius = TORSO_HEIGHT_PX * 0.7.
   */
  hitZoneLayout: {
    critDx: ENEMY_TORSO_WIDTH_PX * 0.2,
    critDy: -ENEMY_TORSO_HEIGHT_PX * 0.05,
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.6,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.55,
    lowDx: -ENEMY_TORSO_WIDTH_PX * 0.15,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.1,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 0.7,
  },
}

/**
 * Stone Drake — large and approaches the player slowly. Creates urgency.
 * Design specialty: power user kills it before it closes range; casual player must react faster.
 */
export const ENEMY_STONE_DRAKE: EnemyDef = {
  name: 'Stone Drake',
  /** HP: 160. High HP — requires focused DPS to kill before it gets close. Unit: HP. */
  maxHp: 160,
  /** critZoneScale: 0.9 — slightly smaller than max for a large enemy. Unit: multiplier. */
  critZoneScale: 0.9,
  /** spriteKey: Phaser texture key for the stone drake sprite. */
  spriteKey: 'stone_drake',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: large — big enough to hit easily but HP + approach creates pressure. */
  size: 'large',
  /** movementPattern: approach — moves toward player; creates urgency to kill fast. */
  movementPattern: 'approach',
  /** hitZone: 0.85 — large body = large hit zone. Unit: 0–1. */
  hitZone: 0.85,
  /** critZone: 0.45 — wide crit zone on a big body. Unit: 0–1. */
  critZone: 0.45,
  /** behavior: approach — moves toward player; kill it fast or face the consequence. */
  behavior: { pattern: 'approach', speed: ENEMY_APPROACH_SPEED },
  /** shape: drake — reptilian, long neck reaching forward, wide low body. */
  shape: { type: 'drake', scale: 1.3, headScale: 0.9, widthRatio: 1.6 },
  /**
   * hitZoneLayout: stone drake — head thrust forward, wide reptilian body.
   * Crit (head): offset forward (up+forward), standard radius.
   * Mid (body): wide flat torso, radius = TORSO_WIDTH_PX * 0.65.
   * Low (legs/tail): large outer ring — dragon has long legs and a tail.
   */
  hitZoneLayout: {
    critDx: ENEMY_TORSO_WIDTH_PX * 0.1,
    critDy: -(ENEMY_TORSO_HEIGHT_PX * 0.4 + ENEMY_HEAD_RADIUS_PX * 0.9),
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.9,
    midDx: -ENEMY_TORSO_WIDTH_PX * 0.05,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.65,
    lowDx: -ENEMY_TORSO_WIDTH_PX * 0.1,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.25,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 1.1,
  },
}

/**
 * Thornback — zigzag movement pattern. Hits randomness makes casual hit rate drop.
 * Design specialty: casual player has lower effective hit rate than on static enemies.
 */
export const ENEMY_THORNBACK: EnemyDef = {
  name: 'Thornback',
  /** HP: 70. Medium HP — not too tanky, movement is the real challenge. Unit: HP. */
  maxHp: 70,
  /** critZoneScale: 0.75 — smaller crit zone to match the erratic movement. Unit: multiplier. */
  critZoneScale: 0.75,
  /** spriteKey: Phaser texture key for the thornback sprite. */
  spriteKey: 'thornback',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: medium — standard size; movement pattern is the difficulty source. */
  size: 'medium',
  /** movementPattern: zigzag — sharp direction changes frustrate naive tracking. */
  movementPattern: 'zigzag',
  /** hitZone: 0.65 — moderate hit zone; harder to track due to zigzag. Unit: 0–1. */
  hitZone: 0.65,
  /** critZone: 0.3 — 30% crit zone — must catch it mid-turn. Unit: 0–1. */
  critZone: 0.3,
  /** behavior: zigzag — sharp direction changes frustrate naive tracking. */
  behavior: { pattern: 'zigzag', speed: ENEMY_MOVE_SPEED_FAST },
  /** shape: beast — armoured spine along back, compact body. */
  shape: { type: 'beast', scale: 0.95, headScale: 0.75, widthRatio: 1.3 },
  /**
   * hitZoneLayout: thornback — compact armoured body, head offset back due to spines.
   * Crit (head): offset slightly back (thornback runs with head down), smaller.
   * Mid (armoured torso): compact, radius = TORSO_WIDTH_PX * 0.45.
   * Low (spines/limbs): wide outer ring — spines extend radially.
   */
  hitZoneLayout: {
    critDx: -ENEMY_TORSO_WIDTH_PX * 0.1,
    critDy: -(ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_HEAD_RADIUS_PX * 0.75),
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.75,
    midDx: 0,
    midDy: -ENEMY_TORSO_HEIGHT_PX * 0.05,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.45,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.1,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 0.88,
  },
}

/**
 * Ancient Treant — enormous size but extreme HP pool. Demands sustained DPS.
 * Design specialty: not skill-based — requires many hits over a long encounter.
 */
export const ENEMY_ANCIENT_TREANT: EnemyDef = {
  name: 'Ancient Treant',
  /** HP: 400. Maximum HP tier — sustained DPS encounter. Unit: HP. */
  maxHp: 400,
  /** critZoneScale: 1.1 — large crit zone matches the enormous body. Unit: multiplier. */
  critZoneScale: 1.1,
  /** spriteKey: Phaser texture key for the ancient treant sprite. */
  spriteKey: 'ancient_treant',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: enormous — fills much of the screen; hardest to miss. */
  size: 'enormous',
  /** movementPattern: static — stands still, endurance not reflex. */
  movementPattern: 'static',
  /** hitZone: 0.9 — 90% hittable body. Accuracy is trivial; volume is not. Unit: 0–1. */
  hitZone: 0.9,
  /** critZone: 0.5 — large crit zone — rewards consistent crits over long fight. Unit: 0–1. */
  critZone: 0.5,
  /** behavior: static — stands still; endurance not reflex. */
  behavior: { pattern: 'static', speed: 0 },
  /** shape: treant — wide branching form, massive trunk as body. */
  shape: { type: 'treant', scale: 2.0, headScale: 1.1, widthRatio: 1.8 },
  /**
   * hitZoneLayout: ancient treant — massive tree, wide in all directions.
   * Crit (weak core at top): large glowing heart node, radius = ENEMY_HEAD_RADIUS_PX * 1.1.
   * Mid (trunk): very wide, radius = TORSO_WIDTH_PX * 0.85.
   * Low (roots/branches): enormous outer ring filling screen.
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: -(ENEMY_TORSO_HEIGHT_PX * 0.35 + ENEMY_HEAD_RADIUS_PX * 1.1),
    critRadius: ENEMY_HEAD_RADIUS_PX * 1.1,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.85,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.35,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 1.5,
  },
}

/**
 * Frost Elemental — slightly above medium size, takes extra damage from slow skills.
 * Design specialty: slow_shot deals a bonus multiplier on this enemy type.
 * slowSkillMultiplier captures the design intent; game logic applies it at hit resolution.
 */
export const ENEMY_FROST_ELEMENTAL: EnemyDef = {
  name: 'Frost Elemental',
  /** HP: 100. Medium-high HP balanced by slow_shot weakness. Unit: HP. */
  maxHp: 100,
  /** critZoneScale: 0.85 — slightly reduced crit zone. Unit: multiplier. */
  critZoneScale: 0.85,
  /** spriteKey: Phaser texture key for the frost elemental sprite. */
  spriteKey: 'frost_elemental',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: large — slightly above medium; tall crystalline form. */
  size: 'large',
  /** movementPattern: static — vulnerability to slow shots is the key mechanic. */
  movementPattern: 'static',
  /** hitZone: 0.8 — tall form has a good hit zone. Unit: 0–1. */
  hitZone: 0.8,
  /** critZone: 0.35 — moderate crit zone; head is well-defined. Unit: 0–1. */
  critZone: 0.35,
  /** behavior: static — vulnerability to slow shots is the key mechanic. */
  behavior: { pattern: 'static', speed: 0 },
  /** shape: elemental — tall narrow crystalline pillar with a glowing ice crown. */
  shape: { type: 'elemental', scale: 1.2, headScale: 0.85, widthRatio: 0.65 },
  /**
   * hitZoneLayout: frost elemental — tall narrow body with ice crown crit zone.
   * Crit (ice crown): offset high, radius = ENEMY_HEAD_RADIUS_PX * 0.85.
   * Mid (crystal body): narrow pillar, radius = TORSO_WIDTH_PX * 0.38.
   * Low (ice shards): slightly wider base, radius = TORSO_HEIGHT_PX * 0.9.
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: -(ENEMY_TORSO_HEIGHT_PX * 0.55 + ENEMY_HEAD_RADIUS_PX * 0.85),
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.85,
    midDx: 0,
    midDy: -ENEMY_TORSO_HEIGHT_PX * 0.1,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.38,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.15,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 0.9,
  },
}

/**
 * Frost Elemental slow-skill damage multiplier.
 * Slow skills deal this much extra damage to Frost Elemental (weakness mechanic).
 * Unit: dimensionless multiplier. Affects: SLOW_SKILL_DAMAGE when targeting this enemy.
 */
export const ENEMY_FROST_ELEMENTAL_SLOW_MULTIPLIER = 1.5

/**
 * Lava Slug — slow left-right movement, high HP. Tests patience and sustained DPS.
 * Design specialty: long fight, time-vs-damage ratio is the key metric.
 */
export const ENEMY_LAVA_SLUG: EnemyDef = {
  name: 'Lava Slug',
  /** HP: 200. Very high HP — long encounter. Unit: HP. */
  maxHp: 200,
  /** critZoneScale: 1.0 — standard crit zone; time investment is the challenge. Unit: multiplier. */
  critZoneScale: 1.0,
  /** spriteKey: Phaser texture key for the lava slug sprite. */
  spriteKey: 'lava_slug',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: large — wide body, easy to hit but slow to kill. */
  size: 'large',
  /** movementPattern: strafe — slow side-to-side movement at predictable speed. */
  movementPattern: 'strafe',
  /** hitZone: 0.85 — wide slug body is easy to hit. Unit: 0–1. */
  hitZone: 0.85,
  /** critZone: 0.4 — moderate crit zone on the wide body. Unit: 0–1. */
  critZone: 0.4,
  /** behavior: lr_oscillate — slow, wide side-to-side movement at predictable speed. */
  behavior: { pattern: 'lr_oscillate', speed: ENEMY_MOVE_SPEED_SLOW, amplitude: ENEMY_LR_AMPLITUDE_DEFAULT },
  /** shape: blob — wide flat slug body, low to the ground. */
  shape: { type: 'blob', scale: 1.4, headScale: 1.0, widthRatio: 2.5 },
  /**
   * hitZoneLayout: lava slug — very wide, flat body with a raised lava core.
   * Crit (lava core): raised centre bubble, offset up, radius = ENEMY_HEAD_RADIUS_PX * 1.0.
   * Mid (slug body): wide flat oval, radius = TORSO_WIDTH_PX * 0.8.
   * Low (ooze trail): very wide base ring, radius = TORSO_HEIGHT_PX * 1.1.
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: -(ENEMY_TORSO_HEIGHT_PX * 0.2),
    critRadius: ENEMY_HEAD_RADIUS_PX * 1.0,
    midDx: 0,
    midDy: ENEMY_TORSO_HEIGHT_PX * 0.1,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.8,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.2,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 1.1,
  },
}

/**
 * Thunder Hawk — medium size, fast diagonal movement. Hit window is very short.
 * Design specialty: the diagonal path means the enemy spends less time in the aim lane.
 */
export const ENEMY_THUNDER_HAWK: EnemyDef = {
  name: 'Thunder Hawk',
  /** HP: 75. Medium HP — would be easy if it weren't so fast. Unit: HP. */
  maxHp: 75,
  /** critZoneScale: 0.7 — smaller crit zone on a fast-moving target. Unit: multiplier. */
  critZoneScale: 0.7,
  /** spriteKey: Phaser texture key for the thunder hawk sprite. */
  spriteKey: 'thunder_hawk',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: medium — not the easiest to spot during fast diagonal passes. */
  size: 'medium',
  /** movementPattern: diagonal — swoops across the screen at speed. */
  movementPattern: 'diagonal',
  /** hitZone: 0.6 — moderate hit zone; reduced effective zone at full speed. Unit: 0–1. */
  hitZone: 0.6,
  /** critZone: 0.25 — tight crit window during the fast sweep. Unit: 0–1. */
  critZone: 0.25,
  /** behavior: diagonal — swoops across the screen at high speed. */
  behavior: { pattern: 'diagonal', speed: ENEMY_MOVE_SPEED_FAST },
  /** shape: beast — bird of prey, streamlined compact body diving forward. */
  shape: { type: 'beast', scale: 0.85, headScale: 0.7, widthRatio: 0.9 },
  /**
   * hitZoneLayout: thunder hawk — compact diving bird, head tucked into dive.
   * Crit (beak/head): forward-offset in dive direction, small radius.
   * Mid (body): compact oval, radius = TORSO_WIDTH_PX * 0.38.
   * Low (wings): wide spread, radius = TORSO_HEIGHT_PX * 0.75.
   */
  hitZoneLayout: {
    critDx: ENEMY_TORSO_WIDTH_PX * 0.12,
    critDy: -(ENEMY_TORSO_HEIGHT_PX * 0.3 + ENEMY_HEAD_RADIUS_PX * 0.7),
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.7,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.38,
    lowDx: 0,
    lowDy: 0,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 0.75,
  },
}

/**
 * Mirror Knight — medium size, but one zone reflects damage (deals less damage to that zone).
 * Design specialty: power user switches zones to avoid the reflected zone;
 * the reflected zone still does hitZone damage but at a reduced multiplier.
 * reflectZoneDamageMultiplier defines how weak the reflected zone is.
 */
export const ENEMY_MIRROR_KNIGHT: EnemyDef = {
  name: 'Mirror Knight',
  /** HP: 110. Medium-high HP; full damage only on non-reflected zones. Unit: HP. */
  maxHp: 110,
  /** critZoneScale: 0.85 — moderate crit zone; hits on non-reflected zones pay off. Unit: multiplier. */
  critZoneScale: 0.85,
  /** spriteKey: Phaser texture key for the mirror knight sprite. */
  spriteKey: 'mirror_knight',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: medium — standard frame; complexity from zone mechanics not size. */
  size: 'medium',
  /** movementPattern: static — stands still while reflecting; zone selection is the skill. */
  movementPattern: 'static',
  /** hitZone: 0.7 — normal hit zone on the non-reflected side. Unit: 0–1. */
  hitZone: 0.7,
  /** critZone: 0.35 — 35% crit zone on the right (non-reflected) side. Unit: 0–1. */
  critZone: 0.35,
  /** behavior: static — stands still while reflecting; zone selection is the skill. */
  behavior: { pattern: 'static', speed: 0 },
  /** shape: humanoid — armoured knight with a large shield on the left side. */
  shape: { type: 'humanoid', scale: 1.05, headScale: 0.85, widthRatio: 1.1 },
  /**
   * hitZoneLayout: mirror knight — shield-bearer, crit zone offset to the right (unshielded side).
   * Crit (exposed head): offset right (shield doesn't cover head on right), smaller target.
   * Mid (armoured torso): centred, moderate radius = TORSO_WIDTH_PX * 0.5.
   * Low (arms/legs): standard outer ring = TORSO_HEIGHT_PX * 0.92.
   */
  hitZoneLayout: {
    critDx: ENEMY_TORSO_WIDTH_PX * 0.15,
    critDy: -(ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_HEAD_RADIUS_PX * 0.85),
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.85,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.5,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.15,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 0.92,
  },
}

/**
 * Mirror Knight reflected zone damage multiplier.
 * Hits on the reflected (shield) zone deal this fraction of normal damage.
 * Unit: dimensionless multiplier. Affects: damage when hitting the reflected zone.
 */
export const ENEMY_MIRROR_KNIGHT_REFLECT_MULTIPLIER = 0.25

/**
 * Void Wraith — large but semi-transparent (small effective crit window).
 * Design specialty: the large body is visible, but the crit zone is elusive —
 * timing the crit requires precise release during the narrow window.
 */
export const ENEMY_VOID_WRAITH: EnemyDef = {
  name: 'Void Wraith',
  /** HP: 130. Substantial HP requiring committed crit timing. Unit: HP. */
  maxHp: 130,
  /** critZoneScale: 0.45 — very small crit window despite the large visible form. Unit: multiplier. */
  critZoneScale: 0.45,
  /** spriteKey: Phaser texture key for the void wraith sprite. */
  spriteKey: 'void_wraith',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: huge — fills the screen but barely has a crit zone. */
  size: 'huge',
  /** movementPattern: strafe — slow drift that shifts the tiny crit window. */
  movementPattern: 'strafe',
  /** hitZone: 0.8 — large semi-transparent body is mostly hittable. Unit: 0–1. */
  hitZone: 0.8,
  /** critZone: 0.12 — only 12% of hit zone crits — the "core" through the transparency. Unit: 0–1. */
  critZone: 0.12,
  /** behavior: lr_oscillate — slow wide drift that shifts the tiny crit window. */
  behavior: { pattern: 'lr_oscillate', speed: ENEMY_MOVE_SPEED_SLOW, amplitude: ENEMY_LR_AMPLITUDE_WIDE },
  /** shape: wraith — elongated translucent form with a tiny solid core. */
  shape: { type: 'wraith', scale: 1.6, headScale: 0.45, widthRatio: 0.7 },
  /**
   * hitZoneLayout: void wraith — huge outer form, tiny solid core as crit.
   * Crit (void core): very small, offset slightly up, radius = ENEMY_HEAD_RADIUS_PX * 0.45.
   * Mid (ectoplasm body): large misty form, radius = TORSO_WIDTH_PX * 0.72.
   * Low (outer wisps): very large outer ring — the "body" is mostly wisps.
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: -(ENEMY_TORSO_HEIGHT_PX * 0.15),
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.45,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.72,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.1,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 1.3,
  },
}

/**
 * Titan Lord — boss-type enemy. Combines high HP, movement, and enormous hit zone.
 * Design specialty: full encounter — power user wins via sustained crit DPS;
 * casual player must land at least a few hits to have any chance.
 */
export const ENEMY_TITAN_LORD: EnemyDef = {
  name: 'Titan Lord',
  /** HP: 500. Highest HP in the roster — boss-level endurance. Unit: HP. */
  maxHp: 500,
  /** critZoneScale: 0.9 — slightly reduced crit zone for the boss. Unit: multiplier. */
  critZoneScale: 0.9,
  /** spriteKey: Phaser texture key for the titan lord sprite. */
  spriteKey: 'titan_lord',
  /** hitZoneMap: default three-zone layout (head/torso/legs). */
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  /** size: enormous — takes up most of the screen; easy to hit, hard to destroy. */
  size: 'enormous',
  /** movementPattern: strafe — slow boss movement keeps pressure constant. */
  movementPattern: 'strafe',
  /** hitZone: 0.9 — 90% hittable; boss challenge comes from HP, not precision. Unit: 0–1. */
  hitZone: 0.9,
  /** critZone: 0.4 — 40% crit zone on the enormous body. Unit: 0–1. */
  critZone: 0.4,
  /** behavior: lr_oscillate — slow boss sweep; constant pressure on player timing. */
  behavior: { pattern: 'lr_oscillate', speed: ENEMY_MOVE_SPEED_SLOW, amplitude: ENEMY_LR_AMPLITUDE_WIDE },
  /** shape: humanoid — enormous armoured titan, filling the screen. */
  shape: { type: 'humanoid', scale: 2.2, headScale: 0.9, widthRatio: 1.4 },
  /**
   * hitZoneLayout: titan lord — enormous boss with a slightly reduced crit zone.
   * Crit (helmeted head): large but proportionally smaller than huge body, offset up.
   * Mid (massive torso): very wide, radius = TORSO_WIDTH_PX * 0.9.
   * Low (limbs): enormous outer ring filling most of screen.
   */
  hitZoneLayout: {
    critDx: 0,
    critDy: -(ENEMY_TORSO_HEIGHT_PX / 2 + ENEMY_HEAD_RADIUS_PX * 0.9),
    critRadius: ENEMY_HEAD_RADIUS_PX * 0.9,
    midDx: 0,
    midDy: 0,
    midRadius: ENEMY_TORSO_WIDTH_PX * 0.9,
    lowDx: 0,
    lowDy: ENEMY_TORSO_HEIGHT_PX * 0.3,
    lowRadius: ENEMY_TORSO_HEIGHT_PX * 1.45,
  },
}

// ============================================================
// Level definitions — 18-level campaign
// Ordered easiest → hardest. Static enemies first (teach mechanics),
// then moving enemies (strafe → approach → zigzag/diagonal → boss).
// ============================================================

/**
 * Ordered array of level definitions for the full campaign.
 * Index 0 = Level 1 … index 17 = Level 18.
 */
export const LEVELS: readonly LevelDef[] = [
  { level: 1,  enemyDef: ENEMY_GOBLIN_SCOUT },
  { level: 2,  enemyDef: ENEMY_ORC_WARRIOR },
  { level: 3,  enemyDef: ENEMY_STONE_GIANT },
  { level: 4,  enemyDef: ENEMY_CRYSTAL_SPIDER },
  { level: 5,  enemyDef: ENEMY_EMBER_WISP },
  { level: 6,  enemyDef: ENEMY_FROST_ELEMENTAL },
  { level: 7,  enemyDef: ENEMY_IRON_GOLEM },
  { level: 8,  enemyDef: ENEMY_MIRROR_KNIGHT },
  { level: 9,  enemyDef: ENEMY_ANCIENT_TREANT },
  { level: 10, enemyDef: ENEMY_SWARM },
  { level: 11, enemyDef: ENEMY_SHADOW_DANCER },
  { level: 12, enemyDef: ENEMY_LAVA_SLUG },
  { level: 13, enemyDef: ENEMY_STONE_DRAKE },
  { level: 14, enemyDef: ENEMY_THORNBACK },
  { level: 15, enemyDef: ENEMY_THUNDER_HAWK },
  { level: 16, enemyDef: ENEMY_VOID_WRAITH },
  { level: 17, enemyDef: ENEMY_PLAGUE_RAT },
  { level: 18, enemyDef: ENEMY_TITAN_LORD },
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
