// ============================================================
// ProjectileSystem — pure TypeScript, no Phaser dependency
// Manages projectile lifecycle: fire, update, hit detection.
// ============================================================

import type { SkillType, HitResult } from '../../types'
import { Enemy } from '../entities/Enemy'
import {
  PROJECTILE_SPEED_CM,
  FIREBALL_SPEED_CM,
  PIXELS_PER_CM,
  PROJECTILE_BASE_RADIUS_PX,
  ICE_CRYSTAL_SPEED_CM,
} from '../constants'

/** white_shot travels at base projectile speed — fast to match its quick DPS role. */
const WHITE_SHOT_SPEED_CM = PROJECTILE_SPEED_CM

/**
 * Event emitted when a projectile reaches its target.
 * Carries the hit result from Enemy.getHitResult().
 */
export interface ProjectileHitEvent {
  /** ID of the projectile that hit. */
  projectileId: string
  /** Hit result from enemy collision check. */
  result: HitResult
  /** Skill type that fired this projectile — needed for damage calculation. */
  skillType: SkillType
  /** World position where the projectile landed. Unit: px. */
  position: { x: number; y: number }
  /**
   * Quick-chain damage bonus baked in at fire time (0 = no chain).
   * Forwarded to DamageSystem.calculateDamage as opts.chainBonus.
   */
  chainBonus: number
  /**
   * Effective projectile radius baked in at fire time (post spell-area scaling).
   * Forwarded so downstream consumers (e.g. zone visualisation) can re-derive
   * the same hit geometry the system used. Unit: px.
   */
  projectileRadius: number
  /**
   * Which screen side fired this projectile.
   * Baked at fire time so GameStateMachine can route hit stats to the correct
   * SkillFightStats entry without keeping a projectile-id→side map.
   */
  side: 'left' | 'right'
}

/**
 * Internal projectile state — extends the public Projectile interface
 * with flight-time data needed for update math.
 */
interface InternalProjectile {
  id: string
  origin: { x: number; y: number }
  target: { x: number; y: number }
  skillType: SkillType
  progress: number
  alive: boolean
  /** Total flight time in ms (distance / speed). Unit: ms. */
  flightTimeMs: number
  /** Quick-chain damage bonus baked in at fire time (0 = no chain). */
  chainBonus: number
  /**
   * Projectile radius baked in at fire time. Hit detection uses
   * `distToZoneCentre <= zoneRadius + projectileRadius`. Unit: px.
   */
  projectileRadius: number
  /** Which screen side fired this projectile. Baked at fire time. */
  side: 'left' | 'right'
}

/**
 * Optional upgrade-driven modifiers applied at fire time.
 * Both default to 1.0 (no effect) so legacy callers that don't pass upgrades
 * keep the original point-vs-zone behaviour with base speed.
 */
export interface FireUpgradeMods {
  /** Multiplier applied to the skill's base speed. Unit: dimensionless. */
  projectileSpeedMultiplier?: number
  /** Multiplier applied to PROJECTILE_BASE_RADIUS_PX. Unit: dimensionless. */
  spellAreaMultiplier?: number
}

/**
 * Returns the speed in cm/s for the given skill type.
 * Extensible: add new skill cases here without changing update logic.
 */
function speedForSkill(skillType: SkillType): number {
  switch (skillType) {
    case 'slow_shot':
    case 'fireball':
      return FIREBALL_SPEED_CM
    case 'fast_shot':
      return PROJECTILE_SPEED_CM
    case 'white_shot':
      return WHITE_SHOT_SPEED_CM
    case 'ice_crystal':
      return ICE_CRYSTAL_SPEED_CM
    case 'lightning_blast':
      return PROJECTILE_SPEED_CM
  }
}

/**
 * Computes flight time in ms for a projectile travelling from origin to target.
 */
function computeFlightTimeMs(
  origin: { x: number; y: number },
  target: { x: number; y: number },
  speedCmPerS: number,
): number {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const distancePx = Math.sqrt(dx * dx + dy * dy)
  // Convert px → cm, then divide by speed (cm/s) to get seconds, × 1000 for ms
  return (distancePx / (speedCmPerS * PIXELS_PER_CM)) * 1000
}

