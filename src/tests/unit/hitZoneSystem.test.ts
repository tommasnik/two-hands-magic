// ============================================================
// HitZoneSystem unit tests
// Tests scaleHitZoneMap: relative (0–1) → absolute pixel rects
// Also tests resolveSpriteKey and resolveHitZoneMap from GameStateMachine.
// ============================================================

import { describe, it, expect } from 'vitest'
import { scaleHitZoneMap } from '../../game/systems/HitZoneSystem'
import { resolveSpriteKey, resolveHitZoneMap, resolveHitZoneLayout, resolveShape } from '../../game/GameStateMachine'
import { DEFAULT_HIT_ZONE_MAP, DEFAULT_HIT_ZONE_LAYOUT, DEFAULT_SHAPE, ENEMY_GOBLIN_SCOUT, ENEMY_SPRITE_PLACEHOLDER_KEY } from '../../game/constants'
import type { HitZoneEntry, HitZoneLayout, ShapeDescriptor, EnemyDef } from '../../types'

// ---- helpers ---------------------------------------------------------------

/** A minimal three-zone map for isolated scaling tests. */
const THREE_ZONE_MAP: readonly HitZoneEntry[] = [
  { zone: 'head',   rect: { x: 0.35, y: 0.00, w: 0.30, h: 0.25 }, active: true },
  { zone: 'torso',  rect: { x: 0.00, y: 0.25, w: 1.00, h: 0.45 }, active: true },
  { zone: 'leftLeg', rect: { x: 0.00, y: 0.70, w: 0.50, h: 0.30 }, active: true },
]

/** A map containing an inactive zone to verify it is excluded. */
const MAP_WITH_INACTIVE: readonly HitZoneEntry[] = [
  { zone: 'head',   rect: { x: 0.35, y: 0.00, w: 0.30, h: 0.25 }, active: true },
  { zone: 'torso',  rect: { x: 0.00, y: 0.25, w: 1.00, h: 0.45 }, active: false },
]

// ---- unit tests ------------------------------------------------------------

