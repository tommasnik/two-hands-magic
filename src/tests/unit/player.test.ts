import { describe, it, expect } from 'vitest'
import { Player } from '../../game/entities/Player'
import { PLAYER_MAX_HP } from '../../game/constants'

describe('Player entity', () => {
  it('constructs at full HP', () => {
    const p = new Player(PLAYER_MAX_HP)
    expect(p.hp).toBe(PLAYER_MAX_HP)
    expect(p.maxHp).toBe(PLAYER_MAX_HP)
    expect(p.isDead()).toBe(false)
  })

  it('takeDamage subtracts and clamps at 0', () => {
    const p = new Player(PLAYER_MAX_HP)
    expect(p.takeDamage(5)).toBe(PLAYER_MAX_HP - 5)
    expect(p.takeDamage(PLAYER_MAX_HP)).toBe(0)
    expect(p.isDead()).toBe(true)
  })

  it('reset restores HP to max', () => {
    const p = new Player(PLAYER_MAX_HP)
    p.takeDamage(PLAYER_MAX_HP)
    expect(p.isDead()).toBe(true)
    p.reset()
    expect(p.hp).toBe(PLAYER_MAX_HP)
    expect(p.isDead()).toBe(false)
  })

  it('isDead returns true at exactly 0 HP', () => {
    const p = new Player(10)
    p.takeDamage(10)
    expect(p.hp).toBe(0)
    expect(p.isDead()).toBe(true)
  })

  it('takeDamage handles overkill without going negative', () => {
    const p = new Player(10)
    expect(p.takeDamage(999)).toBe(0)
    expect(p.hp).toBe(0)
  })
})
