// ============================================================
// Enemy attack numeric constants — imported by enemyGraphs.ts and re-exported
// from constants.ts so the full public API remains accessible as:
//   import { X } from '../game/constants'
//
// Separated from constants.ts to break the enemyGraphs ↔ constants circular dep.
// (enemyGraphs.ts imports these; constants.ts imports from enemyGraphs.ts.)
// ============================================================

// ============================================================
// Idle / combat-idle dwell times — how long the enemy pauses
// ============================================================

/**
 * Idle dwell time for fast attackers (goblin scout, plague rat, ember wisp, insect swarm).
 * Short pause gives the player less reaction time between attack cycles.
 * Unit: ms. Affects: attack frequency for fast-archetype enemies.
 */
export const ENEMY_ATTACK_IDLE_DWELL_FAST_MS = 1800

/**
 * Combat-idle (post-attack recovery) dwell for fast attackers.
 * Derived from ENEMY_ATTACK_IDLE_DWELL_FAST_MS * 0.78 — keeps cadence snappy.
 * Unit: ms. Affects: attack recovery speed for fast-archetype enemies.
 */
export const ENEMY_ATTACK_COMBAT_IDLE_DWELL_FAST_MS = Math.round(ENEMY_ATTACK_IDLE_DWELL_FAST_MS * 0.78)

/**
 * Idle dwell time for normal attackers (stone giant, orc warrior, mirror knight,
 * crystal spider, ice giant).
 * Standard window — predictable rhythm the player can learn.
 * Unit: ms. Affects: attack frequency for normal-archetype enemies.
 */
export const ENEMY_ATTACK_IDLE_DWELL_NORMAL_MS = 2500

/**
 * Combat-idle dwell for normal attackers.
 * Derived from ENEMY_ATTACK_IDLE_DWELL_NORMAL_MS * 0.72.
 * Unit: ms. Affects: attack recovery speed for normal-archetype enemies.
 */
export const ENEMY_ATTACK_COMBAT_IDLE_DWELL_NORMAL_MS = Math.round(ENEMY_ATTACK_IDLE_DWELL_NORMAL_MS * 0.72)

/**
 * Idle dwell time for slow attackers (iron golem, ancient treant).
 * Long pause — fewer attacks, but each hits harder.
 * Unit: ms. Affects: attack frequency for slow-archetype enemies.
 */
export const ENEMY_ATTACK_IDLE_DWELL_SLOW_MS = 3200

/**
 * Combat-idle dwell for slow attackers.
 * Derived from ENEMY_ATTACK_IDLE_DWELL_SLOW_MS * 0.78.
 * Unit: ms. Affects: attack recovery speed for slow-archetype enemies.
 */
export const ENEMY_ATTACK_COMBAT_IDLE_DWELL_SLOW_MS = Math.round(ENEMY_ATTACK_IDLE_DWELL_SLOW_MS * 0.78)

// ============================================================
// Delivery physics
// ============================================================

/**
 * Flight speed for all enemy orb (ranged) attacks.
 * Slower than player projectiles so the player has a reaction window to brace.
 * Unit: cm/s. Affects: time-to-hit for enemy orb deliveries.
 */
export const ENEMY_ORB_SPEED_CM_S = 45

/**
 * Time after spawn at which a melee overlay delivery 'connects' with the player.
 * Short enough to feel instant; long enough for the visual to show briefly.
 * Unit: ms. Affects: player reaction window for melee attack deliveries.
 */
export const ENEMY_OVERLAY_CONNECT_MS = 400

/**
 * Vertical offset from the enemy's centre where orbs are spawned.
 * Negative = above centre (roughly at the enemy's torso / hand level).
 * Unit: px. Affects: orb spawn position for all ranged enemies.
 */
export const ENEMY_ORB_CAST_DY = -40

// ============================================================
// Release frames — which animation frame triggers delivery spawn
// ============================================================

/**
 * Release frame for short 7-frame attack animations (stone giant attack).
 * Frame 4 of 7 (0-indexed) — roughly the apex of the swing.
 * Unit: frame index. Affects: when the orb spawns in stone giant's attack.
 */
export const ENEMY_ATTACK_RELEASE_FRAME_7F = 4

/**
 * Release frame for standard 9-frame attack animations (most enemies).
 * Frame 5 of 9 (0-indexed) — mid-animation impact point.
 * Unit: frame index. Affects: when the delivery spawns for 9-frame attack animations.
 */
export const ENEMY_ATTACK_RELEASE_FRAME_9F = 5