describe('scaleHitZoneMap', () => {
  it('scales a single full-bbox zone to the full enemy pixel rect', () => {
    const fullZone: readonly HitZoneEntry[] = [
      { zone: 'torso', rect: { x: 0, y: 0, w: 1, h: 1 }, active: true },
    ]
    const enemyW = 100
    const enemyH = 200
    const enemyX = 195  // centre X
    const enemyY = 300  // centre Y

    const result = scaleHitZoneMap(fullZone, enemyX, enemyY, enemyW, enemyH)

    expect(result).toHaveLength(1)
    expect(result[0].zone).toBe('torso')
    expect(result[0].active).toBe(true)
    // bbox top-left = (195 - 50, 300 - 100) = (145, 200)
    expect(result[0].rect.x).toBeCloseTo(145)
    expect(result[0].rect.y).toBeCloseTo(200)
    expect(result[0].rect.w).toBeCloseTo(100)
    expect(result[0].rect.h).toBeCloseTo(200)
  })

  it('correctly scales head zone (top 25%, centered 30-70%) for a 100×200 enemy', () => {
    const enemyW = 100
    const enemyH = 200
    const enemyX = 200
    const enemyY = 300

    const result = scaleHitZoneMap(THREE_ZONE_MAP, enemyX, enemyY, enemyW, enemyH)
    const head = result.find(z => z.zone === 'head')!

    // topLeft = (200 - 50, 300 - 100) = (150, 200)
    // head rect: x = 150 + 0.35*100 = 185, y = 200 + 0*200 = 200, w = 30, h = 50
    expect(head.rect.x).toBeCloseTo(185)
    expect(head.rect.y).toBeCloseTo(200)
    expect(head.rect.w).toBeCloseTo(30)
    expect(head.rect.h).toBeCloseTo(50)
  })

  it('correctly scales torso zone (middle 45%, full width) for a 100×200 enemy', () => {
    const enemyW = 100
    const enemyH = 200
    const enemyX = 200
    const enemyY = 300

    const result = scaleHitZoneMap(THREE_ZONE_MAP, enemyX, enemyY, enemyW, enemyH)
    const torso = result.find(z => z.zone === 'torso')!

    // topLeft = (150, 200)
    // torso: x = 150 + 0*100 = 150, y = 200 + 0.25*200 = 250, w = 100, h = 90
    expect(torso.rect.x).toBeCloseTo(150)
    expect(torso.rect.y).toBeCloseTo(250)
    expect(torso.rect.w).toBeCloseTo(100)
    expect(torso.rect.h).toBeCloseTo(90)
  })

  it('correctly scales leg zone (bottom 30%, left half) for a 100×200 enemy', () => {
    const enemyW = 100
    const enemyH = 200
    const enemyX = 200
    const enemyY = 300

    const result = scaleHitZoneMap(THREE_ZONE_MAP, enemyX, enemyY, enemyW, enemyH)
    const leftLeg = result.find(z => z.zone === 'leftLeg')!

    // topLeft = (150, 200)
    // leftLeg: x = 150 + 0*100 = 150, y = 200 + 0.70*200 = 340, w = 50, h = 60
    expect(leftLeg.rect.x).toBeCloseTo(150)
    expect(leftLeg.rect.y).toBeCloseTo(340)
    expect(leftLeg.rect.w).toBeCloseTo(50)
    expect(leftLeg.rect.h).toBeCloseTo(60)
  })

  it('scales correctly for a different enemy size (50×120)', () => {
    const enemyW = 50
    const enemyH = 120
    const enemyX = 100
    const enemyY = 150

    const result = scaleHitZoneMap(THREE_ZONE_MAP, enemyX, enemyY, enemyW, enemyH)
    const head = result.find(z => z.zone === 'head')!

    // topLeft = (100 - 25, 150 - 60) = (75, 90)
    // head: x = 75 + 0.35*50 = 75+17.5 = 92.5, y = 90+0 = 90, w = 0.30*50 = 15, h = 0.25*120 = 30
    expect(head.rect.x).toBeCloseTo(92.5)
    expect(head.rect.y).toBeCloseTo(90)
    expect(head.rect.w).toBeCloseTo(15)
    expect(head.rect.h).toBeCloseTo(30)
  })

  it('scales correctly for a large enemy (300×500)', () => {
    const enemyW = 300
    const enemyH = 500
    const enemyX = 390
    const enemyY = 422

    const result = scaleHitZoneMap(THREE_ZONE_MAP, enemyX, enemyY, enemyW, enemyH)
    const torso = result.find(z => z.zone === 'torso')!

    // topLeft = (390 - 150, 422 - 250) = (240, 172)
    // torso: x = 240 + 0*300 = 240, y = 172 + 0.25*500 = 172+125 = 297, w = 300, h = 0.45*500 = 225
    expect(torso.rect.x).toBeCloseTo(240)
    expect(torso.rect.y).toBeCloseTo(297)
    expect(torso.rect.w).toBeCloseTo(300)
    expect(torso.rect.h).toBeCloseTo(225)
  })

  it('excludes inactive zones from the output', () => {
    const result = scaleHitZoneMap(MAP_WITH_INACTIVE, 200, 300, 100, 200)

    expect(result).toHaveLength(1)
    expect(result[0].zone).toBe('head')
  })

  it('returns an empty array when all zones are inactive', () => {
    const allInactive: readonly HitZoneEntry[] = [
      { zone: 'head',  rect: { x: 0, y: 0, w: 1, h: 0.25 }, active: false },
      { zone: 'torso', rect: { x: 0, y: 0.25, w: 1, h: 0.75 }, active: false },
    ]
    const result = scaleHitZoneMap(allInactive, 200, 300, 100, 200)
    expect(result).toHaveLength(0)
  })

  it('returns an empty array for an empty input map', () => {
    const result = scaleHitZoneMap([], 200, 300, 100, 200)
    expect(result).toHaveLength(0)
  })

  it('preserves the zone name and active flag in output', () => {
    const map: readonly HitZoneEntry[] = [
      { zone: 'rightArm', rect: { x: 0.5, y: 0.1, w: 0.3, h: 0.2 }, active: true },
    ]
    const result = scaleHitZoneMap(map, 100, 100, 80, 160)
    expect(result[0].zone).toBe('rightArm')
    expect(result[0].active).toBe(true)
  })

  it('DEFAULT_HIT_ZONE_MAP produces 4 active zones when scaled', () => {
    const result = scaleHitZoneMap(DEFAULT_HIT_ZONE_MAP, 195, 270, 146, 269)
    // DEFAULT_HIT_ZONE_MAP has 4 entries (head, torso, leftLeg, rightLeg), all active
    expect(result).toHaveLength(4)
    const zoneNames = result.map(z => z.zone)
    expect(zoneNames).toContain('head')
    expect(zoneNames).toContain('torso')
    expect(zoneNames).toContain('leftLeg')
    expect(zoneNames).toContain('rightLeg')
  })

  it('zones are proportionally sized — head is smaller than torso for DEFAULT_HIT_ZONE_MAP', () => {
    const result = scaleHitZoneMap(DEFAULT_HIT_ZONE_MAP, 195, 270, 146, 269)
    const head = result.find(z => z.zone === 'head')!
    const torso = result.find(z => z.zone === 'torso')!
    const headArea = head.rect.w * head.rect.h
    const torsoArea = torso.rect.w * torso.rect.h
    expect(headArea).toBeLessThan(torsoArea)
  })

  it('scales symmetrically for centered enemy (enemyX = canvas center)', () => {
    const enemyW = 100
    const enemyH = 200
    const enemyX = 195
    const enemyY = 270

    const result = scaleHitZoneMap(THREE_ZONE_MAP, enemyX, enemyY, enemyW, enemyH)

    // All zones should fit within the bounding box
    const topLeft = { x: enemyX - enemyW / 2, y: enemyY - enemyH / 2 }
    for (const zone of result) {
      expect(zone.rect.x).toBeGreaterThanOrEqual(topLeft.x - 1e-9)
      expect(zone.rect.y).toBeGreaterThanOrEqual(topLeft.y - 1e-9)
      expect(zone.rect.x + zone.rect.w).toBeLessThanOrEqual(topLeft.x + enemyW + 1e-9)
      expect(zone.rect.y + zone.rect.h).toBeLessThanOrEqual(topLeft.y + enemyH + 1e-9)
    }
  })
})

