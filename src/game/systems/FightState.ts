// ============================================================
// FightState — encapsulates all fight-local data.
//
// Created from a FightInitSnapshot (deep copy of progression values at fight
// start) plus an EnemyDef.  Has NO reference to GlobalState — all values it
// needs are copied in via the snapshot.
//
// GSM lifetime pattern:
//   this._fight = new FightState(def, this._global.progression.snapshotForFight())
// ============================================================

import type {
  EnemyDef,
  FightInitSnapshot,
  GlobalUpgradeState,
  HitZoneEntry,
  Projectile,
  ActiveDelivery,
  PlayerHitEvent,
  FightStats,
  FightStatsSnapshot,
  FightResult,
  BehaviorGraph,
} from '../../types'
import type { HitResult, HitZoneName } from '../../types'
import type { StatusEffect } from '../skills/types'
import { resolveSpriteKey, resolveHitZoneMap } from '../resolvers'
import { StatusEffectSystem } from './StatusEffectSystem'
import { CombatSystem } from './CombatSystem'
import { EnemyBehaviorRunner } from './EnemyBehaviorRunner'
import { ProjectileSystem } from './ProjectileSystem'
import { DeliverySystem } from './DeliverySystem'

// ============================================================
// FightState
// ============================================================

/**
 * All fight-local data for a single battle encounter.
 *
 * Initialised from:
 *   - EnemyDef   — enemy configuration (HP, sprite, hit zones, …)
 *   - FightInitSnapshot — deep-copied progression values (upgrades + playerMaxHp)
 *
 * No live reference to GlobalState — any change to GlobalState after fight
 * initialisation has no effect on the fight in progress.
 */
export class FightState {
  // ------------------------------------------------------------------
  // Snapshot from GlobalState at init — no live reference
  // ------------------------------------------------------------------
  upgrades: GlobalUpgradeState
  readonly playerMaxHp: number

  // ------------------------------------------------------------------
  // Fight-local systems (owned exclusively for the duration of this fight)
  // ------------------------------------------------------------------
  readonly statusEffects: StatusEffectSystem
  readonly combat: CombatSystem
  /** EnemyBehaviorRunner — undefined when the enemy has no behaviorGraph. */
  runner: EnemyBehaviorRunner | undefined
  readonly projectiles: ProjectileSystem
  readonly delivery: DeliverySystem

  // ------------------------------------------------------------------
  // Enemy state
  // ------------------------------------------------------------------
  enemyHp: number
  readonly enemyMaxHp: number
  readonly enemyName: string
  readonly enemySpriteKey: string
  readonly enemyManifestId: string | undefined
  readonly enemyHitZoneMap: readonly HitZoneEntry[]

  // ------------------------------------------------------------------
  // Player state
  // ------------------------------------------------------------------
  playerHp: number

  // ------------------------------------------------------------------
  // Projectiles & deliveries
  // ------------------------------------------------------------------
  activeProjectiles: Projectile[] = []
  activeDeliveries: ActiveDelivery[] = []

  // ------------------------------------------------------------------
  // Hit records
  // ------------------------------------------------------------------
  lastHit: { result: HitResult; timestamp: number; damage: number; hitZone: HitZoneName; position: { x: number; y: number } | null } | null = null
  lastPlayerHit: PlayerHitEvent | null = null

  // ------------------------------------------------------------------
  // Enemy status & stun
  // ------------------------------------------------------------------
  enemyStunnedUntilMs = 0
  enemyStatusEffects: StatusEffect[] = []

  // ------------------------------------------------------------------
  // Lightning discharge
  // ------------------------------------------------------------------
  lightningDischargeUntilMs = 0
  lightningDischargeResult: HitResult | null = null
  lightningDischargeTarget: { x: number; y: number } | null = null

  // ------------------------------------------------------------------
  // Fight statistics
  // ------------------------------------------------------------------
  statsSnapshot: FightStatsSnapshot | null = null

  // ------------------------------------------------------------------
  // Internal flags
  // ------------------------------------------------------------------
  /** Whether the enemy was frozen during the previous tick (used to sync anim). */
  wasFrozenLastTick = false

  constructor(def: EnemyDef, snapshot: FightInitSnapshot, rng: () => number = Math.random) {
    this.upgrades = snapshot.upgrades
    this.playerMaxHp = snapshot.playerMaxHp

    // Create fight-local systems
    this.statusEffects = new StatusEffectSystem()
    this.combat = new CombatSystem(this.statusEffects)
    this.runner = def.behaviorGraph
      ? new EnemyBehaviorRunner(def.behaviorGraph, rng)
      : undefined
    this.projectiles = new ProjectileSystem()
    this.delivery = new DeliverySystem()

    this.enemyHp = def.maxHp
    this.enemyMaxHp = def.maxHp
    this.enemyName = def.name
    this.enemySpriteKey = resolveSpriteKey(def)
    this.enemyManifestId = def.manifestId
    this.enemyHitZoneMap = resolveHitZoneMap(def)

    this.playerHp = snapshot.playerMaxHp
  }

  /**
   * Reinitialise the behavior runner for the given graph.
   * Used when the fight is restarted mid-session (e.g. restartLevel)
   * or when tests inject a custom graph via _initBehaviorGraphForTesting.
   */
  resetRunner(graph: BehaviorGraph | undefined, rng: () => number): void {
    this.runner = graph ? new EnemyBehaviorRunner(graph, rng) : undefined
  }

  // ------------------------------------------------------------------
  // Result builder
  // ------------------------------------------------------------------

  /**
   * Build a FightResult snapshot when the fight ends.
   * Called by GSM after an enemy kill or player death.
   *
   * @param fightStats - current fight stats to snapshot
   * @param playerSurvived - true if the player killed the enemy, false if game over
   */
  buildResult(fightStats: FightStats, playerSurvived: boolean): FightResult {
    const statsSnapshot: FightStatsSnapshot = {
      left: {
        ...fightStats.left,
        hitsByResult: { ...fightStats.left.hitsByResult },
        touchGaps: [...fightStats.left.touchGaps],
      },
      right: {
        ...fightStats.right,
        hitsByResult: { ...fightStats.right.hitsByResult },
        touchGaps: [...fightStats.right.touchGaps],
      },
      durationMs: fightStats.durationMs,
    }
    return {
      xpGained: playerSurvived ? 1 : 0,
      statsSnapshot,
      playerSurvived,
    }
  }
}