/**
 * Release frame for long 13-frame attack animations (insect swarm attack).
 * Frame 8 of 13 (0-indexed) — well into the animation, giving windup telegraphing.
 * Unit: frame index. Affects: when the orb spawns in insect swarm's attack.
 */
export const ENEMY_ATTACK_RELEASE_FRAME_13F = 8

// ============================================================
// Visual keys — render-layer lookup keys for delivery visuals
// Kept as named constants so graphs have zero hardcoded strings.
// ============================================================

/**
 * Visual key for procedural flying orb delivery (OrbVisual).
 * Used by all ranged enemies. Matches the key registered in createDefaultDeliveryRegistry.
 * Unit: string (visualKey). Affects: which visual the render layer draws for orb deliveries.
 */
export const ENEMY_VISUAL_KEY_ORB = 'orb'

/**
 * Visual key for procedural teeth/claws melee overlay (TeethVisual).
 * Used by all melee enemies. Matches the key registered in createDefaultDeliveryRegistry.
 * Unit: string (visualKey). Affects: which visual the render layer draws for melee deliveries.
 */
export const ENEMY_VISUAL_KEY_MELEE = 'teeth'

// ============================================================
// Damage per enemy — HP removed from the player on delivery connect
// Values scale with campaign position: early enemies hit less.
// ============================================================

/**
 * Damage dealt by Goblin Scout attack. Early-game easy enemy.
 * Unit: HP. Affects: how many attacks the player can absorb (PLAYER_MAX_HP / this).
 */
export const ENEMY_GOBLIN_SCOUT_ATTACK_DAMAGE = 3

/**
 * Damage dealt by Plague Rat attack. Small, fast early enemy.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_PLAGUE_RAT_ATTACK_DAMAGE = 4

/**
 * Damage dealt by Ember Wisp attack. Fast orb, mid-early difficulty.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_EMBER_WISP_ATTACK_DAMAGE = 5

/**
 * Damage dealt by Stone Giant rock throw. Mid-game normal enemy.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_STONE_GIANT_ATTACK_DAMAGE = 6

/**
 * Damage dealt by Insect Swarm attack. Mid-game many-hits enemy.
 * Lower per-hit damage compensated by high attack frequency.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_INSECT_SWARM_ATTACK_DAMAGE = 4

/**
 * Damage dealt by Mirror Knight sword slash. Mid-campaign duelist.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_MIRROR_KNIGHT_ATTACK_DAMAGE = 6

/**
 * Damage dealt by Orc Warrior axe swing. Mid-late, punishes slow play.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_ORC_WARRIOR_ATTACK_DAMAGE = 7

/**
 * Damage dealt by Iron Golem slam. Hard late-game enemy.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_IRON_GOLEM_ATTACK_DAMAGE = 8

/**
 * Damage dealt by Ice Giant standard attack (windup). Hard late-game enemy.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_ICE_GIANT_ATTACK_DAMAGE = 8

/**
 * Damage dealt by Ice Giant throw attack (full projectile). Hits harder than windup.
 * Derived from ENEMY_ICE_GIANT_ATTACK_DAMAGE * 1.25 — telegraphed but punishing.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_ICE_GIANT_THROW_DAMAGE = Math.round(ENEMY_ICE_GIANT_ATTACK_DAMAGE * 1.25)

/**
 * Damage dealt by Crystal Spider standard attack (claws). Hard enemy.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_CRYSTAL_SPIDER_ATTACK_DAMAGE = 5

/**
 * Damage dealt by Crystal Spider mandible attack. Slightly weaker than claws.
 * Derived from ENEMY_CRYSTAL_SPIDER_ATTACK_DAMAGE * 0.8.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_CRYSTAL_SPIDER_MANDIBLE_DAMAGE = Math.round(ENEMY_CRYSTAL_SPIDER_ATTACK_DAMAGE * 0.8)

/**
 * Damage dealt by Crystal Spider bite attack. Strongest of the three attacks.
 * Derived from ENEMY_CRYSTAL_SPIDER_ATTACK_DAMAGE * 1.4.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_CRYSTAL_SPIDER_BITE_DAMAGE = Math.round(ENEMY_CRYSTAL_SPIDER_ATTACK_DAMAGE * 1.4)

/**
 * Damage dealt by Ancient Treant branch slam. Boss-tier final enemy.
 * Unit: HP. Affects: how many attacks the player can absorb.
 */
export const ENEMY_ANCIENT_TREANT_ATTACK_DAMAGE = 10
