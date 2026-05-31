// ============================================================
// CombatSystem — hit processing, score tracking, and per-fight statistics
// Pure TypeScript, no Phaser dependency.
//
// Responsibilities:
//   processHit()       — Apply a hit to the enemy, update score + stats, trigger effects
//   computeChainBonus() — Quick-chain bonus for multi-slot combos
// ============================================================

import type { HitResult, SkillType, HitZoneName, FightStats, SkillFightStats } from '../../types'
import type { EnemyStateSlice, StatusApplier } from '../skills/types'
import type { GlobalUpgradeState } from '../../types'
import { SkillRegistry } from '../skills/registry'
import { StatusEffectSystem } from './StatusEffectSystem'
import { calculateDamage } from './DamageSystem'
import { resolveHit } from './DamageSystem'
import type { HitResolution } from './DamageSystem'
import { computePlayerStats } from './PlayerProgression'
import { CRIT_SCORE, HIT_SCORE } from '../constants'
import type { Enemy } from '../entities/Enemy'

// Ensure all skill modules are registered before CombatSystem is used.
import '../skills/index'

// ============================================================
// Types
// ============================================================

/**
 * Result returned by processHit() — GSM uses this to update its own state.
 */
export interface HitProcessResult {
  /** Damage dealt to the enemy this hit. */
  damage: number
  /** Whether the enemy died (hp reached 0). */
  enemyDied: boolean
  /** Whether the enemy is stunned after this hit. */
  stunnedUntilMs: number
}

/**
 * Context passed into processHit() — read-only snapshot of GSM state.
 */
export interface HitContext {
  /** Current game elapsed time. Unit: ms. */
  elapsedMs: number
  /** Current enemy HP (before this hit). */
  enemyHp: number
  /** Enemy entity (for hit zone resolution). */
  enemy: Enemy
  /** Active upgrade state (for crit/stun/chain logic). */
  globalUpgrades: GlobalUpgradeState
  /** Mutable enemy status effect slice (StatusEffectSystem operates on this). */
  enemyStateSlice: EnemyStateSlice
  /** RNG channel shared with GSM for deterministic tests. */
  rng: () => number
}

// ============================================================
// CombatSystem
// ============================================================

/**
 * CombatSystem handles all per-hit logic:
 *   - Interaction resolution (status effect combos)
 *   - Damage calculation and application
 *   - Score tracking
 *   - Fight statistics accumulation
 *   - Crit stun rolls
 *   - Skill onHit dispatch
 *
 * State owned by CombatSystem:
 *   - score (total, crits, hits, grazes, misses)
 *   - lastHit
 *   - lastCastBySlot (for quick-chain bonus)
 *   - fightStats + fightStatsSnapshot
 *
 * Enemy HP mutation is returned as a result — GSM applies it to `enemyHp`.
 * PhaseManager.evaluate() is called by GSM after processHit(), not here.
 */
export class CombatSystem {
  // Score: total points + breakdown by hit type
  score = { total: 0, crits: 0, hits: 0, grazes: 0, misses: 0 }

  // Last hit record for UI display
  lastHit: {
    result: HitResult
    timestamp: number
    damage: number
    hitZone: HitZoneName
    position: { x: number; y: number } | null
  } | null = null

  // Per-slot fight statistics — reset on nextLevel() / restartGame()
  fightStats!: FightStats

  // Snapshot captured at enemy kill — consumed by FightOverviewOverlay
  fightStatsSnapshot: FightStats | null = null

  // Cross-slot fire timing for the quick-chain bonus
  lastCastBySlot: Record<string, number> = {}

  private readonly _statusEffectSystem: StatusEffectSystem

