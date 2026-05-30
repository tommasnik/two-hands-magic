// ============================================================
// SkillModule — self-contained skill definition (OCP-compliant)
// Each skill registers one SkillModule. Systems read from the registry
// instead of using switch/case on SkillType.
// ============================================================

import type { SkillType, HitResult } from '../../types'

// ============================================================
// Status effects (placeholder for TASK-64 StatusEffectSystem)
// ============================================================

/**
 * A status effect that can be applied to an enemy.
 * The kinds listed here are planned; only 'frozen' is driven by game logic today.
 * TASK-64 will replace the no-op StatusApplier stub with the real StatusEffectSystem.
 */
export interface StatusEffect {
  /** Which status to apply. */
  kind: 'frozen' | 'burning' | 'shocked'
  /** How long the status lasts. Unit: ms. */
  remainingMs: number
}

/**
 * Callback that applies a status effect to the current enemy.
 * Provided by the caller (GameStateMachine) — skills never call the system directly.
 * In TASK-63: GameStateMachine passes a no-op stub: (_effect) => {}
 * In TASK-64: replaced by StatusEffectSystem.apply()
 */
export type StatusApplier = (effect: StatusEffect) => void

// ============================================================
// Interaction rules (data; execution planned for TASK-64+)
// ============================================================

/**
 * Declarative rule describing a skill interaction with an enemy status.
 * Rules are data — no switch/case per skill in any system.
 * InteractionSystem (TASK-64) will evaluate these at hit time.
 */
export interface InteractionRule {
  /** Enemy must have this status for the rule to trigger. */
  whenEnemyHas: string
  /** Optional damage multiplier override (e.g. 2.0 = double damage). */
  damageMultiplier?: number
  /** Optional additional status applied on interaction trigger. */
  additionalStatus?: StatusEffect
  /** Optional visual key override for the hit effect. */
  visualKey?: string
}

// ============================================================
// EnemyState subset needed by onHit callbacks
// (avoids a circular dependency on the full GameState type)
// ============================================================

/**
 * Minimal enemy state slice exposed to onHit callbacks.
 * Extended in TASK-64 when StatusEffectState is added to EnemyState.
 */
export interface EnemyStateSlice {
  /** Current enemy HP. Unit: HP. */
  hp: number
  /** Maximum enemy HP. Unit: HP. */
  maxHp: number
}

// ============================================================
// SkillModule interface
// ============================================================

/**
 * Self-contained definition of one skill.
 * Adding a new skill = implement this interface + call registerSkill().
 * Zero changes in DamageSystem, GameStateMachine, or ProjectileSystem.
 */
export interface SkillModule {
  /** Canonical skill type — must match the SkillType union. */
  type: SkillType

  /** Minimum base damage before hit-result multipliers. Unit: HP. */
  damageMin: number

  /** Maximum base damage before hit-result multipliers. Unit: HP. */
  damageMax: number

  /**
   * Graze damage multiplier override.
   * Most skills use GRAZE_DAMAGE_MULTIPLIER; some (fireball, white_shot) use
   * NEW_SKILL_GREEN_ZONE_MULTIPLIER (0.5) to reduce limb-zone damage.
   * Unit: dimensionless.
   */
  grazeMultiplier: number

  /**
   * Base projectile travel speed. Unit: cm/s.
   * ProjectileSystem reads this instead of using a switch/case.
   */
  projectileSpeedCm: number

  /**
   * Laser rotation period for this skill. Unit: ms.
   * Exposed here so future consumers (SlotRenderer, AimSystem hints) can read
   * it from the registry without touching constants directly.
   */
  castTimePeriodMs: number

  /**
   * Visual key for the projectile renderer.
   * ProjectileSystem / BattleScene reads this key to select the correct sprite/shader.
   */
  visualKey: string

  /**
   * Optional post-hit callback.
   * Called by GameStateMachine._applyHit() after damage is dealt, only when
   * the enemy survived (hp > 0). Allows skill-specific status effects without
   * any if/else branching in the caller.
   *
   * @param enemy       - minimal slice of the current EnemyState
   * @param hit         - hit result (CRIT / HIT / GRAZE / MISS)
   * @param applyStatus - inject a status onto the enemy; no-op in TASK-63
   */
  onHit?: (enemy: EnemyStateSlice, hit: HitResult, applyStatus: StatusApplier) => void

  /**
   * Declarative interaction rules for this skill.
   * Read by InteractionSystem (TASK-64). Empty array = no interactions.
   */
  interactions?: InteractionRule[]
}
