import { PROJECTILE_SPEED_CM } from '../combat'

// ============================================================
// Fireball skill constants
// ============================================================

/** Fireball skill projectile speed — significantly slower than base for a heavy, telegraphed shot. Unit: cm/s. */
export const FIREBALL_SPEED_CM = PROJECTILE_SPEED_CM * 0.4

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
 * Laser rotation period for the fireball skill.
 * Slow sweep = wide aiming window, compensated by long cooldown (2 s).
 * 2000 ms aligns with the 2 s design cooldown intent.
 * Unit: ms. Affects: fireball laser sweep rate.
 */
export const FIREBALL_ROTATION_PERIOD_MS = 2000
