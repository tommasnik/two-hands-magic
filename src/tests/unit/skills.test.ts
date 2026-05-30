// ============================================================
// skills — SkillModule, SkillRegistry, and per-skill module tests
// ============================================================

import { describe, it, expect } from 'vitest'
import { SkillRegistry } from '../../game/skills/registry'
import type { SkillModule, StatusEffect, EnemyStateSlice } from '../../game/skills/types'

// Importing skills/index ensures all modules are registered before any test runs.
import '../../game/skills/index'

import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  WHITE_SHOT_SKILL_DAMAGE_MIN, WHITE_SHOT_SKILL_DAMAGE_MAX,
  FIREBALL_SKILL_DAMAGE_MIN, FIREBALL_SKILL_DAMAGE_MAX,
  ICE_CRYSTAL_DAMAGE_MIN, ICE_CRYSTAL_DAMAGE_MAX,
  LIGHTNING_BLAST_DAMAGE_MIN, LIGHTNING_BLAST_DAMAGE_MAX,
  ICE_CRYSTAL_FREEZE_CRIT_MS, ICE_CRYSTAL_FREEZE_HIT_MS,
  FIREBALL_SPEED_CM,
  ICE_CRYSTAL_SPEED_CM,
  FIREBALL_ROTATION_PERIOD_MS,
  ICE_CRYSTAL_ROTATION_PERIOD_MS,
  LIGHTNING_BLAST_ROTATION_PERIOD_MS,
  WHITE_SHOT_ROTATION_PERIOD_MS,
  NEW_SKILL_GREEN_ZONE_MULTIPLIER,
} from '../../game/constants'
import { GRAZE_DAMAGE_MULTIPLIER, PROJECTILE_SPEED_CM } from '../../game/constants'

// ============================================================
// SkillRegistry — basic API
// ============================================================

describe('SkillRegistry — basic API', () => {
  it('has() returns true for all registered skills', () => {
    const types = ['slow_shot', 'fast_shot', 'fireball', 'white_shot', 'ice_crystal', 'lightning_blast'] as const
    for (const t of types) {
      expect(SkillRegistry.has(t)).toBe(true)
    }
  })

  it('get() returns a module with the correct type field', () => {
    const types = ['slow_shot', 'fast_shot', 'fireball', 'white_shot', 'ice_crystal', 'lightning_blast'] as const
    for (const t of types) {
      expect(SkillRegistry.get(t).type).toBe(t)
    }
  })

  it('get() throws for an unregistered skill type', () => {
    // Cast to bypass TS — tests the runtime guard
    expect(() => SkillRegistry.get('unknown_skill' as never)).toThrow('SkillRegistry: skill \'unknown_skill\' is not registered')
  })

  it('getAll() returns all 6 registered modules', () => {
    const all = SkillRegistry.getAll()
    expect(all.length).toBe(6)
    const types = all.map(m => m.type)
    expect(types).toContain('slow_shot')
    expect(types).toContain('fast_shot')
    expect(types).toContain('fireball')
    expect(types).toContain('white_shot')
    expect(types).toContain('ice_crystal')
    expect(types).toContain('lightning_blast')
  })

  it('register() throws when the same skill type is registered twice', () => {
    const duplicate: SkillModule = {
      type: 'fireball',
      damageMin: 1,
      damageMax: 1,
      grazeMultiplier: 0.5,
      projectileSpeedCm: 10,
      castTimePeriodMs: 1000,
      visualKey: 'dup',
    }
    expect(() => SkillRegistry.register(duplicate)).toThrow(
      "SkillRegistry: skill 'fireball' is already registered"
    )
  })
})

// ============================================================
// slow_shot module
// ============================================================

