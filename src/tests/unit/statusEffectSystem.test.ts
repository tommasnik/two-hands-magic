// ============================================================
// StatusEffectSystem — unit tests
// ============================================================

import { describe, it, expect } from 'vitest'
import { StatusEffectSystem } from '../../game/systems/StatusEffectSystem'
import type { EnemyStateSlice, StatusEffect } from '../../game/skills/types'

function makeEnemy(): EnemyStateSlice {
  return { hp: 30, maxHp: 30, activeStatusEffects: [] }
}

describe('StatusEffectSystem.apply()', () => {
  it('adds a new status effect when none is active', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 2000, frozen: true })
    expect(enemy.activeStatusEffects).toHaveLength(1)
    expect(enemy.activeStatusEffects[0]).toMatchObject({ kind: 'frozen', remainingMs: 2000 })
  })

  it('replaces an existing status of the same kind (reset semantics)', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    // Apply CRIT freeze first
    sys.apply(enemy, { kind: 'frozen', remainingMs: 2000, frozen: true })
    // Then apply HIT freeze — should reset to 1000ms (even though lower)
    sys.apply(enemy, { kind: 'frozen', remainingMs: 1000, frozen: true })
    expect(enemy.activeStatusEffects).toHaveLength(1)
    expect(enemy.activeStatusEffects[0]!.remainingMs).toBe(1000)
  })

  it('does not stack: two applies of same kind = one entry', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 500 })
    sys.apply(enemy, { kind: 'frozen', remainingMs: 800 })
    expect(enemy.activeStatusEffects).toHaveLength(1)
  })

  it('allows multiple different statuses simultaneously', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 2000 })
    sys.apply(enemy, { kind: 'burning', remainingMs: 3000 })
    expect(enemy.activeStatusEffects).toHaveLength(2)
  })

  it('copies the effect (no shared reference)', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    const effect: StatusEffect = { kind: 'frozen', remainingMs: 1000 }
    sys.apply(enemy, effect)
    effect.remainingMs = 999 // mutate original
    expect(enemy.activeStatusEffects[0]!.remainingMs).toBe(1000) // not affected
  })
})

describe('StatusEffectSystem.tick()', () => {
  it('reduces remainingMs by dt', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 2000 })
    sys.tick(500, enemy)
    expect(enemy.activeStatusEffects[0]!.remainingMs).toBe(1500)
  })

  it('removes effect when remainingMs reaches 0', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 500 })
    sys.tick(500, enemy)
    expect(enemy.activeStatusEffects).toHaveLength(0)
  })

  it('removes effect when remainingMs goes below 0', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 300 })
    sys.tick(500, enemy)
    expect(enemy.activeStatusEffects).toHaveLength(0)
  })

  it('removes only expired effects, keeps still-active ones', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 200 })
    sys.apply(enemy, { kind: 'burning', remainingMs: 1000 })
    sys.tick(300, enemy)
    expect(enemy.activeStatusEffects).toHaveLength(1)
    expect(enemy.activeStatusEffects[0]!.kind).toBe('burning')
    expect(enemy.activeStatusEffects[0]!.remainingMs).toBe(700)
  })

  it('no-op when activeStatusEffects is empty', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    expect(() => sys.tick(100, enemy)).not.toThrow()
    expect(enemy.activeStatusEffects).toHaveLength(0)
  })
})

describe('StatusEffectSystem.isActive()', () => {
  it('returns false when no effects are active', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    expect(sys.isActive(enemy, 'frozen')).toBe(false)
  })

  it('returns true when the effect exists and has remainingMs > 0', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 1000 })
    expect(sys.isActive(enemy, 'frozen')).toBe(true)
  })

  it('returns false for a different kind', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 1000 })
    expect(sys.isActive(enemy, 'burning')).toBe(false)
  })

  it('returns false after the effect expires via tick()', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 100 })
    sys.tick(200, enemy)
    expect(sys.isActive(enemy, 'frozen')).toBe(false)
  })
})

