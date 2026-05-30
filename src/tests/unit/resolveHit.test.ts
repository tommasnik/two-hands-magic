// ============================================================
// resolveHit — unit tests
// AC #5: no switch/case or SkillType condition in resolveHit
// AC #6: ice_crystal + lightning blast interaction works
// ============================================================

import { describe, it, expect } from 'vitest'
import { resolveHit } from '../../game/systems/DamageSystem'
import type { HitResolution } from '../../game/systems/DamageSystem'
import type { SkillModule, EnemyStateSlice } from '../../game/skills/types'

// Ensure all skill modules are registered
import '../../game/skills/index'
import { SkillRegistry } from '../../game/skills/registry'

// Helpers

function makeEnemy(statusKinds: string[] = []): EnemyStateSlice {
  return {
    hp: 30,
    maxHp: 30,
    activeStatusEffects: statusKinds.map(kind => ({ kind, remainingMs: 2000 })),
  }
}

function baseResolution(result: HitResolution['result'] = 'CRIT'): HitResolution {
  return { result, damageMultiplier: 1.0, visualKey: null }
}

// A minimal skill with no interactions
const skillNoInteractions: SkillModule = {
  type: 'white_shot',
  damageMin: 2,
  damageMax: 4,
  grazeMultiplier: 0.5,
  projectileSpeedCm: 70,
  castTimePeriodMs: 600,
  visualKey: 'white_shot',
  interactions: [],
}

// A skill with a single frozen→bonus interaction
const skillWithFrozenInteraction: SkillModule = {
  type: 'lightning_blast',
  damageMin: 9,
  damageMax: 12,
  grazeMultiplier: 0.5,
  projectileSpeedCm: 70,
  castTimePeriodMs: 2800,
  visualKey: 'lightning_blast',
  interactions: [
    {
      whenEnemyHas: 'frozen',
      damageMultiplier: 2.0,
      visualKey: 'lightning_frozen_discharge',
    },
  ],
}

describe('resolveHit() — no interactions', () => {
  it('returns baseResolution unchanged when skill has no interactions', () => {
    const enemy = makeEnemy()
    const base = baseResolution('HIT')
    const result = resolveHit(skillNoInteractions, enemy, base)
    expect(result).toEqual(base)
  })

  it('returns baseResolution unchanged when skill has empty interactions array', () => {
    const enemy = makeEnemy(['frozen'])
    const base = baseResolution('CRIT')
    const result = resolveHit(skillNoInteractions, enemy, base)
    expect(result).toEqual(base)
  })
})

describe('resolveHit() — rule does not match', () => {
  it('returns baseResolution unchanged when no status matches the interaction rule', () => {
    const enemy = makeEnemy(['burning']) // has burning, not frozen
    const base = baseResolution('CRIT')
    const result = resolveHit(skillWithFrozenInteraction, enemy, base)
    expect(result).toEqual(base)
  })

  it('returns baseResolution unchanged when enemy has no active status effects', () => {
    const enemy = makeEnemy() // no effects
    const base = baseResolution('HIT')
    const result = resolveHit(skillWithFrozenInteraction, enemy, base)
    expect(result).toEqual(base)
  })

  it('ignores expired effects (remainingMs = 0)', () => {
    const enemy: EnemyStateSlice = {
      hp: 20,
      maxHp: 20,
      activeStatusEffects: [{ kind: 'frozen', remainingMs: 0 }],
    }
    const base = baseResolution('CRIT')
    const result = resolveHit(skillWithFrozenInteraction, enemy, base)
    expect(result).toEqual(base)
  })
})

describe('resolveHit() — rule matches', () => {
  it('applies damageMultiplier when frozen enemy hit by lightning', () => {
    const enemy = makeEnemy(['frozen'])
    const base = baseResolution('CRIT')
    const result = resolveHit(skillWithFrozenInteraction, enemy, base)
    expect(result.damageMultiplier).toBe(2.0)
  })

  it('applies visual key override on match', () => {
    const enemy = makeEnemy(['frozen'])
    const base = baseResolution('HIT')
    const result = resolveHit(skillWithFrozenInteraction, enemy, base)
    expect(result.visualKey).toBe('lightning_frozen_discharge')
  })

  it('does not change the result (hit category)', () => {
    const enemy = makeEnemy(['frozen'])
    const base = baseResolution('HIT')
    const result = resolveHit(skillWithFrozenInteraction, enemy, base)
    expect(result.result).toBe('HIT')
  })

  it('multiplies on top of baseResolution.damageMultiplier', () => {
    const enemy = makeEnemy(['frozen'])
    const base: HitResolution = { result: 'CRIT', damageMultiplier: 1.5, visualKey: null }
    const result = resolveHit(skillWithFrozenInteraction, enemy, base)
    expect(result.damageMultiplier).toBe(3.0) // 1.5 × 2.0
  })
})

describe('resolveHit() — no switch/case (OCP)', () => {
  it('resolves ice_crystal on burning enemy via registry interactions', () => {
    const iceCrystal = SkillRegistry.get('ice_crystal')
    const enemy = makeEnemy(['burning'])
    const base = baseResolution('CRIT')
    const result = resolveHit(iceCrystal, enemy, base)
    // ice_crystal.interactions contains { whenEnemyHas: 'burning', visualKey: 'steam_burst' }
    expect(result.visualKey).toBe('steam_burst')
    // No damageMultiplier defined in ice_crystal burning rule → 1.0
    expect(result.damageMultiplier).toBe(1.0)
  })

  it('resolves lightning_blast on frozen enemy via registry interactions (AC #6)', () => {
    const lightning = SkillRegistry.get('lightning_blast')
    const enemy = makeEnemy(['frozen'])
    const base = baseResolution('CRIT')
    const result = resolveHit(lightning, enemy, base)
    expect(result.damageMultiplier).toBe(2.0)
    expect(result.visualKey).toBe('lightning_frozen_discharge')
  })
})

describe('resolveHit() — baseResolution propagation', () => {
  it('preserves visualKey from base when rule has no visualKey', () => {
    const skillWithPartialRule: SkillModule = {
      ...skillNoInteractions,
      interactions: [{ whenEnemyHas: 'frozen', damageMultiplier: 1.5 }],
    }
    const enemy = makeEnemy(['frozen'])
    const base: HitResolution = { result: 'HIT', damageMultiplier: 1.0, visualKey: 'my_key' }
    const result = resolveHit(skillWithPartialRule, enemy, base)
    expect(result.visualKey).toBe('my_key') // unchanged (rule has no visualKey)
    expect(result.damageMultiplier).toBe(1.5)
  })
})