/**
 * Manages all in-flight projectiles.
 * Pure logic — does not depend on Phaser.
 */
export class ProjectileSystem {
  private projectiles: InternalProjectile[] = []
  private nextId = 0

  /**
   * Fires a new projectile from `origin` toward `target` with the given skill type.
   * The projectile is added to the internal queue immediately.
   *
   * `mods.projectileSpeedMultiplier` scales the skill's base speed (higher = shorter
   * flight time). `mods.spellAreaMultiplier` scales PROJECTILE_BASE_RADIUS_PX — the
   * effective disc used for hit detection. Both default to 1.0.
   */
  fire(
    origin: { x: number; y: number },
    target: { x: number; y: number },
    skillType: SkillType,
    chainBonus = 0,
    mods: FireUpgradeMods = {},
    side: 'left' | 'right' = 'left',
  ): void {
    // Clamp multipliers to keep hit detection well-defined. A zero or negative
    // projectileSpeedMultiplier would yield Infinity / negative flight time and
    // freeze projectiles in the queue (no hit event, no GC) — clamp to a small
    // positive floor so the projectile still resolves in bounded time. A
    // negative spellAreaMultiplier would silently mimic a positive radius via
    // r*r in hit detection, hiding the bug — clamp to 0 (point projectile).
    const MIN_SPEED_MUL = 0.01
    const speedMul = Math.max(MIN_SPEED_MUL, mods.projectileSpeedMultiplier ?? 1)
    const areaMul = Math.max(0, mods.spellAreaMultiplier ?? 1)
    const speed = speedForSkill(skillType) * speedMul
    const flightTimeMs = computeFlightTimeMs(origin, target, speed)
    const projectileRadius = PROJECTILE_BASE_RADIUS_PX * areaMul
    this.projectiles.push({
      id: String(this.nextId++),
      origin: { ...origin },
      target: { ...target },
      skillType,
      progress: 0,
      alive: true,
      flightTimeMs,
      chainBonus,
      projectileRadius,
      side,
    })
  }

  /**
   * Advances all living projectiles by `dt` milliseconds.
   * When a projectile reaches progress >= 1 it is checked against `enemy`
   * and a ProjectileHitEvent is emitted. Each projectile is treated as a disc
   * of its baked-in `projectileRadius` (set at fire time via spellAreaMultiplier).
   *
   * Dead projectiles are removed at the end of each update.
   *
   * @returns List of hit events that occurred during this update step.
   */
  update(dt: number, enemy: Enemy, critZoneTolerance = 0): ProjectileHitEvent[] {
    const hits: ProjectileHitEvent[] = []

    for (const p of this.projectiles) {
      if (!p.alive) continue

      p.progress += dt / p.flightTimeMs

      if (p.progress >= 1) {
        p.progress = 1
        p.alive = false

        const result = enemy.getHitResult(p.target, critZoneTolerance, p.projectileRadius)
        hits.push({
          projectileId: p.id,
          result,
          skillType: p.skillType,
          position: { ...p.target },
          chainBonus: p.chainBonus,
          projectileRadius: p.projectileRadius,
          side: p.side,
        })
      }
    }

    // Remove dead projectiles
    this.projectiles = this.projectiles.filter((p) => p.alive)

    return hits
  }

  /**
   * Returns a snapshot of all living projectiles for rendering / state inspection.
   * Each entry is a defensive copy — top-level fields AND the nested origin/target
   * objects are cloned so consumers cannot mutate the system's internal state.
   */
  getProjectiles(): Omit<InternalProjectile, 'flightTimeMs'>[] {
    return this.projectiles.map(({ flightTimeMs: _ft, origin, target, ...p }) => ({
      ...p,
      origin: { ...origin },
      target: { ...target },
    }))
  }

  /**
   * Clears all projectiles and resets the ID counter.
   * Call on game reset / phase transitions.
   */
  reset(): void {
    this.projectiles = []
    this.nextId = 0
  }
}
