// ============================================================
// Core game types & domain model
// No Phaser imports — pure TypeScript, fully serializable.
// ============================================================

/**
 * Result of a projectile hitting an enemy zone.
 * CRIT = head hit, HIT = torso hit, GRAZE = limb hit, MISS = no contact.
 */
export type HitResult = 'CRIT' | 'HIT' | 'GRAZE' | 'MISS'

/**
 * Skill type determining projectile behaviour.
 * Extensible union — add new skills here.
 */
export type SkillType = 'fireball' | 'slow_shot' | 'fast_shot' | 'white_shot'

/** Named body-part zone on an enemy, or 'none' for a complete miss. */
export type HitZoneName = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg' | 'none'

/** High-level game phase controlling which systems are active. */
export type Phase = 'loading' | 'battle' | 'game_over' | 'level_complete' | 'victory' | 'fight_overview'

/**
 * Touch point layout descriptor — used in constants and dynamic layout generation.
 */
export interface TouchPointDef {
  /** Which side of the screen the point lives on. */
  side: 'left' | 'right'
  /** Arc angle in degrees along the bottom-corner arc (22=top, 78=bottom). */
  angle: number
  /** CSS colour string. */
  color: string
  /** Full rotation period. Unit: ms. Affects: how quickly the laser sweeps. */
  rotationPeriodMs: number
}


/**
 * Enemy size category — controls visual scale and base hit zone area.
 * tiny < small < medium < large < huge < enormous
 */
export type EnemySize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'enormous'

/**
 * Enemy movement pattern — describes how the enemy moves during combat.
 * - static:   does not move
 * - strafe:   moves left and right at a steady pace
 * - zigzag:   alternates direction rapidly (erratic horizontal movement)
 * - diagonal: moves diagonally across the screen
 * - approach: moves steadily toward the player (urgency mechanic)
 */
export type EnemyMovementPattern = 'static' | 'strafe' | 'zigzag' | 'diagonal' | 'approach'

/**
 * BehaviorSystem movement pattern — typed union consumed by BehaviorSystem.
 * Maps to EnemyMovementPattern but uses domain-precise naming:
 * - static:       does not move; position is fixed each tick
 * - lr_oscillate: smooth left-right oscillation (cosine wave); rhythmic, predictable
 * - zigzag:       sharp direction reversals at speed; erratic horizontal movement
 * - diagonal:     linear diagonal movement, bouncing off horizontal bounds
 * - approach:     steady vertical movement toward the player
 *
 * Extensible union — add new patterns here without modifying BehaviorSystem internals.
 */
export type MovementPattern = 'static' | 'lr_oscillate' | 'zigzag' | 'diagonal' | 'approach'

/**
 * Machine-readable behavior descriptor embedded in EnemyDef.
 * Consumed by BehaviorSystem to compute enemy position each tick.
 *
 * Designed for future extensibility:
 * - speed controls movement magnitude (can scale with game difficulty)
 * - Additional fields (e.g. shootingPattern, reactionToPlayer) can be added here
 *   without breaking existing enemy defs — all fields beyond pattern are optional.
 */
export interface EnemyBehaviorDef {
  /**
   * Movement pattern this enemy uses during combat.
   * Controls how BehaviorSystem updates the enemy's x/y position each tick.
   */
  pattern: MovementPattern
  /**
   * Base movement speed for this enemy.
   * Unit: px/s. Affects: how fast the enemy traverses its movement pattern.
   * Ignored when pattern === 'static'.
   */
  speed: number
  /**
   * Oscillation amplitude for lr_oscillate pattern.
   * Half-width of the left-right sweep around the enemy's origin X.
   * Unit: px. Ignored for other patterns.
   */
  amplitude?: number
}

/**
 * Shape descriptor for procedural enemy rendering.
 * Describes the visual form of an enemy body — type and scale parameters.
 *
 * type:
 *   - 'humanoid'  : bipedal body with head, torso, arms, legs
 *   - 'beast'     : quadruped-like silhouette (wide, low torso, no arms)
 *   - 'wisp'      : single glowing orb with no limbs
 *   - 'spider'    : low, wide body with multiple legs
 *   - 'blob'      : amorphous rounded mass
 *   - 'elemental' : tall, narrow crystalline form
 *   - 'drake'     : large reptilian body with a tail
 *   - 'treant'    : wide, branching form
 *   - 'wraith'    : wispy elongated translucent form
 *
 * scale: overall body size multiplier relative to the base humanoid dimensions.
 * headScale: additional multiplier for the head/crit zone size (stacks with critZoneScale).
 * widthRatio: torso width relative to height (1.0 = square torso).
 */
