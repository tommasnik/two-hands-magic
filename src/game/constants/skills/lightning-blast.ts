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

/**
 * Cooldown after firing lightning_blast. Instant-hit skill gated behind a 0.5 s recharge.
 * Unit: ms. Affects: how soon lightning_blast can be cast again after touch-up.
 */
export const LIGHTNING_BLAST_COOLDOWN_MS = 500

/** Interval between arc DoT damage ticks when lightning hits a frozen enemy. Unit: ms. Affects: lightning_arc DoT granularity. */
export const LIGHTNING_ARC_TICK_INTERVAL_MS = 200

/** Fraction of average base lightning damage dealt per arc tick. Unit: dimensionless. Affects: lightning_arc DoT output. */
export const LIGHTNING_ARC_TICK_DAMAGE_RATIO = 0.25

/** Duration of the arc visual effect spawned on each DoT tick. Unit: ms. Affects: lightning_arc render lifetime. */
export const LIGHTNING_ARC_VISUAL_DURATION_MS = 150
