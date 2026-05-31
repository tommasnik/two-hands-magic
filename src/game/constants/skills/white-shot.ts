// ============================================================
// White Shot skill constants
// ============================================================

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
 * Laser rotation period for the white shot skill. Matches TP_VIOLET rotation speed (fastest).
 * Very fast sweep = very tight aiming window, requires high reaction speed.
 * Derived from TP_VIOLET.rotationPeriodMs = 600ms.
 * Unit: ms. Affects: white_shot laser sweep rate.
 */
export const WHITE_SHOT_ROTATION_PERIOD_MS = 600

/**
 * Cooldown after firing white_shot. 0 = no cooldown (spammable rapid-fire skill).
 * Unit: ms. Affects: how soon white_shot can be cast again after touch-up.
 */
export const WHITE_SHOT_COOLDOWN_MS = 0
