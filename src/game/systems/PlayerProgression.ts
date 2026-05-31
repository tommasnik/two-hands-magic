// ============================================================
// PlayerProgression — PlayerStats abstraction + progression class
//
// PlayerStats is the single output of the progression system consumed by
// all game systems. Systems never import GlobalUpgradeState directly.
//
// computePlayerStats() is the pure bridge: GlobalUpgradeState → PlayerStats.
// When STR/DEX/INT/ENERGY arrive, only this function changes — consumers stay.
//
// PlayerProgression is the stateful class encapsulating XP, level, pendingLevelUp,
// and the upgrade tree. GSM holds one instance and delegates all progression logic
// to it. The class exposes applyKill(), confirmUpgrade(), computeMaxHp(), and
// snapshotForFight() — GSM uses only these four methods.
// ============================================================

import type { GlobalUpgradeState, UpgradeNodeId, FightInitSnapshot } from '../../types'
import { PLAYER_MAX_HP, PLAYER_START_LEVEL, PLAYER_MAX_LEVEL, XP_LEVEL_THRESHOLDS, DEFAULT_GLOBAL_UPGRADE_STATE } from '../constants'
import { applyUpgradeNode, getAvailableNodes } from '../upgrades'

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

// ============================================================
// PlayerProgression — stateful class for XP, level, upgrades
// ============================================================

/**
 * Encapsulates all player progression state: XP, level, pending level-up gate,
 * and the global upgrade tree. GSM holds one instance and delegates every
 * progression decision here — no inline XP or upgrade logic in GSM.
 *
 * Public API used by GSM:
 *   applyKill()           — call after every enemy kill
 *   confirmUpgrade(id)    — call when the player picks an upgrade node
 *   computeMaxHp()        — returns current max HP derived from upgrades
 *   snapshotForFight()    — deep-copies progression values for fight initialisation
 *   reset()               — resets to start-of-run values (restartGame)
 *
 * @internal test helpers: setLevelForTesting(), applyUpgradeForTesting()
 */
export class PlayerProgression {
  playerXp = 0
  playerLevel: number = PLAYER_START_LEVEL
  pendingLevelUp = false
  upgrades: GlobalUpgradeState = {
    ...DEFAULT_GLOBAL_UPGRADE_STATE,
    unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
  }

  /**
   * Record an enemy kill: add 1 XP, check if the player reaches the next level
   * threshold and set pendingLevelUp if so. No-op when already at max level.
   */
  applyKill(): void {
    this.playerXp += 1
    if (this.playerLevel >= PLAYER_MAX_LEVEL) return
    const nextLevel = this.playerLevel + 1
    const threshold = XP_LEVEL_THRESHOLDS[nextLevel]
    if (threshold !== undefined && this.playerXp >= threshold) {
      this.playerLevel = nextLevel
      this.pendingLevelUp = true
    }
  }

  /**
   * Confirm a level-up: optionally apply an upgrade node, then release the gate.
   * Throws if the requested node is not currently available.
   *
   * @param nodeId - upgrade node to apply, or undefined to skip the pick
   */
  confirmUpgrade(nodeId?: UpgradeNodeId): void {
    if (!this.pendingLevelUp) return
    if (nodeId !== undefined) {
      const available = getAvailableNodes(this.upgrades)
      if (!available.some((n) => n.id === nodeId)) throw new Error(`Upgrade node not available: ${nodeId}`)
      this.upgrades = applyUpgradeNode(this.upgrades, nodeId)
    }
    this.pendingLevelUp = false
  }

  /**
   * Returns the player's maximum HP derived from the current upgrade state.
   * Currently always PLAYER_MAX_HP — placeholder for future maxHp upgrades.
   */
  computeMaxHp(): number {
    return PLAYER_MAX_HP
  }

  /**
   * Deep-copies progression values into a FightInitSnapshot for fight initialisation.
   * The snapshot is a value copy — mutating the returned object has no effect on
   * the progression state.
   */
  snapshotForFight(): FightInitSnapshot {
    return {
      upgrades: { ...this.upgrades, unlockedNodeIds: [...this.upgrades.unlockedNodeIds] },
      playerMaxHp: this.computeMaxHp(),
    }
  }

  /**
   * Reset to start-of-run defaults. Called by restartGame().
   */
  reset(): void {
    this.playerXp = 0
    this.playerLevel = PLAYER_START_LEVEL
    this.pendingLevelUp = false
    this.upgrades = {
      ...DEFAULT_GLOBAL_UPGRADE_STATE,
      unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
    }
  }

  // @internal test-only helpers

  /** Force-set player level for testing edge cases. */
  setLevelForTesting(level: number): void { this.playerLevel = level }

  /**
   * Apply an upgrade node bypassing availability checks — idempotent on duplicates.
   * Used by tests that need specific upgrade configurations.
   */
  applyUpgradeForTesting(nodeId: UpgradeNodeId): void {
    if (this.upgrades.unlockedNodeIds.includes(nodeId)) return
    this.upgrades = applyUpgradeNode(this.upgrades, nodeId)
  }
}
