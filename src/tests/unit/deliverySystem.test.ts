import { describe, it, expect } from 'vitest'
import { DeliverySystem } from '../../game/systems/DeliverySystem'
import type { ActiveDelivery } from '../../game/systems/DeliverySystem'
import type { AttackSpec } from '../../types'
import { PIXELS_PER_CM, PROJECTILE_SPEED_CM } from '../../game/constants'

const enemyAt = { x: 100, y: 100 }
const playerAt = { x: 100, y: 700 }

function orbSpec(overrides: Partial<AttackSpec> = {}): AttackSpec {
  return {
    damage: 5,
    releaseFrame: 0,
    kind: 'orb',
    visualKey: 'orb_fire',
    projectileSpeedCmS: 50,
    castPoint: { dx: 0, dy: 0 },
    ...overrides,
  }
}

function overlaySpec(overrides: Partial<AttackSpec> = {}): AttackSpec {
  return {
    damage: 8,
    releaseFrame: 0,
    kind: 'overlay',
    visualKey: 'teeth_snap',
    overlayConnectMs: 300,
    ...overrides,
  }
}

/** Expected orb flight time in ms for the default orb spec (enemyAt → playerAt). */
function expectedOrbFlightMs(speedCmS: number, from = enemyAt, to = playerAt): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distancePx = Math.sqrt(dx * dx + dy * dy)
  return (distancePx / (speedCmS * PIXELS_PER_CM)) * 1000
}

describe('DeliverySystem — spawn / reset basics', () => {
  it('starts empty; update is a no-op', () => {
    const sys = new DeliverySystem()
    expect(sys.update(100)).toEqual([])
    expect(sys.getActive()).toEqual([])
  })

  it('reset clears active deliveries and restarts id allocation', () => {
    const sys = new DeliverySystem()
    const firstId = sys.spawn(orbSpec(), enemyAt, playerAt)
    expect(firstId).toBe('0')
    expect(sys.getActive()).toHaveLength(1)

    sys.reset()
    expect(sys.getActive()).toEqual([])
    // ids restart from 0 after reset
    expect(sys.spawn(orbSpec(), enemyAt, playerAt)).toBe('0')
  })

  it('effect deliveries spawn nothing and return null (hook only)', () => {
    const sys = new DeliverySystem()
    const id = sys.spawn(orbSpec({ kind: 'effect', damage: 0 }), enemyAt, playerAt)
    expect(id).toBeNull()
    expect(sys.getActive()).toEqual([])
    expect(sys.update(1000)).toEqual([])
  })
})

describe('DeliverySystem — orb flight + connect (AC#2)', () => {
  it('progress grows by flight-time (distance / speed) and connects at progress >= 1', () => {
    const sys = new DeliverySystem()
    const spec = orbSpec({ damage: 7, projectileSpeedCmS: 50 })
    const id = sys.spawn(spec, enemyAt, playerAt)
    const flightMs = expectedOrbFlightMs(50)

    // Advance half the flight time — orb is mid-flight, no hit yet.
    expect(sys.update(flightMs / 2)).toEqual([])
    expect(sys.getActive()[0].progress).toBeCloseTo(0.5, 5)

    // Advance the remaining half — connects with the spec damage.
    const hits = sys.update(flightMs / 2)
    expect(hits).toEqual([{ deliveryId: id, damage: 7 }])
    // connected delivery is removed
    expect(sys.getActive()).toEqual([])
  })

  it('faster orb connects sooner than a slower one (flight time scales with speed)', () => {
    const fast = new DeliverySystem()
    const slow = new DeliverySystem()
    fast.spawn(orbSpec({ projectileSpeedCmS: 100 }), enemyAt, playerAt)
    slow.spawn(orbSpec({ projectileSpeedCmS: 50 }), enemyAt, playerAt)

    const step = expectedOrbFlightMs(100)
    // After the fast orb's full flight time it connects; the slow one (2x time) does not.
    expect(fast.update(step)).toHaveLength(1)
    expect(slow.update(step)).toHaveLength(0)
  })

  it('orb origin = enemyCentre + castPoint; target = player centre', () => {
    const sys = new DeliverySystem()
    sys.spawn(orbSpec({ castPoint: { dx: 10, dy: -20 } }), enemyAt, playerAt)
    const active = sys.getActive()[0]
    expect(active.origin).toEqual({ x: enemyAt.x + 10, y: enemyAt.y - 20 })
    expect(active.target).toEqual(playerAt)
    expect(active.kind).toBe('orb')
  })

  it('orb without explicit speed falls back to PROJECTILE_SPEED_CM', () => {
    const sys = new DeliverySystem()
    sys.spawn(orbSpec({ projectileSpeedCmS: undefined }), enemyAt, playerAt)
    const flightMs = expectedOrbFlightMs(PROJECTILE_SPEED_CM)
    // Just short of the default flight time → not connected yet.
    expect(sys.update(flightMs - 1)).toEqual([])
    // Crossing it connects.
    expect(sys.update(2)).toHaveLength(1)
  })

  it('orb without explicit castPoint originates at the enemy centre', () => {
    const sys = new DeliverySystem()
    sys.spawn(orbSpec({ castPoint: undefined }), enemyAt, playerAt)
    expect(sys.getActive()[0].origin).toEqual(enemyAt)
  })

  it('progress is clamped to 1 on connect even when overshooting', () => {
    const sys = new DeliverySystem()
    const spec = orbSpec()
    sys.spawn(spec, enemyAt, playerAt)
    // Overshoot the whole flight time massively.
    const hits = sys.update(expectedOrbFlightMs(50) * 10)
    expect(hits).toHaveLength(1)
    // delivery removed after connecting (no lingering progress > 1)
    expect(sys.getActive()).toEqual([])
  })
})

