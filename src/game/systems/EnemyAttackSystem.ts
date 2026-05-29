// ============================================================
// EnemyAttackSystem — pure TypeScript, no Phaser dependency
// Owns enemy attack cooldowns and in-flight enemy missiles.
// ============================================================

import type { EnemyAttackDef, IncomingMissile } from '../../types'
import { PIXELS_PER_CM } from '../constants'

/** Per-attack runtime state — independent cooldown timer. */
interface AttackState {
  /** Index into the attacks[] array supplied via setAttacks(). */
  defIndex: number
  /** Time remaining until this attack is eligible again. Unit: ms. 0 = ready. */
  cooldownRemainingMs: number
}

/** Internal missile representation (extends the public IncomingMissile with flight timing). */
interface InternalMissile extends IncomingMissile {
  /** Total flight time in ms (distance / speed). Unit: ms. */
  flightTimeMs: number
}

/**
 * Event emitted when a missile lands on the player.
 * Consumed by GameStateMachine to apply damage and update lastPlayerHit.
 */
export interface MissileHitEvent {
  /** ID of the missile that hit. */
  missileId: string
  /** HP damage dealt. */
  damage: number
}

/**
 * Computes flight time in ms for a missile travelling from origin to target.
 * Mirrors ProjectileSystem.computeFlightTimeMs but stays local to avoid coupling.
 */
function computeFlightTimeMs(
  origin: { x: number; y: number },
  target: { x: number; y: number },
  speedCmPerS: number,
): number {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const distancePx = Math.sqrt(dx * dx + dy * dy)
  return (distancePx / (speedCmPerS * PIXELS_PER_CM)) * 1000
}

/**
 * Manages enemy attack cooldowns, fires missiles when ready, and advances them in flight.
 * RNG is injectable for deterministic tests (defaults to Math.random).
 */
export class EnemyAttackSystem {
  private attacks: readonly EnemyAttackDef[] = []
  private states: AttackState[] = []
  private missiles: InternalMissile[] = []
  private nextId = 0
  private rng: () => number

  constructor(rng: () => number = Math.random) {
    this.rng = rng
  }

  /**
   * Configure the attack set for the current encounter.
   * Resets every cooldown to its full duration so the player gets a grace window
   * at the start of each level before the first missile.
   */
  setAttacks(attacks: readonly EnemyAttackDef[] | undefined): void {
    this.attacks = attacks ?? []
    this.states = this.attacks.map((def, defIndex) => ({
      defIndex,
      cooldownRemainingMs: def.cooldownMs,
    }))
    this.missiles = []
  }

  /** Replace the RNG. Used by tests to make the weighted selection deterministic. */
  setRng(rng: () => number): void {
    this.rng = rng
  }

  /** Clear all missiles and reset cooldowns to their full duration. */
  reset(): void {
    this.states = this.attacks.map((def, defIndex) => ({
      defIndex,
      cooldownRemainingMs: def.cooldownMs,
    }))
    this.missiles = []
    this.nextId = 0
  }

  /**
   * Advance the system by dt ms.
   * 1. Decrement every cooldown.
   * 2. If any attack is ready, weighted-random-pick one and fire its missile from
   *    enemyCentre + castPoint toward playerCentre. Reset that attack's cooldown.
   *    Only one missile is dispatched per tick — the others remain ready for next tick.
   * 3. Advance every missile; emit a MissileHitEvent for any that reaches its target.
   */
  update(
    dt: number,
    enemyCentre: { x: number; y: number },
    playerCentre: { x: number; y: number },
    isStunned = false,
  ): MissileHitEvent[] {
    // 1. Decrement cooldowns — paused entirely while stunned, otherwise stuns
    //    that wrap around multiple cooldowns would drain them all to 0 and the
    //    moment stun ended the enemy would burst-fire one attack per tick.
    //    Pausing means each attack is delayed by exactly the stun duration.
    if (!isStunned) {
      for (const s of this.states) {
        s.cooldownRemainingMs = Math.max(0, s.cooldownRemainingMs - dt)
      }
    }

    // 2. Pick one ready attack (if any) and fire — skipped entirely while stunned.
    const ready = isStunned ? [] : this.states.filter((s) => s.cooldownRemainingMs <= 0)
    if (ready.length > 0) {
      const picked = this._pickWeighted(ready)
      const def = this.attacks[picked.defIndex]
      const origin = { x: enemyCentre.x + def.castPoint.dx, y: enemyCentre.y + def.castPoint.dy }
      const target = { x: playerCentre.x, y: playerCentre.y }
      const flightTimeMs = computeFlightTimeMs(origin, target, def.projectileSpeedCmS)
      this.missiles.push({
        id: String(this.nextId++),
        origin,
        target,
        damage: def.damage,
        color: def.projectileColor,
        progress: 0,
        alive: true,
        flightTimeMs,
      })
      picked.cooldownRemainingMs = def.cooldownMs
    }

    // 3. Advance missiles (this.missiles only ever contains alive missiles —
    //    dead ones are removed at the end of each update()).
    const hits: MissileHitEvent[] = []
    for (const m of this.missiles) {
      m.progress += dt / m.flightTimeMs
      if (m.progress >= 1) {
        m.progress = 1
        m.alive = false
        hits.push({ missileId: m.id, damage: m.damage })
      }
    }
    this.missiles = this.missiles.filter((m) => m.alive)
    return hits
  }

  /**
   * Returns a serialisable snapshot of all in-flight missiles for rendering / state.
   * Omits flightTimeMs from the public shape.
   */
  getMissiles(): IncomingMissile[] {
    return this.missiles.map(({ flightTimeMs: _ft, ...m }) => ({ ...m }))
  }

  /**
   * Returns the cooldown remaining (ms) for each attack, in original def order.
   * Exposed for unit tests and the test bridge.
   */
  getCooldowns(): number[] {
    const out: number[] = new Array(this.attacks.length).fill(0)
    for (const s of this.states) {
      out[s.defIndex] = s.cooldownRemainingMs
    }
    return out
  }

  /**
   * Weighted random pick over the ready states.
   * For 1 ready state this is the identity. For N, picks by normalised weight using rng().
   * The last element is returned for rng() values that fall in the final segment,
   * which doubles as a safe fallback for rng() == 1 or float-summation drift.
   */
  private _pickWeighted(ready: AttackState[]): AttackState {
    if (ready.length === 1) return ready[0]
    let total = 0
    for (const s of ready) total += this.attacks[s.defIndex].weight
    let pick = this.rng() * total
    for (let i = 0; i < ready.length - 1; i++) {
      const w = this.attacks[ready[i].defIndex].weight
      if (pick < w) return ready[i]
      pick -= w
    }
    return ready[ready.length - 1]
  }
}
