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
export type SkillType = 'fireball' | 'slow_shot' | 'fast_shot' | 'white_shot' | 'ice_crystal' | 'lightning_blast'

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
 * BehaviorSystem movement pattern — typed union consumed by BehaviorSystem.
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
   * Character manifest ID (kebab-case) referencing a manifest.json in
   * src/assets/characters/{manifestId}/. Used by CharacterRegistry to look up
   * spriteKey, displayWidth, animation defs, and mask config.
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
   * Machine-readable behavior descriptor consumed by BehaviorSystem.
   * Defines how the enemy moves each game tick.
   * Optional — defaults to static (no movement) when not specified.
   */
  behavior?: EnemyBehaviorDef
  /**
   * Declarative attack/behaviour state-graph driving how this enemy animates and
   * attacks the player. Executed by EnemyBehaviorRunner. Replaces the old stateless
   * weighted-picker `attacks[]`.
   * Optional — enemies without a graph never attack (a valid, non-attacking state).
   */
  behaviorGraph?: BehaviorGraph
  /**
   * Display width override in pixels when rendering the sprite.
   * When omitted, the value from CharacterRegistry manifest is used.
   */
  displayWidth?: number
}

// ============================================================
// Enemy Attack & Behavior Framework (state-graph + delivery model)
// Contract: EnemyAttacks.md §3–4. Pure data, no Phaser / render detail.
// ============================================================

/**
 * Declarative behaviour graph for one enemy: named nodes + the starting node.
 * The runner holds exactly one active node; when a node's exit trigger fires it
 * evaluates the node's edges and transitions to the next node.
 */
export interface BehaviorGraph {
  /** Id of the node the runner starts in (and restarts into from a terminal node). */
  start: string
  /** All nodes keyed by their unique id. */
  nodes: Record<string, BehaviorNode>
}

/**
 * A single node in a BehaviorGraph: one sprite animation plus an optional attack.
 * A node with no attack is pure animation / idle.
 */
export interface BehaviorNode {
  /** Unique node key within the graph. */
  id: string
  /** Which enemy sprite animation plays while this node is active. */
  animKey: string
  /**
   * Fallback when animKey is missing from the manifest (crystal-spider, ice-giant
   * have no idle): hold a single frame of another animation. animKey is then
   * interpreted as 'hold'.
   */
  holdFrame?: { animKey: string; frameIndex: number }
  /** What ends this node and triggers edge evaluation. */
  exitTrigger: ExitTrigger
  /** Optional attack emitted on its release frame. Omit for a pure animation/idle node. */
  attack?: AttackSpec
  /** Edges to successor nodes. Empty = terminal (the graph restarts into `start`). */
  edges: Edge[]
}

/**
 * What ends a node and triggers edge evaluation (hybrid trigger model).
 * - animationComplete: one-shot animation node ends when the animation finishes.
 * - afterMs: loop/idle node dwells for `ms` then exits.
 * - condition: node exits as soon as `guard` becomes satisfied.
 */
export type ExitTrigger =
  | { kind: 'animationComplete' }
  | { kind: 'afterMs'; ms: number }
  | { kind: 'condition'; guard: Guard }

/**
 * A weighted edge to a successor node, with an optional eligibility guard.
 * On node exit: keep edges whose guard holds (or is absent), then weighted-random
 * among them by `weight`.
 */
export interface Edge {
  /** Target node id. */
  to: string
  /** Relative weight for the weighted random among eligible edges. */
  weight: number
  /** Optional eligibility condition; absent = 'always' (always eligible). */
  guard?: Guard
}

/**
 * A small typed set of edge guards. Intentionally minimal — extend only by agreement.
 * Guards depending on player status effects are out of scope (see EnemyAttacks.md §7).
 */
export type Guard =
  | { kind: 'always' }
  | { kind: 'enemyHpBelow'; pct: number }
  | { kind: 'enemyHpAbove'; pct: number }
  | { kind: 'attackCountAtLeast'; n: number }

/**
 * Specification of an attack emitted on a node's release frame.
 * The damage/effect applies only when the resulting delivery connects with the
 * player — not on the sprite frame itself. Carries only data (a visualKey), never
 * any Phaser / render detail.
 */
export interface AttackSpec {
  /** HP removed from the player on connect. 0 for effect-only. Unit: HP. */
  damage: number
  /** Frame index of the node's animation on which the delivery is spawned. */
  releaseFrame: number
  /** Delivery kind. 'effect' = hook only, no implementation yet (EnemyAttacks.md §7). */
  kind: 'orb' | 'overlay' | 'effect'
  /** Render-layer lookup key (pure data, no Phaser). */
  visualKey: string
  /** Orb only: flight speed. Unit: cm/s. */
  projectileSpeedCmS?: number
  /** Orb only: offset from the enemy centre where the orb spawns. Unit: px. */
  castPoint?: { dx: number; dy: number }
  /** Overlay only: when during its animation the overlay 'connects' (bites). Unit: ms. */
  overlayConnectMs?: number
}

/**
 * Serialisable snapshot of one in-flight attack delivery for the render layer.
 * Produced by DeliverySystem.getActive() and exposed in GameState so the render
 * layer and the test bridge can draw / inspect orbs and overlays. Carries only
 * data (a visualKey + geometry) — never any Phaser / render detail.
 */
export interface ActiveDelivery {
  /** Unique id of this delivery. */
  id: string
  /** Delivery kind that produced a visual ('effect' deliveries never appear here). */
  kind: 'orb' | 'overlay'
  /** Render-layer lookup key. */
  visualKey: string
  /** Where the delivery originates. For overlay this equals target (it plays on the player). Unit: px. */
  origin: { x: number; y: number }
  /** Where the delivery connects (player centre). Unit: px. */
  target: { x: number; y: number }
  /** Flight / connect progress in 0..1. 1 = connected. */
  progress: number
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
  /** Player HP state — drives the player HP bar and game-over check. */
  player: Player
  /**
   * All enemy attack deliveries currently in flight toward the player (orbs +
   * overlays). Replaces the legacy incomingMissiles list. Drives the render
   * layer (via DeliveryVisualRegistry) and the e2e test bridge.
   */
  activeDeliveries: ActiveDelivery[]
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
   * Consumed by DamageSystem, Enemy, ProjectileSystem and
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
  /**
   * Character manifest ID for the active enemy (e.g. 'stone-giant').
   * Used by BattleScene to look up displayWidth and anchor from CharacterRegistry.
   * Undefined for enemies without a manifest.
   */
  enemyManifestId?: string
  /**
   * Display width of the active enemy in pixels.
   * Used by BattleScene for rendering size; overrides manifest.displayWidth when set.
   */
  enemyDisplayWidth?: number
}
