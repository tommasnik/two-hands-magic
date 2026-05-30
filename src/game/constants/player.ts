// ============================================================
// Player HP & enemy-attack feedback
// ============================================================

/**
 * Player starting / maximum HP. Resets on every level (start, level transition, restart-from-game-over).
 * Unit: HP. Affects: how many enemy missiles the player can absorb before game over.
 */
export const PLAYER_MAX_HP = 30

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
export const PLAYER_MAX_LEVEL = 12

/**
 * Cumulative kill counts that promote the player to each level.
 * Key = target level, value = cumulative enemy kills required to reach it.
 * One level-up per kill across the full ENEMY_POOL campaign — the last kill
 * coincides with reaching PLAYER_MAX_LEVEL.
 * Unit: enemy kills. Affects: pacing of upgrade picks.
 */
export const XP_LEVEL_THRESHOLDS: Readonly<Record<number, number>> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 7,
  9: 8,
  10: 9,
  11: 10,
  12: 11,
}