describe('StatusEffectSystem — DoT tick mechanics (lightning_arc)', () => {
  it('fires onDotTick callback once after one tick interval', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'lightning_arc', remainingMs: 1000, tickIntervalMs: 200, tickDamage: 5, msSinceLastTick: 0 })
    const ticks: number[] = []
    sys.tick(250, enemy, (e) => { ticks.push(e.tickDamage ?? 0) })
    expect(ticks).toHaveLength(1)
    expect(ticks[0]).toBe(5)
  })

  it('fires two ticks when dt spans two intervals', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'lightning_arc', remainingMs: 1000, tickIntervalMs: 200, tickDamage: 3, msSinceLastTick: 0 })
    const ticks: number[] = []
    sys.tick(450, enemy, (e) => { ticks.push(e.tickDamage ?? 0) })
    expect(ticks).toHaveLength(2)
  })

  it('accumulates msSinceLastTick across multiple small dt calls', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'lightning_arc', remainingMs: 1000, tickIntervalMs: 200, tickDamage: 5, msSinceLastTick: 0 })
    const ticks: number[] = []
    const cb = (e: StatusEffect): void => { ticks.push(e.tickDamage ?? 0) }
    sys.tick(100, enemy, cb)
    expect(ticks).toHaveLength(0)           // 100ms accumulated
    sys.tick(100, enemy, cb)
    expect(ticks).toHaveLength(1)           // 200ms → 1 tick, reset to 0
    sys.tick(100, enemy, cb)
    expect(ticks).toHaveLength(1)           // 100ms since last tick
    sys.tick(100, enemy, cb)
    expect(ticks).toHaveLength(2)           // 200ms → 2nd tick
  })

  it('total damage after N ticks equals N × tickDamage', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    const tickDamage = 3
    const remainingMs = 1000
    const tickIntervalMs = 200
    sys.apply(enemy, { kind: 'lightning_arc', remainingMs, tickIntervalMs, tickDamage, msSinceLastTick: 0 })
    let totalDmg = 0
    sys.tick(remainingMs, enemy, (e) => { totalDmg += e.tickDamage ?? 0 })
    const expectedTicks = Math.floor(remainingMs / tickIntervalMs)
    expect(totalDmg).toBe(expectedTicks * tickDamage)
  })

  it('DoT stops when effect expires (same remainingMs as frozen)', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 500, frozen: true })
    sys.apply(enemy, { kind: 'lightning_arc', remainingMs: 500, tickIntervalMs: 200, tickDamage: 5, msSinceLastTick: 0 })
    const ticks: number[] = []
    const cb = (e: StatusEffect): void => { ticks.push(e.tickDamage ?? 0) }
    // advance past both effects' lifetime
    sys.tick(600, enemy, cb)
    expect(sys.isActive(enemy, 'frozen')).toBe(false)
    expect(sys.isActive(enemy, 'lightning_arc')).toBe(false)
    // ticks fired: floor(500/200) = 2
    expect(ticks).toHaveLength(2)
  })

  it('does not fire onDotTick for effects without tickDamage', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 2000, frozen: true })
    const ticks: number[] = []
    sys.tick(500, enemy, (e) => { ticks.push(e.tickDamage ?? 0) })
    expect(ticks).toHaveLength(0)
  })

  it('no callback call when onDotTick is omitted (plain tick)', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'lightning_arc', remainingMs: 1000, tickIntervalMs: 200, tickDamage: 5, msSinceLastTick: 0 })
    // must not throw when no callback provided
    expect(() => sys.tick(250, enemy)).not.toThrow()
    expect(enemy.activeStatusEffects[0]?.remainingMs).toBe(750)
  })

  it('initialises msSinceLastTick to 0 when omitted on a DoT effect', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    // No msSinceLastTick supplied — system must default it to 0.
    sys.apply(enemy, { kind: 'lightning_arc', remainingMs: 1000, tickIntervalMs: 200, tickDamage: 5 })
    const ticks: number[] = []
    sys.tick(200, enemy, (e) => { ticks.push(e.tickDamage ?? 0) })
    expect(ticks).toHaveLength(1)
  })

  it('does not tick when tickDamage is set but tickIntervalMs is missing', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'lightning_arc', remainingMs: 1000, tickDamage: 5, msSinceLastTick: 0 })
    const ticks: number[] = []
    sys.tick(500, enemy, (e) => { ticks.push(e.tickDamage ?? 0) })
    expect(ticks).toHaveLength(0)
  })
})

describe('StatusEffectSystem — frozen status integration with EnemyBehaviorRunner gate', () => {
  it('frozen effect carries frozen:true flag for runner gate check', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 2000, frozen: true })
    const effect = enemy.activeStatusEffects.find(e => e.kind === 'frozen')
    expect(effect?.frozen).toBe(true)
  })

  it('frozen flag is absent after tick removes the effect', () => {
    const sys = new StatusEffectSystem()
    const enemy = makeEnemy()
    sys.apply(enemy, { kind: 'frozen', remainingMs: 100, frozen: true })
    sys.tick(200, enemy)
    expect(sys.isActive(enemy, 'frozen')).toBe(false)
    expect(enemy.activeStatusEffects).toHaveLength(0)
  })
})