describe('SkillModule — slow_shot', () => {
  it('damageMin === damageMax === SLOW_SKILL_DAMAGE', () => {
    const m = SkillRegistry.get('slow_shot')
    expect(m.damageMin).toBe(SLOW_SKILL_DAMAGE)
    expect(m.damageMax).toBe(SLOW_SKILL_DAMAGE)
  })

  it('grazeMultiplier === GRAZE_DAMAGE_MULTIPLIER', () => {
    expect(SkillRegistry.get('slow_shot').grazeMultiplier).toBe(GRAZE_DAMAGE_MULTIPLIER)
  })

  it('has no onHit callback', () => {
    expect(SkillRegistry.get('slow_shot').onHit).toBeUndefined()
  })
})

// ============================================================
// fast_shot module
// ============================================================

describe('SkillModule — fast_shot', () => {
  it('damageMin === damageMax === FAST_SKILL_DAMAGE', () => {
    const m = SkillRegistry.get('fast_shot')
    expect(m.damageMin).toBe(FAST_SKILL_DAMAGE)
    expect(m.damageMax).toBe(FAST_SKILL_DAMAGE)
  })

  it('grazeMultiplier === GRAZE_DAMAGE_MULTIPLIER', () => {
    expect(SkillRegistry.get('fast_shot').grazeMultiplier).toBe(GRAZE_DAMAGE_MULTIPLIER)
  })

  it('projectileSpeedCm === PROJECTILE_SPEED_CM', () => {
    expect(SkillRegistry.get('fast_shot').projectileSpeedCm).toBe(PROJECTILE_SPEED_CM)
  })

  it('has no onHit callback', () => {
    expect(SkillRegistry.get('fast_shot').onHit).toBeUndefined()
  })
})

// ============================================================
// fireball module
// ============================================================

describe('SkillModule — fireball', () => {
  it('damageMin === FIREBALL_SKILL_DAMAGE_MIN', () => {
    expect(SkillRegistry.get('fireball').damageMin).toBe(FIREBALL_SKILL_DAMAGE_MIN)
  })

  it('damageMax === FIREBALL_SKILL_DAMAGE_MAX', () => {
    expect(SkillRegistry.get('fireball').damageMax).toBe(FIREBALL_SKILL_DAMAGE_MAX)
  })

  it('grazeMultiplier === NEW_SKILL_GREEN_ZONE_MULTIPLIER', () => {
    expect(SkillRegistry.get('fireball').grazeMultiplier).toBe(NEW_SKILL_GREEN_ZONE_MULTIPLIER)
  })

  it('projectileSpeedCm === FIREBALL_SPEED_CM', () => {
    expect(SkillRegistry.get('fireball').projectileSpeedCm).toBe(FIREBALL_SPEED_CM)
  })

  it('castTimePeriodMs === FIREBALL_ROTATION_PERIOD_MS', () => {
    expect(SkillRegistry.get('fireball').castTimePeriodMs).toBe(FIREBALL_ROTATION_PERIOD_MS)
  })

  it('has no onHit callback', () => {
    expect(SkillRegistry.get('fireball').onHit).toBeUndefined()
  })
})

// ============================================================
// white_shot module
// ============================================================

describe('SkillModule — white_shot', () => {
  it('damageMin === WHITE_SHOT_SKILL_DAMAGE_MIN', () => {
    expect(SkillRegistry.get('white_shot').damageMin).toBe(WHITE_SHOT_SKILL_DAMAGE_MIN)
  })

  it('damageMax === WHITE_SHOT_SKILL_DAMAGE_MAX', () => {
    expect(SkillRegistry.get('white_shot').damageMax).toBe(WHITE_SHOT_SKILL_DAMAGE_MAX)
  })

  it('grazeMultiplier === NEW_SKILL_GREEN_ZONE_MULTIPLIER', () => {
    expect(SkillRegistry.get('white_shot').grazeMultiplier).toBe(NEW_SKILL_GREEN_ZONE_MULTIPLIER)
  })

  it('castTimePeriodMs === WHITE_SHOT_ROTATION_PERIOD_MS', () => {
    expect(SkillRegistry.get('white_shot').castTimePeriodMs).toBe(WHITE_SHOT_ROTATION_PERIOD_MS)
  })

  it('projectileSpeedCm === PROJECTILE_SPEED_CM', () => {
    expect(SkillRegistry.get('white_shot').projectileSpeedCm).toBe(PROJECTILE_SPEED_CM)
  })

  it('has no onHit callback', () => {
    expect(SkillRegistry.get('white_shot').onHit).toBeUndefined()
  })
})

