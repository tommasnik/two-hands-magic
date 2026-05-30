import { describe, it, expect } from 'vitest'
import { EnemyAttackSystem } from '../../game/systems/EnemyAttackSystem'
import type { EnemyAttackDef } from '../../game/systems/EnemyAttackSystem'

const enemyAt = { x: 100, y: 100 }
const playerAt = { x: 100, y: 700 }

function makeAttack(overrides: Partial<EnemyAttackDef> = {}): EnemyAttackDef {
  return {
    name: 'test',
    damage: 5,
    cooldownMs: 1000,
    weight: 1,
    projectileColor: '#ff0000',
    projectileSpeedCmS: 50,
    castPoint: { dx: 0, dy: 0 },
    ...overrides,
  }
}

describe('EnemyAttackSystem — setAttacks / reset', () => {
  it('starts with no attacks; update is a no-op', () => {
    const sys = new EnemyAttackSystem()
    expect(sys.update(100, enemyAt, playerAt)).toEqual([])
    expect(sys.getMissiles()).toEqual([])
  })

  it('setAttacks initialises cooldowns to full duration', () => {
    const sys = new EnemyAttackSystem()
    const a = makeAttack({ cooldownMs: 2000 })
    sys.setAttacks([a])
    expect(sys.getCooldowns()).toEqual([2000])
  })

  it('setAttacks(undefined) clears state', () => {
    const sys = new EnemyAttackSystem()
    sys.setAttacks([makeAttack()])
    sys.setAttacks(undefined)
    expect(sys.getCooldowns()).toEqual([])
    expect(sys.update(10_000, enemyAt, playerAt)).toEqual([])
  })

  it('reset re-initialises cooldowns to full and clears missiles', () => {
    const sys = new EnemyAttackSystem()
    // Slow projectile so the missile remains alive across update() calls.
    sys.setAttacks([makeAttack({ cooldownMs: 500, projectileSpeedCmS: 5 })])
    sys.update(500, enemyAt, playerAt) // fires a missile; cooldown resets to 500
    sys.update(50, enemyAt, playerAt)  // burn 50 ms of the new cooldown
    expect(sys.getCooldowns()[0]).toBeLessThan(500)
    expect(sys.getMissiles().length).toBeGreaterThan(0)
    sys.reset()
    expect(sys.getCooldowns()).toEqual([500])
    expect(sys.getMissiles()).toEqual([])
  })
})

describe('EnemyAttackSystem — single attack lifecycle', () => {
  it('does not fire before the first cooldown elapses', () => {
    const sys = new EnemyAttackSystem()
    sys.setAttacks([makeAttack({ cooldownMs: 1000 })])
    sys.update(500, enemyAt, playerAt)
    expect(sys.getMissiles()).toEqual([])
  })

  it('fires a missile once the cooldown reaches zero', () => {
    const sys = new EnemyAttackSystem()
    // Slow projectile so the spawned missile is still in flight after the firing tick.
    sys.setAttacks([makeAttack({ cooldownMs: 1000, projectileColor: '#abcdef', projectileSpeedCmS: 1 })])
    sys.update(1000, enemyAt, playerAt)
    const missiles = sys.getMissiles()
    expect(missiles).toHaveLength(1)
    expect(missiles[0].color).toBe('#abcdef')
    expect(missiles[0].damage).toBe(5)
    expect(missiles[0].target).toEqual(playerAt)
  })

  it('respects castPoint when computing missile origin', () => {
    const sys = new EnemyAttackSystem()
    sys.setAttacks([makeAttack({ cooldownMs: 100, castPoint: { dx: 10, dy: -20 } })])
    sys.update(100, enemyAt, playerAt)
    expect(sys.getMissiles()[0].origin).toEqual({ x: 110, y: 80 })
  })

  it('emits a hit event when the missile finishes its flight', () => {
    const sys = new EnemyAttackSystem()
    sys.setAttacks([makeAttack({ cooldownMs: 100, projectileSpeedCmS: 1000, damage: 7 })])
    // Run small ticks for plenty of time; collect every hit event emitted.
    let totalHits: number[] = []
    for (let i = 0; i < 100; i++) {
      const events = sys.update(20, enemyAt, playerAt)
      totalHits = totalHits.concat(events.map((e) => e.damage))
      if (totalHits.length > 0) break
    }
    expect(totalHits).toContain(7)
  })

  it('resets the firing attack cooldown after dispatch', () => {
    const sys = new EnemyAttackSystem()
    sys.setAttacks([makeAttack({ cooldownMs: 800 })])
    sys.update(800, enemyAt, playerAt)
    expect(sys.getCooldowns()[0]).toBe(800)
  })
})

describe('EnemyAttackSystem — weighted random selection across multiple attacks', () => {
  it('with deterministic rng returning 0, picks the first ready attack', () => {
    const sys = new EnemyAttackSystem(() => 0)
    sys.setAttacks([
      makeAttack({ name: 'A', cooldownMs: 100, weight: 1 }),
      makeAttack({ name: 'B', cooldownMs: 100, weight: 3 }),
    ])
    sys.update(100, enemyAt, playerAt) // both ready, rng=0 picks first
    // The first attack fires — its cooldown resets to its full duration; B remains ready.
    const cds = sys.getCooldowns()
    expect(cds[0]).toBe(100)
    expect(cds[1]).toBeLessThanOrEqual(0)
  })

  it('rng near 1.0 picks the heavier-weighted attack at the end', () => {
    const sys = new EnemyAttackSystem(() => 0.99)
    sys.setAttacks([
      makeAttack({ name: 'A', cooldownMs: 100, weight: 1 }),
      makeAttack({ name: 'B', cooldownMs: 100, weight: 3 }),
    ])
    sys.update(100, enemyAt, playerAt)
    const cds = sys.getCooldowns()
    expect(cds[1]).toBe(100)
    expect(cds[0]).toBeLessThanOrEqual(0)
  })

  it('only one attack fires per tick even when multiple are ready', () => {
    const sys = new EnemyAttackSystem(() => 0)
    sys.setAttacks([
      makeAttack({ cooldownMs: 100 }),
      makeAttack({ cooldownMs: 100 }),
      makeAttack({ cooldownMs: 100 }),
    ])
    sys.update(200, enemyAt, playerAt)
    expect(sys.getMissiles()).toHaveLength(1)
  })

  it('setRng swaps the picker mid-flight', () => {
    const sys = new EnemyAttackSystem(() => 0)
    sys.setAttacks([
      makeAttack({ name: 'A', cooldownMs: 100, weight: 1 }),
      makeAttack({ name: 'B', cooldownMs: 100, weight: 1 }),
    ])
    sys.setRng(() => 0.99)
    sys.update(100, enemyAt, playerAt)
    const cds = sys.getCooldowns()
    expect(cds[1]).toBe(100) // second one fired
  })
})

