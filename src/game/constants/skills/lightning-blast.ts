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
