// ============================================================
// DamageSystem — pure damage calculation, no Phaser dependency
// ============================================================

import type { GlobalUpgradeState, HitResult, SkillType } from '../../types'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  WHITE_SHOT_SKILL_DAMAGE_MIN,
  WHITE_SHOT_SKILL_DAMAGE_MAX,
  FIREBALL_SKILL_DAMAGE_MIN,
  FIREBALL_SKILL_DAMAGE_MAX,
  ICE_CRYSTAL_DAMAGE_MIN,
  ICE_CRYSTAL_DAMAGE_MAX,
  LIGHTNING_BLAST_DAMAGE_MIN,
  LIGHTNING_BLAST_DAMAGE_MAX,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  GRAZE_DAMAGE_MULTIPLIER,
  NEW_SKILL_GREEN_ZONE_MULTIPLIER,
} from '../constants'

/**
 * Damage range [min, max] per skill type.
 * Fixed-damage skills use min === max.
 */
const SKILL_DAMAGE_RANGE: Record<SkillType, [number, number]> = {
  slow_shot: [SLOW_SKILL_DAMAGE, SLOW_SKILL_DAMAGE],
  fast_shot: [FAST_SKILL_DAMAGE, FAST_SKILL_DAMAGE],
  fireball: [FIREBALL_SKILL_DAMAGE_MIN, FIREBALL_SKILL_DAMAGE_MAX],
  white_shot: [WHITE_SHOT_SKILL_DAMAGE_MIN, WHITE_SHOT_SKILL_DAMAGE_MAX],
  ice_crystal: [ICE_CRYSTAL_DAMAGE_MIN, ICE_CRYSTAL_DAMAGE_MAX],
  lightning_blast: [LIGHTNING_BLAST_DAMAGE_MIN, LIGHTNING_BLAST_DAMAGE_MAX],
}

/**
 * Map from SkillType to GRAZE multiplier override.
 * white_shot and fireball have a 50% graze multiplier (vs-green-zone reduction).
 * slow_shot and fast_shot use the standard GRAZE_DAMAGE_MULTIPLIER.
 */
const SKILL_GRAZE_MULTIPLIER: Record<SkillType, number> = {
  slow_shot: GRAZE_DAMAGE_MULTIPLIER,
  fast_shot: GRAZE_DAMAGE_MULTIPLIER,
  fireball: NEW_SKILL_GREEN_ZONE_MULTIPLIER,
  white_shot: NEW_SKILL_GREEN_ZONE_MULTIPLIER,
  ice_crystal: GRAZE_DAMAGE_MULTIPLIER,
  lightning_blast: GRAZE_DAMAGE_MULTIPLIER,
}

function rollBaseDamage(skillType: SkillType, rng: () => number): number {
  const [min, max] = SKILL_DAMAGE_RANGE[skillType]
  return min + Math.floor(rng() * (max - min + 1))
}

/**
 * Optional damage modifiers (all default to "no effect"):
 * - upgrades — when provided, CRIT damage uses upgrades.critDamageMultiplier
 *   instead of the base CRIT_DAMAGE_MULTIPLIER.
 * - chainBonus — precomputed quick-chain bonus from GameStateMachine fire path.
 *   When > 0, the final multiplier is scaled by (1 + chainBonus). The bonus is
 *   decided at fire time (not hit time) so projectile flight duration cannot
 *   eat the chain window and same-slot rapid fires cannot retroactively chain.
 */
export interface DamageOptions {
  upgrades?: GlobalUpgradeState
  chainBonus?: number
}

/**
 * Pure function that calculates the damage dealt by a skill hit.
 *
 * Base formula: rollBaseDamage(skillType, rng) × multiplier(hitResult)
 *
 * - CRIT multiplier comes from upgrades.critDamageMultiplier when provided,
 *   otherwise the base CRIT_DAMAGE_MULTIPLIER.
 * - HIT multiplier is always HIT_DAMAGE_MULTIPLIER (1.0).
 * - GRAZE multiplier is per-skill (white_shot/fireball use NEW_SKILL_GREEN_ZONE_MULTIPLIER).
 * - When opts.chainBonus > 0, the final multiplier is scaled by (1 + chainBonus).
 * - MISS always returns 0.
 *
 * The final product is rounded with Math.round across all hit types so HP
 * remains integral whenever an upgrade introduces a fractional multiplier.
 * For combinations whose product is already integer (default upgrades), the
 * result is unchanged — Math.round on an integer is a no-op.
 *
 * @param hitResult - Zone category of the hit (CRIT / HIT / GRAZE / MISS)
 * @param skillType - Skill that fired the projectile
 * @param rng - Random number generator [0, 1) — injectable for deterministic tests
 * @param opts - Optional upgrade state + precomputed chain bonus
 * @returns Damage dealt. Unit: HP.
 */
export function calculateDamage(
  hitResult: HitResult,
  skillType: SkillType,
  rng: () => number = Math.random,
  opts: DamageOptions = {},
): number {
  if (hitResult === 'MISS') return 0
  const baseDamage = rollBaseDamage(skillType, rng)

  let multiplier: number
  if (hitResult === 'CRIT') multiplier = opts.upgrades?.critDamageMultiplier ?? CRIT_DAMAGE_MULTIPLIER
  else if (hitResult === 'HIT') multiplier = HIT_DAMAGE_MULTIPLIER
  else multiplier = SKILL_GRAZE_MULTIPLIER[skillType]

  const chainBonus = opts.chainBonus ?? 0
  if (chainBonus > 0) multiplier *= 1 + chainBonus

  return Math.round(baseDamage * multiplier)
}
