// ============================================================
// DamageSystem — pure damage calculation, no Phaser dependency
// Reads skill parameters from SkillRegistry — no switch/case on SkillType.
// ============================================================

import type { HitResult, SkillType } from '../../types'
import type { PlayerStats } from './PlayerProgression'
import { SkillRegistry } from '../skills/registry'
import {
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
} from '../constants'

// Ensure all skill modules are registered before DamageSystem is used.
// This import triggers the side-effect registrations in each skill module file.
import '../skills/index'

function rollBaseDamage(skillType: SkillType, rng: () => number): number {
  const skill = SkillRegistry.get(skillType)
  const { damageMin, damageMax } = skill
  return damageMin + Math.floor(rng() * (damageMax - damageMin + 1))
}

/**
 * Optional damage modifiers (all default to "no effect"):
 * - stats — when provided, CRIT damage uses stats.critDamageMultiplier
 *   instead of the base CRIT_DAMAGE_MULTIPLIER.
 * - chainBonus — precomputed quick-chain bonus from GameStateMachine fire path.
 *   When > 0, the final multiplier is scaled by (1 + chainBonus). The bonus is
 *   decided at fire time (not hit time) so projectile flight duration cannot
 *   eat the chain window and same-slot rapid fires cannot retroactively chain.
 */
export interface DamageOptions {
  stats?: PlayerStats
  chainBonus?: number
}

/**
 * Pure function that calculates the damage dealt by a skill hit.
 *
 * Base formula: rollBaseDamage(skillType, rng) × multiplier(hitResult)
 *
 * - CRIT multiplier comes from stats.critDamageMultiplier when provided,
 *   otherwise the base CRIT_DAMAGE_MULTIPLIER.
 * - HIT multiplier is always HIT_DAMAGE_MULTIPLIER (1.0).
 * - GRAZE multiplier is per-skill (read from SkillRegistry: white_shot/fireball use 0.5).
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
 * @param opts - Optional PlayerStats + precomputed chain bonus
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
  if (hitResult === 'CRIT') {
    multiplier = opts.stats?.critDamageMultiplier ?? CRIT_DAMAGE_MULTIPLIER
  } else if (hitResult === 'HIT') {
    multiplier = HIT_DAMAGE_MULTIPLIER
  } else {
    // GRAZE — read per-skill graze multiplier from registry (no switch/case)
    multiplier = SkillRegistry.get(skillType).grazeMultiplier
  }

  const chainBonus = opts.chainBonus ?? 0
  if (chainBonus > 0) multiplier *= 1 + chainBonus

  return Math.round(baseDamage * multiplier)
}