export interface ShapeDescriptor {
  /** Visual body type — drives procedural rendering in BattleScene. */
  type: 'humanoid' | 'beast' | 'wisp' | 'spider' | 'blob' | 'elemental' | 'drake' | 'treant' | 'wraith'
  /** Overall body scale multiplier. Unit: dimensionless. Default: 1.0 */
  scale: number
  /** Extra scale applied to the head/crit zone circle. Unit: dimensionless. Default: 1.0 */
  headScale: number
  /** Torso width-to-height ratio. Unit: dimensionless. Default: 1.0 */
  widthRatio: number
}

/**
 * Hit zone layout for an enemy.
 * Defines the CRIT / HIT / GRAZE detection geometry as circles relative to the enemy centre.
 *
 * All offsets (dx, dy) are relative to the enemy's torso centre (x, y).
 * All radii are in canvas pixels.
 *
 * The three zones map to hit results:
 *   crit  → CRIT   (head / weak point)
 *   mid   → HIT    (torso / body)
 *   low   → GRAZE  (limbs / extremities — represented as a ring around the mid zone)
 *
 * For the 'low' (GRAZE) zone: a point is in GRAZE if it is within lowRadius of (cx + lowDx, cy + lowDy)
 * but NOT within midRadius of (cx + midDx, cy + midDy). This makes GRAZE an annular region.
 * Priority: crit > mid > low > miss.
 */
export interface HitZoneLayout {
  /** CRIT zone circle centre offset X from enemy torso centre. Unit: px. */
  critDx: number
  /** CRIT zone circle centre offset Y from enemy torso centre. Unit: px. */
  critDy: number
  /** CRIT zone circle radius. Unit: px. */
  critRadius: number
  /** HIT zone circle centre offset X from enemy torso centre. Unit: px. */
  midDx: number
  /** HIT zone circle centre offset Y from enemy torso centre. Unit: px. */
  midDy: number
  /** HIT zone circle radius. Unit: px. */
  midRadius: number
  /** GRAZE zone circle centre offset X from enemy torso centre. Unit: px. */
  lowDx: number
  /** GRAZE zone circle centre offset Y from enemy torso centre. Unit: px. */
  lowDy: number
  /** GRAZE zone outer radius. Unit: px. */
  lowRadius: number
}

/**
 * A single named hit zone entry in the EnemyDef.hitZoneMap.
 * Coordinates are relative (0–1 space) to the enemy's bounding box.
 * - x, y: top-left corner of the zone rect (0 = left/top, 1 = right/bottom)
 * - w, h: width and height of the zone rect (0–1)
 * - active: whether the zone is currently active (always true for static zones;
 *   reserved for future dynamic zones such as shields or moving blocks)
 */
export interface HitZoneEntry {
  /** Zone name used for hit detection and scoring. */
  zone: HitZoneName
  /** Bounding rect in relative (0–1) space of the enemy's bounding box. */
  rect: { x: number; y: number; w: number; h: number }
  /**
   * Whether this zone is currently active (can be hit).
   * Always true for static zones; future dynamic zones may set this to false.
   */
  active: boolean
}

/**
 * A single named hit zone with absolute screen-pixel coordinates.
 * Produced by scaleHitZoneMap() from a relative HitZoneEntry.
 */
export interface HitZoneEntryPx {
  /** Zone name. */
  zone: HitZoneName
  /** Bounding rect in absolute canvas pixels. */
  rect: { x: number; y: number; w: number; h: number }
  /** Whether this zone is currently active. */
  active: boolean
}

/**
 * Data descriptor for an enemy encounter.
 * Defines the enemy's health pool, crit zone size, and design metadata.
 */