  constructor(statusEffectSystem: StatusEffectSystem) {
    this._statusEffectSystem = statusEffectSystem
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /**
   * Process a hit event: update score, apply damage, dispatch skill effects.
   * Returns damage dealt and whether the enemy died.
   *
   * @param result           - Hit result category (CRIT/HIT/GRAZE/MISS)
   * @param skillType        - Which skill was used
   * @param position         - World position of the hit (null for test-only calls)
   * @param chainBonus       - Quick-chain bonus (precomputed at fire time)
   * @param projectileRadius - Effective radius of the projectile (for hit zone re-derivation)
   * @param side             - Which slot side fired (for per-slot stats)
   * @param ctx              - GSM state snapshot
   * @returns HitProcessResult with damage, enemyDied flag, and updated stunnedUntilMs
   */
  processHit(
    result: HitResult,
    skillType: SkillType,
    position: { x: number; y: number } | null,
    chainBonus: number,
    projectileRadius: number,
    side: 'left' | 'right',
    ctx: HitContext,
  ): HitProcessResult {
    // Update score counters
    this._updateScore(result)

    // Resolve interaction rules (OCP — no switch/case on skillType)
    let interactionMultiplier = 1.0
    if (result !== 'MISS' && SkillRegistry.has(skillType)) {
      const skill = SkillRegistry.get(skillType)
      const base: HitResolution = { result, damageMultiplier: 1.0, visualKey: null }
      interactionMultiplier = resolveHit(skill, ctx.enemyStateSlice, base).damageMultiplier
    }

    // Calculate damage
    const damage = Math.round(calculateDamage(result, skillType, ctx.rng, {
      stats: computePlayerStats(ctx.globalUpgrades),
      chainBonus,
    }) * interactionMultiplier)

    const newEnemyHp = Math.max(0, ctx.enemyHp - damage)
    const enemyDied = newEnemyHp === 0

    // Update per-slot fight stats
    const slotStats = this.fightStats[side]
    slotStats.hitsByResult[result]++
    slotStats.totalDamage += damage

    // Record lastHit
    const hitZone: HitZoneName = position
      ? ctx.enemy.getHitZone(position, ctx.globalUpgrades.critZoneTolerance, projectileRadius)
      : 'none'
    this.lastHit = { result, timestamp: ctx.elapsedMs, damage, hitZone, position }

    // Crit stun roll — only on CRITs when enemy survived
    let stunnedUntilMs = 0
    if (
      result === 'CRIT' &&
      !enemyDied &&
      ctx.globalUpgrades.critStunChance > 0 &&
      ctx.rng() < ctx.globalUpgrades.critStunChance
    ) {
      stunnedUntilMs = ctx.elapsedMs + ctx.globalUpgrades.critStunDurationMs
    }

    // Skill-specific post-hit effects via SkillModule.onHit()
    if (!enemyDied && SkillRegistry.has(skillType)) {
      const skill = SkillRegistry.get(skillType)
      if (skill.onHit) {
        const applyStatus: StatusApplier = (effect) => {
          this._statusEffectSystem.apply(ctx.enemyStateSlice, effect)
        }
        skill.onHit(ctx.enemyStateSlice, result, applyStatus)
      }
    }

    return { damage, enemyDied, stunnedUntilMs }
  }

  /**
   * Compute the quick-chain bonus for a fire from firingSlotId.
   * Returns 0 when no other slot has fired within quickChainWindowMs,
   * or when the upgrade is not active.
   */
  computeChainBonus(firingSlotId: string, elapsedMs: number, globalUpgrades: GlobalUpgradeState): number {
    if (globalUpgrades.quickChainBonus <= 0 || globalUpgrades.quickChainWindowMs <= 0) return 0
    let mostRecent: number | null = null
    for (const id of Object.keys(this.lastCastBySlot)) {
      if (id === firingSlotId) continue
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const t = this.lastCastBySlot[id]!
      if (mostRecent === null || t > mostRecent) mostRecent = t
    }
    if (mostRecent === null) return 0
    if (elapsedMs - mostRecent > globalUpgrades.quickChainWindowMs) return 0
    return globalUpgrades.quickChainBonus
  }

  /**
   * Snapshot current fightStats for the FightOverviewOverlay.
   * Called when an enemy dies, before fightStats is reset on nextLevel/restartGame.
   */
  snapshotFightStats(): void {
    this.fightStatsSnapshot = {
      left: {
        ...this.fightStats.left,
        hitsByResult: { ...this.fightStats.left.hitsByResult },
        touchGaps: [...this.fightStats.left.touchGaps],
      },
      right: {
        ...this.fightStats.right,
        hitsByResult: { ...this.fightStats.right.hitsByResult },
        touchGaps: [...this.fightStats.right.touchGaps],
      },
      durationMs: this.fightStats.durationMs,
    }
  }

  /**
   * Reset all per-fight state for a new encounter.
   */
  resetForLevel(): void {
    this.lastCastBySlot = {}
    this.fightStatsSnapshot = null
  }

  /**
   * Deep-clone a FightStats object for serialization in getState().
   * Returns a new object with no shared references — safe for JSON.stringify.
   */
  serializeFightStats(stats: FightStats): FightStats {
    return {
      left: { ...stats.left, hitsByResult: { ...stats.left.hitsByResult }, touchGaps: [...stats.left.touchGaps] },
      right: { ...stats.right, hitsByResult: { ...stats.right.hitsByResult }, touchGaps: [...stats.right.touchGaps] },
      durationMs: stats.durationMs,
    }
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private _updateScore(result: HitResult): void {
    switch (result) {
      case 'CRIT':
        this.score.total += CRIT_SCORE
        this.score.crits++
        break
      case 'HIT':
        this.score.total += HIT_SCORE
        this.score.hits++
        break
      case 'GRAZE':
        this.score.grazes++
        break
      case 'MISS':
        this.score.misses++
        break
    }
  }
}

// ============================================================
// FightStats helpers (used by GameStateMachine to init stats)
// ============================================================

/**
 * Create a zeroed SkillFightStats entry for the given skill type.
 */
export function initSkillFightStats(skillType: SkillType): SkillFightStats {
  return {
    skillType,
    fireCount: 0,
    hitsByResult: { CRIT: 0, HIT: 0, GRAZE: 0, MISS: 0 },
    totalDamage: 0,
    touchGaps: [],
  }
}