// ============================================================
// ice_crystal module
// ============================================================

describe('SkillModule — ice_crystal', () => {
  it('damageMin === ICE_CRYSTAL_DAMAGE_MIN', () => {
    expect(SkillRegistry.get('ice_crystal').damageMin).toBe(ICE_CRYSTAL_DAMAGE_MIN)
  })

  it('damageMax === ICE_CRYSTAL_DAMAGE_MAX', () => {
    expect(SkillRegistry.get('ice_crystal').damageMax).toBe(ICE_CRYSTAL_DAMAGE_MAX)
  })

  it('grazeMultiplier === GRAZE_DAMAGE_MULTIPLIER', () => {
    expect(SkillRegistry.get('ice_crystal').grazeMultiplier).toBe(GRAZE_DAMAGE_MULTIPLIER)
  })

  it('projectileSpeedCm === ICE_CRYSTAL_SPEED_CM', () => {
    expect(SkillRegistry.get('ice_crystal').projectileSpeedCm).toBe(ICE_CRYSTAL_SPEED_CM)
  })

  it('castTimePeriodMs === ICE_CRYSTAL_ROTATION_PERIOD_MS', () => {
    expect(SkillRegistry.get('ice_crystal').castTimePeriodMs).toBe(ICE_CRYSTAL_ROTATION_PERIOD_MS)
  })

  it('has an onHit callback', () => {
    expect(typeof SkillRegistry.get('ice_crystal').onHit).toBe('function')
  })

  it('onHit CRIT calls applyStatus({ kind: frozen, remainingMs: ICE_CRYSTAL_FREEZE_CRIT_MS })', () => {
    const onHit = SkillRegistry.get('ice_crystal').onHit!
    const enemy: EnemyStateSlice = { hp: 10, maxHp: 20 }
    const appliedEffects: StatusEffect[] = []
    onHit(enemy, 'CRIT', (e) => appliedEffects.push(e))
    expect(appliedEffects).toHaveLength(1)
    expect(appliedEffects[0]).toEqual({ kind: 'frozen', remainingMs: ICE_CRYSTAL_FREEZE_CRIT_MS })
  })

  it('onHit HIT calls applyStatus({ kind: frozen, remainingMs: ICE_CRYSTAL_FREEZE_HIT_MS })', () => {
    const onHit = SkillRegistry.get('ice_crystal').onHit!
    const enemy: EnemyStateSlice = { hp: 10, maxHp: 20 }
    const appliedEffects: StatusEffect[] = []
    onHit(enemy, 'HIT', (e) => appliedEffects.push(e))
    expect(appliedEffects).toHaveLength(1)
    expect(appliedEffects[0]).toEqual({ kind: 'frozen', remainingMs: ICE_CRYSTAL_FREEZE_HIT_MS })
  })

  it('onHit GRAZE does NOT call applyStatus (no freeze on graze)', () => {
    const onHit = SkillRegistry.get('ice_crystal').onHit!
    const enemy: EnemyStateSlice = { hp: 10, maxHp: 20 }
    const appliedEffects: StatusEffect[] = []
    onHit(enemy, 'GRAZE', (e) => appliedEffects.push(e))
    expect(appliedEffects).toHaveLength(0)
  })

  it('onHit MISS does NOT call applyStatus', () => {
    const onHit = SkillRegistry.get('ice_crystal').onHit!
    const enemy: EnemyStateSlice = { hp: 10, maxHp: 20 }
    const appliedEffects: StatusEffect[] = []
    onHit(enemy, 'MISS', (e) => appliedEffects.push(e))
    expect(appliedEffects).toHaveLength(0)
  })

  it('onHit does NOT call applyStatus when enemy hp is 0 (no corpse-freeze)', () => {
    const onHit = SkillRegistry.get('ice_crystal').onHit!
    const enemy: EnemyStateSlice = { hp: 0, maxHp: 20 }
    const appliedEffects: StatusEffect[] = []
    onHit(enemy, 'CRIT', (e) => appliedEffects.push(e))
    expect(appliedEffects).toHaveLength(0)
  })

  it('interactions list contains a burning→steam_burst rule', () => {
    const interactions = SkillRegistry.get('ice_crystal').interactions ?? []
    const rule = interactions.find(r => r.whenEnemyHas === 'burning')
    expect(rule).toBeDefined()
    expect(rule!.visualKey).toBe('steam_burst')
  })
})