export interface EnemyDef {
  /** Display name shown in the HUD. */
  name: string
  /** Maximum hit points for this enemy. Unit: HP. */
  maxHp: number
  /**
   * Multiplier applied to the default head radius for crit zone size.
   * 1.0 = default ENEMY_HEAD_RADIUS_CM. Lower = smaller, harder-to-hit crit zone.
   * Unit: dimensionless multiplier.
   */
  critZoneScale: number
  /**
   * Character manifest ID (kebab-case) referencing a manifest.json in
   * src/assets/characters/{manifestId}/. Used by CharacterRegistry to look up
   * spriteKey, displayWidth, animation defs and mask config.
   * Optional — enemies without manifests use procedural rendering.
   */
  manifestId?: string
  /**
   * Phaser texture key for the enemy sprite.
   * If the texture is not loaded, BattleScene falls back to a placeholder rendering.
   * Defaults to 'enemy_placeholder' if not specified.
   */
  spriteKey?: string
  /**
   * Static hit zone map: relative bounding rects (0–1 space) for each named zone.
   * Ordered head → torso → legs (crit → mid → low).
   * active is always true for static zones; reserved for future dynamic zones.
   * If not specified, a default three-zone map is used.
   */
  hitZoneMap?: readonly HitZoneEntry[]
  /**
   * Visual and physical size category of the enemy.
   * Affects hit zone area and visual rendering scale.
   * Optional — defaults to 'medium' when not specified.
   */
  size?: EnemySize
  /**
   * Movement pattern during combat.
   * Optional — defaults to 'static' when not specified.
   */
  movementPattern?: EnemyMovementPattern
  /**
   * Hit zone size as a fraction of the enemy's total body area.
   * Range: 0–1. Higher = easier to hit.
   * Optional — defaults to 1.0 when not specified.
   */
  hitZone?: number
  /**
   * Crit zone size as a fraction of the enemy's hit zone area.
   * Range: 0–1. Higher = easier to crit.
   * Optional — defaults to critZoneScale when not specified.
   */
  critZone?: number
  /**
   * Machine-readable behavior descriptor consumed by BehaviorSystem.
   * Defines how the enemy moves each game tick.
   * Optional — defaults to static (no movement) when not specified.
   */
  behavior?: EnemyBehaviorDef
  /**
   * Visual shape descriptor for procedural rendering.
   * Drives BattleScene's _drawEnemy to render the correct body form.
   * Optional — defaults to a standard medium humanoid when not specified.
   */
  shape?: ShapeDescriptor
  /**
   * Hit detection geometry — three-zone layout (crit/mid/low) relative to enemy centre.
   * Used by Enemy.getHitZone() and Enemy.getHitResult() instead of global body constants.
   * Optional — defaults to DEFAULT_HIT_ZONE_LAYOUT when not specified.
   */
  hitZoneLayout?: HitZoneLayout
  /**
   * Attack patterns this enemy uses to damage the player.
   * Each entry has an independent cooldown; weighted random picks among ready ones.
   * Optional — enemies without `attacks` never fire missiles (backwards-compatible).
   */
  attacks?: readonly EnemyAttackDef[]
  /**
   * Per-animation PNG mask configuration for pixel-perfect hit detection.
   * When present, MaskHitDetector is used instead of the legacy hitZoneLayout.
   * Optional — enemies without maskConfig use the standard three-circle model.
   */
  maskConfig?: MaskConfig
  /**
   * Display width in pixels when rendering the sprite. Used for world-to-mask
   * coordinate conversion. Defaults to 128 if omitted.
   */
  displayWidth?: number
}

/**
 * Configuration for per-animation PNG hit masks.
 * Each animation key (idle, throw) maps to a frame count and file prefix
 * used to locate mask PNGs in the asset directory.
 */
export interface MaskConfig {
  /** Idle animation mask config — looping idle cycle. */
  idle: { frameCount: number; prefix: string }
  /** Attack animation mask config — one-shot attack animation. */
  attack: { frameCount: number; prefix: string }
}

/**
 * Data descriptor for a single level encounter.
 */
export interface LevelDef {
  /** Level number (1-based). */
  level: number
  /** Enemy encountered in this level. */
  enemyDef: EnemyDef
}

/**
 * Unique identifier for one of the 6 touch points.
 * Left side: green, violet, orange. Right side: blue, red, yellow.
 */
export type TouchPointId = 'green' | 'violet' | 'orange' | 'blue' | 'red' | 'yellow'

