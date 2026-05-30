import type { SkillType } from '../../../types'

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
 * Skill type assigned to the left-side touch points.
 * Left = white_shot (rapid low-damage skill; task-38 new skill).
 */
export const LEFT_SIDE_SKILL: SkillType = 'white_shot'

/**
 * Skill type assigned to the right-side touch points.
 * Right = fireball (slow burst skill; task-38 new skill).
 */
export const RIGHT_SIDE_SKILL: SkillType = 'fireball'

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

// ============================================================
// Skill damage values — legacy slow/fast shot constants
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

// Re-export all skill-specific constants
export * from './white-shot'
export * from './fireball'
export * from './ice-crystal'
export * from './lightning-blast'