// ============================================================
// lightning_blast module
// ============================================================

describe('SkillModule — lightning_blast', () => {
  it('damageMin === LIGHTNING_BLAST_DAMAGE_MIN', () => {
    expect(SkillRegistry.get('lightning_blast').damageMin).toBe(LIGHTNING_BLAST_DAMAGE_MIN)
  })

  it('damageMax === LIGHTNING_BLAST_DAMAGE_MAX', () => {
    expect(SkillRegistry.get('lightning_blast').damageMax).toBe(LIGHTNING_BLAST_DAMAGE_MAX)
  })

  it('grazeMultiplier === GRAZE_DAMAGE_MULTIPLIER', () => {
    expect(SkillRegistry.get('lightning_blast').grazeMultiplier).toBe(GRAZE_DAMAGE_MULTIPLIER)
  })

  it('castTimePeriodMs === LIGHTNING_BLAST_ROTATION_PERIOD_MS', () => {
    expect(SkillRegistry.get('lightning_blast').castTimePeriodMs).toBe(LIGHTNING_BLAST_ROTATION_PERIOD_MS)
  })

  it('has no onHit callback', () => {
    expect(SkillRegistry.get('lightning_blast').onHit).toBeUndefined()
  })

  it('interactions list contains a frozen→discharge rule with damageMultiplier 2.0', () => {
    const interactions = SkillRegistry.get('lightning_blast').interactions ?? []
    const rule = interactions.find(r => r.whenEnemyHas === 'frozen')
    expect(rule).toBeDefined()
    expect(rule!.damageMultiplier).toBe(2.0)
    expect(rule!.visualKey).toBe('lightning_frozen_discharge')
  })
})

// ============================================================
// All skills — structural invariants
// ============================================================

describe('SkillModule — structural invariants for all skills', () => {
  const allTypes = ['slow_shot', 'fast_shot', 'fireball', 'white_shot', 'ice_crystal', 'lightning_blast'] as const

  for (const skillType of allTypes) {
    it(`${skillType}: damageMin <= damageMax`, () => {
      const m = SkillRegistry.get(skillType)
      expect(m.damageMin).toBeLessThanOrEqual(m.damageMax)
    })

    it(`${skillType}: projectileSpeedCm > 0`, () => {
      expect(SkillRegistry.get(skillType).projectileSpeedCm).toBeGreaterThan(0)
    })

    it(`${skillType}: castTimePeriodMs > 0`, () => {
      expect(SkillRegistry.get(skillType).castTimePeriodMs).toBeGreaterThan(0)
    })

    it(`${skillType}: grazeMultiplier is in (0, 1]`, () => {
      const g = SkillRegistry.get(skillType).grazeMultiplier
      expect(g).toBeGreaterThan(0)
      expect(g).toBeLessThanOrEqual(1)
    })

    it(`${skillType}: visualKey is a non-empty string`, () => {
      expect(SkillRegistry.get(skillType).visualKey.length).toBeGreaterThan(0)
    })
  }
})