/**
 * Data descriptor for a single touch point.
 * Determines visual appearance and laser sweep speed.
 */
export interface TouchPoint {
  /** Unique identifier. Corresponds to the point's color name. */
  id: TouchPointId
  /** CSS color string used for rendering the point and its laser. */
  color: string
  /** Duration of one full laser rotation cycle. Unit: ms. */
  rotationPeriodMs: number
  /** Which bottom corner the point is anchored to. */
  cornerAnchor: 'LEFT' | 'RIGHT'
  /**
   * Position index within its corner group (0 = closest to corner edge,
   * 1 = middle, 2 = furthest from corner edge).
   */
  positionIndex: number
}

/**
 * Raw touch or mouse input event captured from the browser/Phaser.
 * Used as the boundary type between scenes and game logic.
 */
export interface InputEvent {
  /** Browser pointer identifier. Matches PointerEvent.pointerId. */
  pointerId: number
  /** Type of pointer action. */
  action: 'down' | 'move' | 'up'
  /** Horizontal position in logical canvas coordinates. Unit: px. */
  x: number
  /** Vertical position in logical canvas coordinates. Unit: px. */
  y: number
  /** Absolute timestamp when the event was captured. Unit: ms. */
  timestamp: number
}

/**
 * One named hit zone on an enemy body.
 * Each zone carries the hit result that applies when a projectile lands in it.
 */
export interface HitZone {
  /** Human-readable zone name used for debug and scoring logic. */
  name: Exclude<HitZoneName, 'none'>
  /** Result type that applies when this zone is hit. */
  hitResult: HitResult
}

/**
 * Snapshot of a projectile in flight.
 * Fully serializable — no class instances or functions.
 */
export interface Projectile {
  /** Unique projectile identifier (UUID or counter string). */
  id: string
  /** World position where the projectile was fired from. Unit: px. */
  origin: { x: number; y: number }
  /** World position the projectile is travelling toward. Unit: px. */
  target: { x: number; y: number }
  /** Skill that created this projectile — determines speed and visuals. */
  skillType: SkillType
  /** Normalised travel progress from origin to target. Range: 0–1. */
  progress: number
  /** Whether the projectile is still in flight (false = can be removed). */
  alive: boolean
  /**
   * Quick-chain damage bonus baked in at fire time (0 = no chain).
   * Decided at fire time so projectile flight duration does not affect the
   * chain window check, and rapid-fire of the same slot cannot retroactively
   * chain to an unrelated later cast from another slot.
   */
  chainBonus: number
  /**
   * Effective projectile radius (px) baked at fire time from PROJECTILE_BASE_RADIUS_PX
   * scaled by spellAreaMultiplier. The hit-detection disc — exposed so renderers and
   * test bridges can scale visuals to match the gameplay disc.
   */
  projectileRadius: number
  /**
   * Which screen side this projectile was fired from.
   * Baked at fire time from the firing slot's side so ProjectileHitEvent can
   * route damage stats to the correct SkillFightStats entry.
   */
  side: 'left' | 'right'
}

/**
 * Snapshot of the enemy's world position.
 * Hit zones are computed at runtime relative to this position using constants.
 */
export interface Enemy {
  /** Horizontal centre position in logical canvas space. Unit: px. */
  x: number
  /** Vertical centre position in logical canvas space. Unit: px. */
  y: number
  /**
   * Absolute elapsedMs until which the enemy is stunned (cannot fire missiles).
   * 0 = not stunned. Set by crit-stun upgrade rolls in GameStateMachine.
   */
  stunnedUntilMs: number
}

/**
 * Definition of a single enemy attack pattern.
 * One enemy can have multiple attacks with independent cooldowns; the weighted
 * random selector picks among the ready ones each tick.
 */
export interface EnemyAttackDef {
  /** Display name for debug / future UI. */
  name: string
  /** HP removed from the player on impact. Unit: HP. */
  damage: number
  /** How long after firing this attack waits before it is eligible again. Unit: ms. */
  cooldownMs: number
  /** Relative weight for the weighted random pick across ready attacks. Higher = more often. */
  weight: number
  /** CSS colour string for the orb. */
  projectileColor: string
  /** Missile travel speed. Unit: cm/s. (Compare to PROJECTILE_SPEED_CM.) */
  projectileSpeedCmS: number
  /** Offset from enemy torso centre where the missile originates. Unit: px. */
  castPoint: { dx: number; dy: number }
}