// ---- resolveSpriteKey tests -----------------------------------------------

describe('resolveSpriteKey', () => {
  it('returns the spriteKey when defined on EnemyDef', () => {
    expect(resolveSpriteKey(ENEMY_GOBLIN_SCOUT)).toBe('goblin_scout')
  })

  it('returns ENEMY_SPRITE_PLACEHOLDER_KEY when spriteKey is undefined', () => {
    const defWithoutSprite: EnemyDef = {
      name: 'Test',
      maxHp: 50,
      critZoneScale: 1.0,
      // no spriteKey
    }
    expect(resolveSpriteKey(defWithoutSprite)).toBe(ENEMY_SPRITE_PLACEHOLDER_KEY)
  })

  it('returns exactly ENEMY_SPRITE_PLACEHOLDER_KEY for the fallback', () => {
    const minimalDef: EnemyDef = { name: 'X', maxHp: 1, critZoneScale: 1 }
    expect(resolveSpriteKey(minimalDef)).toBe('enemy_placeholder')
  })
})

// ---- resolveHitZoneMap tests -----------------------------------------------

describe('resolveHitZoneMap', () => {
  it('returns the hitZoneMap when defined on EnemyDef', () => {
    const customMap: readonly HitZoneEntry[] = [
      { zone: 'head', rect: { x: 0, y: 0, w: 1, h: 0.5 }, active: true },
    ]
    const def: EnemyDef = { name: 'Custom', maxHp: 50, critZoneScale: 1.0, hitZoneMap: customMap }
    expect(resolveHitZoneMap(def)).toBe(customMap)
  })

  it('returns DEFAULT_HIT_ZONE_MAP when hitZoneMap is undefined', () => {
    const defWithoutMap: EnemyDef = {
      name: 'Test',
      maxHp: 50,
      critZoneScale: 1.0,
      // no hitZoneMap
    }
    expect(resolveHitZoneMap(defWithoutMap)).toBe(DEFAULT_HIT_ZONE_MAP)
  })

  it('returned DEFAULT_HIT_ZONE_MAP has 4 entries', () => {
    const minimalDef: EnemyDef = { name: 'X', maxHp: 1, critZoneScale: 1 }
    expect(resolveHitZoneMap(minimalDef)).toHaveLength(4)
  })
})

