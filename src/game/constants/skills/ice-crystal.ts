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