/**
 * Player entity — HP pool for damage taken from enemy attacks.
 * Resets at the start of each level.
 */
export interface Player {
  /** Current HP. Unit: HP. */
  hp: number
  /** Maximum HP for bar fill calculation. Unit: HP. */
  maxHp: number
}

/**
 * A missile fired by an enemy travelling toward the player.
 * Mirrors the player Projectile shape but carries damage and a colour for rendering.
 */
export interface IncomingMissile {
  /** Unique missile identifier. */
  id: string
  /** World position the missile spawned at. Unit: px. */
  origin: { x: number; y: number }
  /** World position the missile is travelling toward (player centre). Unit: px. */
  target: { x: number; y: number }
  /** HP damage the missile deals on impact. Unit: HP. */
  damage: number
  /** CSS colour string for the orb. */
  color: string
  /** Normalised travel progress from origin to target. Range: 0–1. */
  progress: number
  /** Whether the missile is still in flight (false = can be removed). */
  alive: boolean
}

/**
 * Snapshot of a player-hit event for the most recent enemy missile impact.
 * Drives the red-flash overlay and the floating damage number above the player HP bar.
 */
export interface PlayerHitEvent {
  /** Absolute timestamp (elapsedMs) when the hit landed. Unit: ms. */
  timestamp: number
  /** HP removed by this hit. Unit: HP. */
  damage: number
}

/**
 * Per-skill-slot fight statistics tracked during a battle.
 * Accumulates over the duration of a single fight; reset on nextLevel() and restartGame().
 */
export interface SkillFightStats {
  /** Skill type this slot is configured with. */
  skillType: SkillType
  /** Number of times the skill was fired (touch-up events). */
  fireCount: number
  /** Breakdown of hit results for this slot. */
  hitsByResult: Record<HitResult, number>
  /** Sum of all damage values dealt by this slot (after multipliers). */
  totalDamage: number
  /**
   * Time gaps in ms between consecutive touch interactions on this slot.
   * Each entry is the duration from touch-up to the next touch-down on the same slot.
   * Useful for computing idle time and future cooldown-aware DPS metrics.
   */
  touchGaps: number[]
}

/**
 * Fight statistics for the current battle, broken down by slot side.
 * Reset at the start of each new fight (nextLevel / restartGame).
 */
export interface FightStats {
  /** Statistics for the left skill slot. */
  left: SkillFightStats
  /** Statistics for the right skill slot. */
  right: SkillFightStats
  /** Total elapsed duration of the fight so far. Unit: ms. */
  durationMs: number
}

/**
 * Accumulated score counters for the current battle.
 */
export interface Score {
  /** Sum of all scored points (CRIT = 3, HIT = 1, others = 0). */
  total: number
  /** Number of critical hits (head zone). */
  crits: number
  /** Number of normal hits (torso zone). */
  hits: number
  /** Number of grazes (limb zones). */
  grazes: number
  /** Number of complete misses. */
  misses: number
}

/**
 * Snapshot of a single active skill slot touch point for rendering and state tracking.
 * Used by BattleScene to render the dynamic layout without Phaser dependencies.
 */
export interface ActiveSlotState {
  /** Unique slot identifier — "left_0", "right_0", etc. */
  id: string
  /** Canvas X position of the touch circle. Unit: px. */
  x: number
  /** Canvas Y position of the touch circle. Unit: px. */
  y: number
  /** Which side of the screen. */
  side: 'left' | 'right'
  /** Skill type routed through this slot. */
  skillType: SkillType
  /** Laser rotation period for this skill. Unit: ms. */
  rotationPeriodMs: number
  /** Whether the player's finger is currently held on this slot. */
  active: boolean
  /** Horizontal drag offset from the touch-down origin. Unit: px. */
  dragOffsetX: number
  /** Elapsed time at which this slot was touched down. Unit: ms. */
  touchStartMs: number
}

/**
 * Identifier for a single node in the global upgrade tree.
 * Extensible union — add new nodes here when expanding the tree.
 */
