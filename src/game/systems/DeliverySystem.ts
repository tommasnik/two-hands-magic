// ============================================================
// DeliverySystem — pure TypeScript, no Phaser dependency
// Owns in-flight attack deliveries (orb flight + overlay connect timing).
// Recycles the missile flight-time mechanic from the legacy EnemyAttackSystem.
// Contract: EnemyAttacks.md §4.
// ============================================================

import type { AttackSpec } from '../../types'
import { PIXELS_PER_CM, PROJECTILE_SPEED_CM } from '../constants'

/** 2D point in logical canvas coordinates. Unit: px. */
interface Point {
  x: number
  y: number
}

/**
 * Event emitted when a delivery connects with the player.
 * Consumed by GameStateMachine to apply damage / status effects.
 */
export interface DeliveryHitEvent {
  /** ID of the delivery that connected. */
  deliveryId: string
  /** HP damage dealt on connect. Unit: HP. */
  damage: number
}

/**
 * Serialisable snapshot of one active delivery for the render layer.
 * Carries only data (visualKey + geometry) — never any Phaser detail.
 */
export interface ActiveDelivery {
  /** Unique id of this delivery. */
  id: string
  /** Delivery kind that produced a visual ('effect' deliveries never appear here). */
  kind: 'orb' | 'overlay'
  /** Render-layer lookup key. */
  visualKey: string
  /** Where the delivery originates. For overlay this equals target (it plays on the player). Unit: px. */
  origin: Point
  /** Where the delivery connects (player centre). Unit: px. */
  target: Point
  /** Flight / connect progress in 0..1. 1 = connected. */
  progress: number
}

/** Internal delivery representation — adds timing + liveness to the public snapshot. */
interface InternalDelivery extends ActiveDelivery {
  /** Total time from spawn to connect. Unit: ms. */
  durationMs: number
  /** HP damage applied on connect. Unit: HP. */
  damage: number
  /** Still in flight (removed from the list once it connects). */
  alive: boolean
}

/**
 * Computes flight time in ms for an orb travelling from origin to target.
 * Mirrors EnemyAttackSystem.computeFlightTimeMs (distance / speed).
 */
function computeFlightTimeMs(origin: Point, target: Point, speedCmPerS: number): number {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const distancePx = Math.sqrt(dx * dx + dy * dy)
  return (distancePx / (speedCmPerS * PIXELS_PER_CM)) * 1000
}

/**
 * Manages all in-flight attack deliveries.
 *
 * Deliveries are fire-and-forget: a new attack can be spawned while an older orb
 * is still in flight, and each delivery advances independently of the behaviour
 * graph. The system is fully deterministic — no RNG.
 */
export class DeliverySystem {
  private deliveries: InternalDelivery[] = []
  private nextId = 0

  /**
   * Spawn an in-flight delivery for the given attack spec.
   *
   * - `orb`    — travels from `enemyCentre + castPoint` to `playerCentre` over its
   *              flight time (distance / projectileSpeedCmS); connects at progress ≥ 1.
   * - `overlay`— plays directly on the player and connects after `overlayConnectMs`.
   * - `effect` — no damage, no visual: a hook only (EnemyAttacks.md §7). Spawns nothing.
   *
   * @returns the new delivery's id, or `null` for `effect` (nothing was spawned).
   */
  spawn(spec: AttackSpec, enemyCentre: Point, playerCentre: Point): string | null {
    if (spec.kind === 'effect') return null

    const target: Point = { x: playerCentre.x, y: playerCentre.y }
    let origin: Point
    let durationMs: number

    if (spec.kind === 'orb') {
      const cast = spec.castPoint ?? { dx: 0, dy: 0 }
      origin = { x: enemyCentre.x + cast.dx, y: enemyCentre.y + cast.dy }
      const speed = spec.projectileSpeedCmS ?? PROJECTILE_SPEED_CM
      durationMs = computeFlightTimeMs(origin, target, speed)
    } else {
      // overlay — plays on the player; origin coincides with the target.
      origin = { x: target.x, y: target.y }
      durationMs = spec.overlayConnectMs ?? 0
    }

    const id = String(this.nextId++)
    this.deliveries.push({
      id,
      kind: spec.kind,
      visualKey: spec.visualKey,
      origin,
      target,
      progress: 0,
      durationMs,
      damage: spec.damage,
      alive: true,
    })
    return id
  }

  /**
   * Advance every delivery by dt ms.
   * Orb and overlay share one mechanic: progress grows by dt / durationMs and the
   * delivery connects when progress reaches 1, emitting a DeliveryHitEvent.
   * A non-positive duration connects on the first update.
   */
  update(dt: number): DeliveryHitEvent[] {
    const hits: DeliveryHitEvent[] = []
    for (const d of this.deliveries) {
      if (d.durationMs > 0) {
        d.progress += dt / d.durationMs
      } else {
        d.progress = 1
      }
      if (d.progress >= 1) {
        d.progress = 1
        d.alive = false
        hits.push({ deliveryId: d.id, damage: d.damage })
      }
    }
    this.deliveries = this.deliveries.filter((d) => d.alive)
    return hits
  }

  /**
   * Serialisable snapshot of all active deliveries for the render layer.
   * Omits timing / liveness internals.
   */
  getActive(): ActiveDelivery[] {
    return this.deliveries.map(({ durationMs: _d, damage: _dmg, alive: _a, ...rest }) => ({
      ...rest,
    }))
  }

  /** Clear all deliveries and reset id allocation. */
  reset(): void {
    this.deliveries = []
    this.nextId = 0
  }
}
