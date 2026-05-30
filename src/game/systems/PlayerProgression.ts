// ============================================================
// PlayerProgression — PlayerStats abstraction
//
// PlayerStats is the single output of the progression system consumed by
// all game systems. Systems never import GlobalUpgradeState directly.
//
// computePlayerStats() is the pure bridge: GlobalUpgradeState → PlayerStats.
// When STR/DEX/INT/ENERGY arrive, only this function changes — consumers stay.
// ============================================================

import type { GlobalUpgradeState } from '../../types'
import { PLAYER_MAX_HP } from '../constants'

/**
 * Aggregated player stat multipliers and flags consumed by game systems.
 * All values derived from GlobalUpgradeState via computePlayerStats().
 *
 * Systems read ONLY this interface — never GlobalUpgradeState directly.
 */
export interface PlayerStats {
  /** Multiplier on damage dealt by CRIT hits. Default: 2.0. Unit: dimensionless. */
  critDamageMultiplier: number
  /** Near-miss tolerance — fraction of crit radius treated as crit. Default: 0. Unit: 0–1. */
  critZoneTolerance: number
  /** Probability that a CRIT hit stuns the enemy. Default: 0. Unit: 0–1. */
  critStunChance: number
  /** Duration of the stun applied on a successful crit stun roll. Default: 0. Unit: ms. */
  critStunDurationMs: number
  /** Multiplier on laser rotation period — lower = faster sweep. Default: 1.0. Unit: dimensionless. */
  castTimeMultiplier: number
  /** Multiplier on projectile travel speed. Default: 1.0. Unit: dimensionless. */
  projectileSpeedMultiplier: number
  /** Multiplier on spell area-of-effect radius. Default: 1.0. Unit: dimensionless. */
  spellAreaMultiplier: number
  /** Maximum player HP. Unit: HP. */
  maxHp: number
  /**
   * Whether the quick-chain upgrade has been unlocked.
   * quickChainBonus (the actual timing-dependent damage value) is computed at
   * fire time by GameStateMachine — not stored here.
   */
  quickChainEnabled: boolean
  /** Window in which a cross-slot follow-up hit counts as a chain. Unit: ms. */
  quickChainWindowMs: number
  /** Bonus damage multiplier applied while chaining within the window. Unit: dimensionless. */
  quickChainBonus: number
}

/**
 * Derive PlayerStats from the raw GlobalUpgradeState.
 *
 * Pure function — no side effects, no mutation.
 * This is the ONLY place where GlobalUpgradeState is read by the game systems.
 * Future attribute systems (STR/DEX/INT/ENERGY) extend this function —
 * all consumers receive PlayerStats unchanged.
 *
 * @param state - current GlobalUpgradeState (upgrade tree output)
 * @returns PlayerStats snapshot for the current frame
 */
export function computePlayerStats(state: GlobalUpgradeState): PlayerStats {
  return {
    critDamageMultiplier: state.critDamageMultiplier,
    critZoneTolerance: state.critZoneTolerance,
    critStunChance: state.critStunChance,
    critStunDurationMs: state.critStunDurationMs,
    castTimeMultiplier: state.castTimeMultiplier,
    projectileSpeedMultiplier: state.projectileSpeedMultiplier,
    spellAreaMultiplier: state.spellAreaMultiplier,
    maxHp: PLAYER_MAX_HP,
    quickChainEnabled: state.quickChainBonus > 0 && state.quickChainWindowMs > 0,
    quickChainWindowMs: state.quickChainWindowMs,
    quickChainBonus: state.quickChainBonus,
  }
}