export type UpgradeNodeId =
  | 'cast_time_1' | 'cast_time_2' | 'cast_time_3'
  | 'crit_dmg_1'  | 'crit_dmg_2'  | 'crit_dmg_3'
  | 'crit_zone_1' | 'crit_zone_2'
  | 'crit_stun_1' | 'crit_stun_2'
  | 'proj_speed_1' | 'proj_speed_2' | 'proj_speed_3'
  | 'quick_chain_1' | 'quick_chain_2'
  | 'spell_area_1' | 'spell_area_2' | 'spell_area_3'

/**
 * Path classifier for upgrade tree nodes — drives the column layout in the
 * level-up picker UI. quick_chain is a cross-path node displayed below the
 * tree because it bridges cast_time and proj_speed via OR-dependency.
 */
export type UpgradePath =
  | 'cast_time'
  | 'crit'
  | 'proj_speed'
  | 'spell_area'
  | 'quick_chain'

/**
 * Aggregated stat multipliers and flags produced by unlocking upgrade nodes.
 * Consumed by DamageSystem / ProjectileSystem / rotation logic — this module
 * only stores values; it does not interpret them.
 *
 * All multipliers default to 1.0 (no effect) and additive bonuses to 0.
 */
export interface GlobalUpgradeState {
  /** Multiplier on laser rotation period — lower = faster sweep. Unit: dimensionless. */
  castTimeMultiplier: number
  /** Multiplier on damage dealt by CRIT hits. Unit: dimensionless. */
  critDamageMultiplier: number
  /** Near-miss tolerance — fraction of crit radius treated as crit. Unit: 0–1. */
  critZoneTolerance: number
  /** Probability that a CRIT hit stuns the enemy. Unit: 0–1. */
  critStunChance: number
  /** Duration of the stun applied on a successful crit stun roll. Unit: ms. */
  critStunDurationMs: number
  /** Multiplier on projectile travel speed. Unit: dimensionless. */
  projectileSpeedMultiplier: number
  /** Bonus damage multiplier applied while chaining hits within the window. Unit: dimensionless. */
  quickChainBonus: number
  /** Window in which a follow-up hit counts as a chain. Unit: ms. */
  quickChainWindowMs: number
  /** Multiplier on spell area-of-effect radius. Unit: dimensionless. */
  spellAreaMultiplier: number
  /** Nodes that have been unlocked so far. */
  unlockedNodeIds: readonly UpgradeNodeId[]
}

/**
 * Static definition of a single upgrade-tree node.
 * Pure data — applyTo is a pure function that returns a new state with the
 * node's stat changes folded in. Does not touch unlockedNodeIds; that is the
 * responsibility of applyUpgradeNode.
 */
export interface UpgradeNodeDef {
  /** Stable identifier referenced by requires/unlockedNodeIds. */
  id: UpgradeNodeId
  /** Short display title for the UI. */
  title: string
  /** Single-sentence description shown in the picker so the player knows what changes. */
  description: string
  /**
   * Path classifier — drives the column layout in the level-up picker.
   * All nodes in the same path share a column header.
   */
  path: UpgradePath
  /**
   * Prerequisite node ids using OR semantics — the node becomes available
   * when at least one of these ids is in unlockedNodeIds. Empty array = root
   * node (always available until unlocked).
   */
  requires: readonly UpgradeNodeId[]
  /** Pure stat transform. Must not mutate the input state. */
  applyTo: (state: GlobalUpgradeState) => GlobalUpgradeState
}

/**
 * Complete game state snapshot.
 * Must be fully serializable via JSON.stringify — no class instances, no functions.
 */