// ---- resolveHitZoneLayout tests -------------------------------------------

describe('resolveHitZoneLayout', () => {
  it('returns the hitZoneLayout when defined on EnemyDef', () => {
    const customLayout: HitZoneLayout = {
      critDx: 0, critDy: -50, critRadius: 30,
      midDx: 0,  midDy: 0,   midRadius: 50,
      lowDx: 0,  lowDy: 20,  lowRadius: 100,
    }
    const def: EnemyDef = { name: 'Custom', maxHp: 50, critZoneScale: 1.0, hitZoneLayout: customLayout }
    expect(resolveHitZoneLayout(def)).toBe(customLayout)
  })

  it('returns DEFAULT_HIT_ZONE_LAYOUT when hitZoneLayout is undefined', () => {
    const defWithoutLayout: EnemyDef = { name: 'Test', maxHp: 50, critZoneScale: 1.0 }
    expect(resolveHitZoneLayout(defWithoutLayout)).toBe(DEFAULT_HIT_ZONE_LAYOUT)
  })

  it('ENEMY_GOBLIN_SCOUT has a hitZoneLayout defined', () => {
    expect(ENEMY_GOBLIN_SCOUT.hitZoneLayout).toBeDefined()
    expect(resolveHitZoneLayout(ENEMY_GOBLIN_SCOUT)).toBe(ENEMY_GOBLIN_SCOUT.hitZoneLayout)
  })

  it('DEFAULT_HIT_ZONE_LAYOUT has positive critRadius, midRadius, lowRadius', () => {
    expect(DEFAULT_HIT_ZONE_LAYOUT.critRadius).toBeGreaterThan(0)
    expect(DEFAULT_HIT_ZONE_LAYOUT.midRadius).toBeGreaterThan(0)
    expect(DEFAULT_HIT_ZONE_LAYOUT.lowRadius).toBeGreaterThan(0)
  })

  it('DEFAULT_HIT_ZONE_LAYOUT lowRadius is greater than midRadius', () => {
    expect(DEFAULT_HIT_ZONE_LAYOUT.lowRadius).toBeGreaterThan(DEFAULT_HIT_ZONE_LAYOUT.midRadius)
  })
})

// ---- resolveShape tests ---------------------------------------------------

describe('resolveShape', () => {
  it('returns the shape when defined on EnemyDef', () => {
    const customShape: ShapeDescriptor = { type: 'wisp', scale: 0.5, headScale: 0.8, widthRatio: 1.0 }
    const def: EnemyDef = { name: 'Custom', maxHp: 50, critZoneScale: 1.0, shape: customShape }
    expect(resolveShape(def)).toBe(customShape)
  })

  it('returns DEFAULT_SHAPE when shape is undefined', () => {
    const defWithoutShape: EnemyDef = { name: 'Test', maxHp: 50, critZoneScale: 1.0 }
    expect(resolveShape(defWithoutShape)).toBe(DEFAULT_SHAPE)
  })

  it('ENEMY_GOBLIN_SCOUT has a shape defined', () => {
    expect(ENEMY_GOBLIN_SCOUT.shape).toBeDefined()
    expect(resolveShape(ENEMY_GOBLIN_SCOUT)).toBe(ENEMY_GOBLIN_SCOUT.shape)
  })

  it('DEFAULT_SHAPE is humanoid type with scale 1.0', () => {
    expect(DEFAULT_SHAPE.type).toBe('humanoid')
    expect(DEFAULT_SHAPE.scale).toBe(1.0)
    expect(DEFAULT_SHAPE.headScale).toBe(1.0)
    expect(DEFAULT_SHAPE.widthRatio).toBe(1.0)
  })
})