describe('DeliverySystem — overlay connect timing (AC#3)', () => {
  it('connects at overlayConnectMs from spawn, not on a sprite frame', () => {
    const sys = new DeliverySystem()
    const id = sys.spawn(overlaySpec({ damage: 8, overlayConnectMs: 300 }), enemyAt, playerAt)

    // Before the connect window — still pending.
    expect(sys.update(200)).toEqual([])
    expect(sys.getActive()[0].progress).toBeCloseTo(200 / 300, 5)

    // Crossing overlayConnectMs connects with the spec damage.
    const hits = sys.update(100)
    expect(hits).toEqual([{ deliveryId: id, damage: 8 }])
    expect(sys.getActive()).toEqual([])
  })

  it('overlay plays on the player: origin coincides with target', () => {
    const sys = new DeliverySystem()
    sys.spawn(overlaySpec(), enemyAt, playerAt)
    const active = sys.getActive()[0]
    expect(active.origin).toEqual(playerAt)
    expect(active.target).toEqual(playerAt)
    expect(active.kind).toBe('overlay')
  })

  it('overlay without overlayConnectMs connects on the first update', () => {
    const sys = new DeliverySystem()
    const id = sys.spawn(overlaySpec({ overlayConnectMs: undefined, damage: 3 }), enemyAt, playerAt)
    const hits = sys.update(16)
    expect(hits).toEqual([{ deliveryId: id, damage: 3 }])
  })

  it('zero-duration overlay connects even on a zero-dt update', () => {
    const sys = new DeliverySystem()
    sys.spawn(overlaySpec({ overlayConnectMs: 0 }), enemyAt, playerAt)
    expect(sys.update(0)).toHaveLength(1)
  })
})

describe('DeliverySystem — fire-and-forget concurrency (AC#4)', () => {
  it('multiple deliveries advance independently and connect on their own schedule', () => {
    const sys = new DeliverySystem()
    const orbFlight = expectedOrbFlightMs(50)
    const orbId = sys.spawn(orbSpec({ damage: 5, projectileSpeedCmS: 50 }), enemyAt, playerAt)
    const overlayId = sys.spawn(overlaySpec({ damage: 9, overlayConnectMs: orbFlight * 2 }), enemyAt, playerAt)

    expect(sys.getActive()).toHaveLength(2)

    // After the orb's flight time only the orb connects; the overlay is still pending.
    const firstHits = sys.update(orbFlight)
    expect(firstHits).toEqual([{ deliveryId: orbId, damage: 5 }])
    expect(sys.getActive()).toHaveLength(1)
    expect(sys.getActive()[0].id).toBe(overlayId)

    // After the rest of the overlay window the overlay connects.
    const secondHits = sys.update(orbFlight)
    expect(secondHits).toEqual([{ deliveryId: overlayId, damage: 9 }])
    expect(sys.getActive()).toEqual([])
  })

  it('a new delivery can be spawned while an older one is still in flight', () => {
    const sys = new DeliverySystem()
    sys.spawn(orbSpec({ projectileSpeedCmS: 50 }), enemyAt, playerAt)
    sys.update(10)
    // older orb mid-flight; spawn a second
    const secondId = sys.spawn(orbSpec({ projectileSpeedCmS: 50 }), enemyAt, playerAt)
    expect(secondId).toBe('1')
    expect(sys.getActive()).toHaveLength(2)
  })

  it('two deliveries connecting in the same tick emit both hits', () => {
    const sys = new DeliverySystem()
    sys.spawn(overlaySpec({ damage: 1, overlayConnectMs: 100 }), enemyAt, playerAt)
    sys.spawn(overlaySpec({ damage: 2, overlayConnectMs: 100 }), enemyAt, playerAt)
    const hits = sys.update(100)
    expect(hits).toHaveLength(2)
    expect(hits.map((h) => h.damage).sort()).toEqual([1, 2])
  })
})

describe('DeliverySystem — getActive snapshot (AC#5)', () => {
  it('exposes a serialisable snapshot with visualKey, kind, origin/target/progress', () => {
    const sys = new DeliverySystem()
    sys.spawn(orbSpec({ visualKey: 'orb_ice', castPoint: { dx: 0, dy: 0 } }), enemyAt, playerAt)
    sys.update(expectedOrbFlightMs(50) / 4)

    const active: ActiveDelivery[] = sys.getActive()
    expect(active).toHaveLength(1)
    const d = active[0]
    expect(d).toEqual({
      id: '0',
      kind: 'orb',
      visualKey: 'orb_ice',
      origin: enemyAt,
      target: playerAt,
      progress: expect.closeTo(0.25, 5),
    })

    // snapshot must be JSON-serialisable (no functions / class internals leaking)
    expect(() => JSON.stringify(active)).not.toThrow()
    expect(JSON.parse(JSON.stringify(active))).toEqual(active)
  })

  it('does not leak timing / liveness internals (durationMs, damage, alive)', () => {
    const sys = new DeliverySystem()
    sys.spawn(orbSpec(), enemyAt, playerAt)
    const d = sys.getActive()[0] as unknown as Record<string, unknown>
    expect(d).not.toHaveProperty('durationMs')
    expect(d).not.toHaveProperty('damage')
    expect(d).not.toHaveProperty('alive')
  })
})