export interface GameState {
  /** High-level game phase controlling which systems are active. */
  phase: Phase
  /** Current accumulated score. */
  score: Score
  /** Enemy position snapshot. */
  enemy: Enemy
  /** All projectiles currently in flight. */
  activeProjectiles: Projectile[]
  /** Total elapsed battle time. Unit: ms. */
  elapsedMs: number
  /** Most recent hit event, or null if no hit has occurred yet. */
  lastHit: { result: HitResult; timestamp: number; damage: number; hitZone: HitZoneName; position: { x: number; y: number } | null } | null
  /**
   * Per-touch-point interaction state (legacy: keyed by named TouchPointId).
   * Kept for backward compatibility in tests that reference named keys.
   * Only populated for the 6 fixed named touch points; unused slots are inactive.
   * @deprecated Prefer activeSlots for dynamic layout rendering.
   */
  touchStates: Record<TouchPointId, { active: boolean; dragOffsetX: number; touchStartMs: number }>
  /**
   * Active skill slot states for the current skill configuration.
   * Used by BattleScene to render dynamic touch point circles and lasers.
   * Each entry corresponds to one slot in the player's skill config.
   */
  activeSlots: ActiveSlotState[]
  /** Current HP of the active enemy. Unit: HP. */
  enemyHp: number
  /** Maximum HP of the active enemy. Unit: HP. */
  enemyMaxHp: number
  /** Display name of the active enemy. */
  enemyName: string
  /** Sprite key (Phaser texture key) for the active enemy. */
  enemySpriteKey: string
  /**
   * Current animation key for the active enemy (e.g. 'idle', 'attack').
   * Used by BattleScene to drive animated sprite rendering for sprite-based enemies.
   */
  enemyAnimKey: string
  /**
   * Current frame index within the enemy's active animation.
   * Used by BattleScene to select the correct sprite frame for rendering.
   */
  enemyFrameIndex: number
  /** Current level number (1-based). */
  currentLevel: number
  /**
   * Number of active touch points per side for the current level.
   * Reflects how many skill slots are shown on-screen (1–3 per side).
   */
  touchPointsPerSide: { left: number; right: number }
  /**
   * Enemy hit zone map with absolute screen-pixel coordinates.
   * Derived from EnemyDef.hitZoneMap scaled to the enemy's current on-screen dimensions.
   * Exposed for the test bridge (window.__game.getState().enemyHitZonesPx).
   */
  enemyHitZonesPx: HitZoneEntryPx[]
  /**
   * Shape descriptor for the active enemy.
   * Read by BattleScene to choose the correct procedural drawing routine.
   * Always defined — falls back to DEFAULT_SHAPE if the EnemyDef has no shape.
   */
  enemyShape: ShapeDescriptor
  /** Player HP state — drives the player HP bar and game-over check. */
  player: Player
  /** All enemy missiles currently in flight toward the player. */
  incomingMissiles: IncomingMissile[]
  /**
   * Most recent player-hit event, or null if the player has not been hit yet
   * during the current battle. Reset on battle/level restart.
   */
  lastPlayerHit: PlayerHitEvent | null
  /**
   * Cumulative enemy kills the player has accumulated during the current run.
   * Resets to 0 on restartGame(); persists across levels and game-over restarts.
   * Drives player level promotion via XP_LEVEL_THRESHOLDS.
   */
  playerXp: number
  /**
   * Current player level (1 = start, PLAYER_MAX_LEVEL = end of run).
   * Promoted automatically when playerXp reaches the next threshold.
   */
  playerLevel: number
  /**
   * True when the player has just leveled up and the game is waiting for an
   * upgrade pick. While true, no new battles start — the upgrade picker UI is
   * expected to call confirmLevelUpUpgrade() to release the gate.
   */
  pendingLevelUp: boolean
  /**
   * Aggregated upgrade state — drives crit multiplier, crit zone tolerance,
   * cast time, projectile speed, quick chain bonus, spell area, and crit stun.
   * Consumed by DamageSystem, Enemy, ProjectileSystem, EnemyAttackSystem and
   * touch point layout. Defaults to DEFAULT_GLOBAL_UPGRADE_STATE.
   */
  globalUpgrades: GlobalUpgradeState
  /**
   * Map from slot id ("left_0", "right_0", …) to the absolute elapsedMs at
   * which that slot last fired a projectile. Used by DamageSystem to detect
   * cross-slot chains within the quick chain window.
   */
  lastCastBySlot: Record<string, number>
  /**
   * Per-skill-slot fight statistics for the current battle.
   * Tracks fire counts, hit breakdowns, damage dealt, and touch timing gaps.
   * Reset at the start of each new fight (nextLevel / restartGame).
   */
  fightStats: FightStats
  /**
   * Snapshot of fightStats captured at enemy kill, before stats are reset on
   * nextLevel() / restartGame(). Used by FightOverviewOverlay to display
   * per-skill results. Null during battle and loading phases.
   */
  fightStatsSnapshot: FightStats | null
}
