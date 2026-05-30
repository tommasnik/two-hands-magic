// ============================================================
// DamageSystem — pure damage calculation, no Phaser dependency
// Reads skill parameters from SkillRegistry — no switch/case on SkillType.
// ============================================================

import type { HitResult, SkillType } from '../../types'
import type { PlayerStats } from './PlayerProgression'
import type { EnemyStateSlice, SkillModule } from '../skills/types'
import { SkillRegistry } from '../skills/registry'
import {
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
} from '../constants'

// Ensure all skill modules are registered before DamageSystem is used.
// This import triggers the side-effect registrations in each skill module file.
import '../skills/index'

// ============================================================
// HitResolution — result of resolveHit()
// ============================================================

/**
 * The resolved outcome of a skill hit after applying interaction rules.
 * Carries the (possibly modified) damage multiplier and visual key so
 * the caller can apply both without re-reading interaction data.
 */
export interface HitResolution {
  /** Resulting hit category (unchanged — interaction rules do not change the category). */
  result: HitResult
  /**
   * Final damage multiplier to apply on top of the base roll.
   * 1.0 = no modification. May be > 1.0 when an interaction rule triggers.
   */
  damageMultiplier: number
  /**
   * Visual key override for this hit (e.g. 'lightning_frozen_discharge').
   * Null = use the skill's default visual.
   */
  visualKey: string | null
}

// ============================================================
// resolveHit — OCP interaction lookup, no switch/case on SkillType
// ============================================================

/**
 * Resolve a skill hit against the enemy's current status effects.
 *
 * Checks the skill's `interactions` array for a rule whose `whenEnemyHas`
 * matches one of the enemy's active status effects. Returns a HitResolution
 * with the combined damage multiplier and optional visual key override.
 *
 * Design (OCP):
 *   - No switch/case on skill type.
 *   - No condition on SkillType anywhere in this function.
 *   - Adding a new skill interaction = add an InteractionRule to the skill module.
 *
 * @param skill          - SkillModule for the hitting skill
 * @param enemy          - current enemy state slice (reads activeStatusEffects)
 * @param baseResolution - starting HitResolution (result + default multiplier)
 * @returns Modified HitResolution (or baseResolution unchanged if no rule matches)
 */
export function resolveHit(
  skill: SkillModule,
  enemy: EnemyStateSlice,
  baseResolution: HitResolution,
): HitResolution {
  if (!skill.interactions || skill.interactions.length === 0) return baseResolution

  const rule = skill.interactions.find(
    r => enemy.activeStatusEffects.some(e => e.kind === r.whenEnemyHas && e.remainingMs > 0),
  )
  if (!rule) return baseResolution

  return {
    ...baseResolution,
    damageMultiplier: baseResolution.damageMultiplier * (rule.damageMultiplier ?? 1.0),
    visualKey: rule.visualKey ?? baseResolution.visualKey,
  }
}

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
