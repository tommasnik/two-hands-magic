import { describe, it, expect } from 'vitest'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MAX_DELTA_MS,
  AIM_GAIN,
  PROJECTILE_SPEED_CM,
  FIREBALL_SPEED_CM,
  PROJECTILE_BASE_RADIUS_CM,
  PROJECTILE_BASE_RADIUS_PX,
  PIXELS_PER_CM,
  TOUCH_POINT_DEFS,
  TP_GREEN,
  TP_VIOLET,
  TP_ORANGE,
  TP_BLUE,
  TP_RED,
  TP_YELLOW,
  ENEMY_HEAD_RADIUS_CM,
  ENEMY_TORSO_WIDTH_CM,
  ENEMY_TORSO_HEIGHT_CM,
  ENEMY_ARM_LENGTH_CM,
  ENEMY_LEG_LENGTH_CM,
  ENEMY_LIMB_RADIUS_CM,
  ENEMY_DEFAULT_Y,
  CRIT_SCORE,
  HIT_SCORE,
  GRAZE_SCORE,
  MISS_SCORE,
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  WHITE_SHOT_SKILL_DAMAGE,
  FIREBALL_SKILL_DAMAGE,
  NEW_SKILL_GREEN_ZONE_MULTIPLIER,
  SLOW_SKILL_ROTATION_PERIOD_MS,
  FAST_SKILL_ROTATION_PERIOD_MS,
  WHITE_SHOT_ROTATION_PERIOD_MS,
  FIREBALL_ROTATION_PERIOD_MS,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  GRAZE_DAMAGE_MULTIPLIER,
  GREEN_ZONE_DAMAGE_MULTIPLIER,
  ENEMY_GOBLIN_SCOUT,
  ENEMY_ORC_WARRIOR,
  ENEMY_STONE_TROLL,
  ENEMY_STONE_GIANT,
  LEVELS,
  FLOAT_TEXT_FONT_CRIT,
  FLOAT_TEXT_FONT_HIT,
  FLOAT_TEXT_FONT_GRAZE,
  FLOAT_TEXT_COLOR_CRIT,
  FLOAT_TEXT_COLOR_HIT,
  FLOAT_TEXT_COLOR_GRAZE,
  FLOAT_TEXT_COLOR_MISS,
  getHitResultColor,
  PLAYER_START_LEVEL,
  PLAYER_MAX_LEVEL,
  XP_LEVEL_THRESHOLDS,
} from '../../game/constants'

describe('canvas dimensions', () => {
  it('GAME_WIDTH is 390', () => {
    expect(GAME_WIDTH).toBe(390)
  })

  it('GAME_HEIGHT is 844', () => {
    expect(GAME_HEIGHT).toBe(844)
  })

  it('canvas is portrait (height > width)', () => {
    expect(GAME_HEIGHT).toBeGreaterThan(GAME_WIDTH)
  })
})

describe('enemy default position', () => {
  it('ENEMY_DEFAULT_Y is derived from GAME_HEIGHT * 0.32', () => {
    expect(ENEMY_DEFAULT_Y).toBeCloseTo(GAME_HEIGHT * 0.32, 10)
  })

  it('ENEMY_DEFAULT_Y places enemy in the upper 40% of the canvas', () => {
    expect(ENEMY_DEFAULT_Y).toBeLessThan(GAME_HEIGHT * 0.4)
  })

  it('ENEMY_DEFAULT_Y is positive (above the baseline)', () => {
    expect(ENEMY_DEFAULT_Y).toBeGreaterThan(0)
  })
})

describe('frame timing', () => {
  it('MAX_DELTA_MS caps at 50 ms', () => {
    expect(MAX_DELTA_MS).toBe(50)
  })
})

describe('aim model', () => {
  it('AIM_GAIN is 4.0', () => {
    expect(AIM_GAIN).toBe(4.0)
  })
})

describe('projectile speeds — derived constants', () => {
  it('FIREBALL_SPEED_CM is derived from PROJECTILE_SPEED_CM * 0.4', () => {
    expect(FIREBALL_SPEED_CM).toBe(PROJECTILE_SPEED_CM * 0.4)
  })

  it('PROJECTILE_SPEED_CM is 70', () => {
    expect(PROJECTILE_SPEED_CM).toBe(70)
  })

  it('FIREBALL_SPEED_CM is 28', () => {
    expect(FIREBALL_SPEED_CM).toBe(28)
  })

  it('fireball is slower than base projectile', () => {
    expect(FIREBALL_SPEED_CM).toBeLessThan(PROJECTILE_SPEED_CM)
  })
})

describe('projectile radius — TASK-44 derived constants', () => {
  it('PROJECTILE_BASE_RADIUS_PX is derived from PROJECTILE_BASE_RADIUS_CM × PIXELS_PER_CM', () => {
    expect(PROJECTILE_BASE_RADIUS_PX).toBeCloseTo(PROJECTILE_BASE_RADIUS_CM * PIXELS_PER_CM, 10)
  })

  it('PROJECTILE_BASE_RADIUS_CM ≤ 0.05 cm so baseline hit detection stays compatible with existing point tests (AC #3)', () => {
    expect(PROJECTILE_BASE_RADIUS_CM).toBeLessThanOrEqual(0.05)
  })

  it('PROJECTILE_BASE_RADIUS_CM is strictly positive — a zero radius would defeat spell-area upgrades entirely', () => {
    expect(PROJECTILE_BASE_RADIUS_CM).toBeGreaterThan(0)
  })
})

describe('touch point definitions', () => {
  it('there are exactly 6 touch points', () => {
    expect(TOUCH_POINT_DEFS).toHaveLength(6)
  })

  it('3 points on the left side', () => {
    const left = TOUCH_POINT_DEFS.filter(tp => tp.side === 'left')
    expect(left).toHaveLength(3)
  })

  it('3 points on the right side', () => {
    const right = TOUCH_POINT_DEFS.filter(tp => tp.side === 'right')
    expect(right).toHaveLength(3)
  })

  it('all touch points have positive rotationPeriodMs', () => {
    for (const tp of TOUCH_POINT_DEFS) {
      expect(tp.rotationPeriodMs).toBeGreaterThan(0)
    }
  })

  it('all touch points have a non-empty color string', () => {
    for (const tp of TOUCH_POINT_DEFS) {
      expect(tp.color).toBeTruthy()
    }
  })

  it('green is the slowest left-side point (rotationPeriodMs = 2200)', () => {
    expect(TP_GREEN.rotationPeriodMs).toBe(2200)
    expect(TP_GREEN.side).toBe('left')
  })

  it('violet is the fastest left-side point (rotationPeriodMs = 600)', () => {
    expect(TP_VIOLET.rotationPeriodMs).toBe(600)
    expect(TP_VIOLET.side).toBe('left')
  })

  it('orange is medium left-side (rotationPeriodMs = 1400)', () => {
    expect(TP_ORANGE.rotationPeriodMs).toBe(1400)
    expect(TP_ORANGE.side).toBe('left')
  })

  it('blue is the slowest overall (rotationPeriodMs = 2800)', () => {
    expect(TP_BLUE.rotationPeriodMs).toBe(2800)
    expect(TP_BLUE.side).toBe('right')
  })

  it('red is fast right-side (rotationPeriodMs = 900)', () => {
    expect(TP_RED.rotationPeriodMs).toBe(900)
    expect(TP_RED.side).toBe('right')
  })

  it('yellow is medium-slow right-side (rotationPeriodMs = 1700)', () => {
    expect(TP_YELLOW.rotationPeriodMs).toBe(1700)
    expect(TP_YELLOW.side).toBe('right')
  })

  it('touch points are included in TOUCH_POINT_DEFS array', () => {
    expect(TOUCH_POINT_DEFS).toContain(TP_GREEN)
    expect(TOUCH_POINT_DEFS).toContain(TP_VIOLET)
    expect(TOUCH_POINT_DEFS).toContain(TP_ORANGE)
    expect(TOUCH_POINT_DEFS).toContain(TP_BLUE)
    expect(TOUCH_POINT_DEFS).toContain(TP_RED)
    expect(TOUCH_POINT_DEFS).toContain(TP_YELLOW)
  })
})

describe('enemy dimensions — derived constant', () => {
  it('ENEMY_HEAD_RADIUS_CM is 1.1', () => {
    expect(ENEMY_HEAD_RADIUS_CM).toBe(1.1)
  })

  it('ENEMY_TORSO_WIDTH_CM is 2.6', () => {
    expect(ENEMY_TORSO_WIDTH_CM).toBe(2.6)
  })

  it('ENEMY_TORSO_HEIGHT_CM is 3.6', () => {
    expect(ENEMY_TORSO_HEIGHT_CM).toBe(3.6)
  })

  it('ENEMY_ARM_LENGTH_CM is 3.4', () => {
    expect(ENEMY_ARM_LENGTH_CM).toBe(3.4)
  })

  it('ENEMY_LEG_LENGTH_CM is 4.2', () => {
    expect(ENEMY_LEG_LENGTH_CM).toBe(4.2)
  })

  it('ENEMY_LIMB_RADIUS_CM is derived from ENEMY_TORSO_WIDTH_CM * (0.45 / 2.6)', () => {
    expect(ENEMY_LIMB_RADIUS_CM).toBeCloseTo(ENEMY_TORSO_WIDTH_CM * (0.45 / 2.6), 10)
  })

  it('ENEMY_LIMB_RADIUS_CM is approximately 0.45 cm', () => {
    expect(ENEMY_LIMB_RADIUS_CM).toBeCloseTo(0.45, 5)
  })

  it('torso is wider than head radius * 2 (torso spans more than head)', () => {
    expect(ENEMY_TORSO_WIDTH_CM).toBeGreaterThan(ENEMY_HEAD_RADIUS_CM * 2)
  })

  it('legs are longer than arms', () => {
    expect(ENEMY_LEG_LENGTH_CM).toBeGreaterThan(ENEMY_ARM_LENGTH_CM)
  })
})

describe('score values', () => {
  it('CRIT_SCORE is 3', () => {
    expect(CRIT_SCORE).toBe(3)
  })

  it('HIT_SCORE is 1', () => {
    expect(HIT_SCORE).toBe(1)
  })

  it('GRAZE_SCORE is 0', () => {
    expect(GRAZE_SCORE).toBe(0)
  })

  it('MISS_SCORE is 0', () => {
    expect(MISS_SCORE).toBe(0)
  })

  it('CRIT_SCORE > HIT_SCORE > GRAZE_SCORE (scoring hierarchy)', () => {
    expect(CRIT_SCORE).toBeGreaterThan(HIT_SCORE)
    expect(HIT_SCORE).toBeGreaterThan(GRAZE_SCORE)
  })
})

describe('skill damage values', () => {
  it('SLOW_SKILL_DAMAGE is 20', () => {
    expect(SLOW_SKILL_DAMAGE).toBe(20)
  })

  it('FAST_SKILL_DAMAGE is derived from SLOW_SKILL_DAMAGE * 0.5', () => {
    expect(FAST_SKILL_DAMAGE).toBe(SLOW_SKILL_DAMAGE * 0.5)
  })

  it('FAST_SKILL_DAMAGE is 10', () => {
    expect(FAST_SKILL_DAMAGE).toBe(10)
  })

  it('slow skill deals more damage than fast skill', () => {
    expect(SLOW_SKILL_DAMAGE).toBeGreaterThan(FAST_SKILL_DAMAGE)
  })

  // task-38: white_shot and fireball damage constants
  it('WHITE_SHOT_SKILL_DAMAGE is in range 2–4 (AC#1)', () => {
    expect(WHITE_SHOT_SKILL_DAMAGE).toBeGreaterThanOrEqual(2)
    expect(WHITE_SHOT_SKILL_DAMAGE).toBeLessThanOrEqual(4)
  })

  it('WHITE_SHOT_SKILL_DAMAGE is derived from FAST_SKILL_DAMAGE * 0.3', () => {
    expect(WHITE_SHOT_SKILL_DAMAGE).toBeCloseTo(FAST_SKILL_DAMAGE * 0.3, 10)
  })

  it('FIREBALL_SKILL_DAMAGE is in range 10–15 (AC#2)', () => {
    expect(FIREBALL_SKILL_DAMAGE).toBeGreaterThanOrEqual(10)
    expect(FIREBALL_SKILL_DAMAGE).toBeLessThanOrEqual(15)
  })

  it('FIREBALL_SKILL_DAMAGE is derived from SLOW_SKILL_DAMAGE * 0.6', () => {
    expect(FIREBALL_SKILL_DAMAGE).toBeCloseTo(SLOW_SKILL_DAMAGE * 0.6, 10)
  })

  it('fireball deals more damage than white_shot (burst vs rapid-fire)', () => {
    expect(FIREBALL_SKILL_DAMAGE).toBeGreaterThan(WHITE_SHOT_SKILL_DAMAGE)
  })

  it('NEW_SKILL_GREEN_ZONE_MULTIPLIER is 0.5 (50% vs green zone, AC#1, AC#2)', () => {
    expect(NEW_SKILL_GREEN_ZONE_MULTIPLIER).toBe(0.5)
  })
})

describe('skill rotation periods', () => {
  it('SLOW_SKILL_ROTATION_PERIOD_MS is 2200 (matches TP_GREEN)', () => {
    expect(SLOW_SKILL_ROTATION_PERIOD_MS).toBe(2200)
  })

  it('FAST_SKILL_ROTATION_PERIOD_MS is 1400 (matches TP_ORANGE)', () => {
    expect(FAST_SKILL_ROTATION_PERIOD_MS).toBe(1400)
  })

  it('SLOW_SKILL_ROTATION_PERIOD_MS matches TP_GREEN rotation period', () => {
    expect(SLOW_SKILL_ROTATION_PERIOD_MS).toBe(TP_GREEN.rotationPeriodMs)
  })

  it('FAST_SKILL_ROTATION_PERIOD_MS matches TP_ORANGE rotation period', () => {
    expect(FAST_SKILL_ROTATION_PERIOD_MS).toBe(TP_ORANGE.rotationPeriodMs)
  })

  it('slow skill rotates slower than fast skill (higher period = slower)', () => {
    expect(SLOW_SKILL_ROTATION_PERIOD_MS).toBeGreaterThan(FAST_SKILL_ROTATION_PERIOD_MS)
  })

  // task-38: white_shot and fireball rotation periods
  it('WHITE_SHOT_ROTATION_PERIOD_MS is 600 (matches TP_VIOLET — fastest, AC#1)', () => {
    expect(WHITE_SHOT_ROTATION_PERIOD_MS).toBe(600)
  })

  it('WHITE_SHOT_ROTATION_PERIOD_MS matches TP_VIOLET rotation period (fastest)', () => {
    expect(WHITE_SHOT_ROTATION_PERIOD_MS).toBe(TP_VIOLET.rotationPeriodMs)
  })

  it('WHITE_SHOT_ROTATION_PERIOD_MS is faster than FAST_SKILL_ROTATION_PERIOD_MS (cooldown ≤ fast_shot, AC#1)', () => {
    expect(WHITE_SHOT_ROTATION_PERIOD_MS).toBeLessThanOrEqual(FAST_SKILL_ROTATION_PERIOD_MS)
  })

  it('FIREBALL_ROTATION_PERIOD_MS is 2000 (≈ 2 s cooldown design intent, AC#2)', () => {
    expect(FIREBALL_ROTATION_PERIOD_MS).toBe(2000)
  })

  it('FIREBALL_ROTATION_PERIOD_MS is slower than SLOW_SKILL_ROTATION_PERIOD_MS (most deliberate skill)', () => {
    expect(FIREBALL_ROTATION_PERIOD_MS).toBeLessThanOrEqual(SLOW_SKILL_ROTATION_PERIOD_MS)
  })
})

describe('damage multipliers', () => {
  it('CRIT_DAMAGE_MULTIPLIER is 2.0', () => {
    expect(CRIT_DAMAGE_MULTIPLIER).toBe(2.0)
  })

  it('HIT_DAMAGE_MULTIPLIER is 1.0', () => {
    expect(HIT_DAMAGE_MULTIPLIER).toBe(1.0)
  })

  it('GREEN_ZONE_DAMAGE_MULTIPLIER is 0.6 (green zone deals 60% of HIT)', () => {
    expect(GREEN_ZONE_DAMAGE_MULTIPLIER).toBe(0.6)
  })

  it('GRAZE_DAMAGE_MULTIPLIER is derived from HIT_DAMAGE_MULTIPLIER * GREEN_ZONE_DAMAGE_MULTIPLIER', () => {
    expect(GRAZE_DAMAGE_MULTIPLIER).toBeCloseTo(HIT_DAMAGE_MULTIPLIER * GREEN_ZONE_DAMAGE_MULTIPLIER, 10)
  })

  it('GRAZE_DAMAGE_MULTIPLIER is 0.6 (60% of HIT)', () => {
    expect(GRAZE_DAMAGE_MULTIPLIER).toBeCloseTo(0.6, 10)
  })

  it('CRIT multiplier > HIT multiplier > GRAZE multiplier (damage hierarchy)', () => {
    expect(CRIT_DAMAGE_MULTIPLIER).toBeGreaterThan(HIT_DAMAGE_MULTIPLIER)
    expect(HIT_DAMAGE_MULTIPLIER).toBeGreaterThan(GRAZE_DAMAGE_MULTIPLIER)
  })
})

describe('enemy definitions', () => {
  it('Goblin Scout has name "Goblin Scout"', () => {
    expect(ENEMY_GOBLIN_SCOUT.name).toBe('Goblin Scout')
  })

  it('Goblin Scout has 60 HP', () => {
    expect(ENEMY_GOBLIN_SCOUT.maxHp).toBe(60)
  })

  it('Goblin Scout has critZoneScale 1.0 (default head radius)', () => {
    expect(ENEMY_GOBLIN_SCOUT.critZoneScale).toBe(1.0)
  })

  it('Orc Warrior has name "Orc Warrior"', () => {
    expect(ENEMY_ORC_WARRIOR.name).toBe('Orc Warrior')
  })

  it('Orc Warrior has 80 HP', () => {
    expect(ENEMY_ORC_WARRIOR.maxHp).toBe(80)
  })

  it('Orc Warrior has critZoneScale 0.7 (smaller crit zone)', () => {
    expect(ENEMY_ORC_WARRIOR.critZoneScale).toBe(0.7)
  })

  it('Stone Troll has name "Stone Troll"', () => {
    expect(ENEMY_STONE_TROLL.name).toBe('Stone Troll')
  })

  it('Stone Troll has 104 HP', () => {
    expect(ENEMY_STONE_TROLL.maxHp).toBe(104)
  })

  it('Stone Troll has critZoneScale 0.55 (smallest crit zone)', () => {
    expect(ENEMY_STONE_TROLL.critZoneScale).toBe(0.55)
  })

  it('Stone Giant has name "Stone Giant"', () => {
    expect(ENEMY_STONE_GIANT.name).toBe('Stone Giant')
  })

  it('Stone Giant has 140 HP', () => {
    expect(ENEMY_STONE_GIANT.maxHp).toBe(140)
  })

  it('Stone Giant has critZoneScale 0.55', () => {
    expect(ENEMY_STONE_GIANT.critZoneScale).toBe(0.55)
  })

  it('Stone Giant has maskConfig with idle and throw animations', () => {
    expect(ENEMY_STONE_GIANT.maskConfig).toBeDefined()
    expect(ENEMY_STONE_GIANT.maskConfig!.idle.frameCount).toBe(10)
    expect(ENEMY_STONE_GIANT.maskConfig!.throw.frameCount).toBe(7)
  })

  it('HP increases with each level 1-3 enemy (difficulty scaling)', () => {
    expect(ENEMY_ORC_WARRIOR.maxHp).toBeGreaterThan(ENEMY_GOBLIN_SCOUT.maxHp)
    expect(ENEMY_STONE_GIANT.maxHp).toBeGreaterThan(ENEMY_ORC_WARRIOR.maxHp)
  })

  it('critZoneScale decreases with each level 1-3 enemy (smaller crit zone = harder)', () => {
    expect(ENEMY_ORC_WARRIOR.critZoneScale).toBeLessThan(ENEMY_GOBLIN_SCOUT.critZoneScale)
    expect(ENEMY_STONE_GIANT.critZoneScale).toBeLessThan(ENEMY_ORC_WARRIOR.critZoneScale)
  })
})

describe('float text font sizes', () => {
  it('FLOAT_TEXT_FONT_CRIT is 36', () => {
    expect(FLOAT_TEXT_FONT_CRIT).toBe(36)
  })

  it('FLOAT_TEXT_FONT_HIT is derived from FLOAT_TEXT_FONT_CRIT * 0.75', () => {
    expect(FLOAT_TEXT_FONT_HIT).toBeCloseTo(FLOAT_TEXT_FONT_CRIT * 0.75, 10)
  })

  it('FLOAT_TEXT_FONT_GRAZE is derived from FLOAT_TEXT_FONT_CRIT * 0.5', () => {
    expect(FLOAT_TEXT_FONT_GRAZE).toBeCloseTo(FLOAT_TEXT_FONT_CRIT * 0.5, 10)
  })

  it('font size hierarchy: CRIT > HIT > GRAZE', () => {
    expect(FLOAT_TEXT_FONT_CRIT).toBeGreaterThan(FLOAT_TEXT_FONT_HIT)
    expect(FLOAT_TEXT_FONT_HIT).toBeGreaterThan(FLOAT_TEXT_FONT_GRAZE)
  })

  it('all font sizes are positive', () => {
    expect(FLOAT_TEXT_FONT_CRIT).toBeGreaterThan(0)
    expect(FLOAT_TEXT_FONT_HIT).toBeGreaterThan(0)
    expect(FLOAT_TEXT_FONT_GRAZE).toBeGreaterThan(0)
  })
})

describe('float text colors — damage number color mapping', () => {
  it('FLOAT_TEXT_COLOR_CRIT is a non-empty CSS color string', () => {
    expect(FLOAT_TEXT_COLOR_CRIT).toBeTruthy()
    expect(typeof FLOAT_TEXT_COLOR_CRIT).toBe('string')
  })

  it('FLOAT_TEXT_COLOR_HIT is a non-empty CSS color string', () => {
    expect(FLOAT_TEXT_COLOR_HIT).toBeTruthy()
    expect(typeof FLOAT_TEXT_COLOR_HIT).toBe('string')
  })

  it('FLOAT_TEXT_COLOR_GRAZE is a non-empty CSS color string', () => {
    expect(FLOAT_TEXT_COLOR_GRAZE).toBeTruthy()
    expect(typeof FLOAT_TEXT_COLOR_GRAZE).toBe('string')
  })

  it('FLOAT_TEXT_COLOR_MISS is a non-empty CSS color string', () => {
    expect(FLOAT_TEXT_COLOR_MISS).toBeTruthy()
    expect(typeof FLOAT_TEXT_COLOR_MISS).toBe('string')
  })

  it('all four hit result colors are distinct', () => {
    const colors = new Set([
      FLOAT_TEXT_COLOR_CRIT,
      FLOAT_TEXT_COLOR_HIT,
      FLOAT_TEXT_COLOR_GRAZE,
      FLOAT_TEXT_COLOR_MISS,
    ])
    expect(colors.size).toBe(4)
  })

  it('CRIT color differs from HIT color — visual distinction between hit tiers', () => {
    expect(FLOAT_TEXT_COLOR_CRIT).not.toBe(FLOAT_TEXT_COLOR_HIT)
  })

  it('HIT color differs from GRAZE color — visual distinction between hit tiers', () => {
    expect(FLOAT_TEXT_COLOR_HIT).not.toBe(FLOAT_TEXT_COLOR_GRAZE)
  })

  it('MISS color differs from all hit result colors — miss is visually de-emphasised', () => {
    expect(FLOAT_TEXT_COLOR_MISS).not.toBe(FLOAT_TEXT_COLOR_CRIT)
    expect(FLOAT_TEXT_COLOR_MISS).not.toBe(FLOAT_TEXT_COLOR_HIT)
    expect(FLOAT_TEXT_COLOR_MISS).not.toBe(FLOAT_TEXT_COLOR_GRAZE)
  })
})

describe('getHitResultColor — renderer color mapping', () => {
  it('CRIT returns FLOAT_TEXT_COLOR_CRIT', () => {
    expect(getHitResultColor('CRIT')).toBe(FLOAT_TEXT_COLOR_CRIT)
  })

  it('HIT returns FLOAT_TEXT_COLOR_HIT', () => {
    expect(getHitResultColor('HIT')).toBe(FLOAT_TEXT_COLOR_HIT)
  })

  it('GRAZE returns FLOAT_TEXT_COLOR_GRAZE', () => {
    expect(getHitResultColor('GRAZE')).toBe(FLOAT_TEXT_COLOR_GRAZE)
  })

  it('MISS returns FLOAT_TEXT_COLOR_MISS', () => {
    expect(getHitResultColor('MISS')).toBe(FLOAT_TEXT_COLOR_MISS)
  })

  it('CRIT color is distinct from HIT color — visual priority signaling', () => {
    expect(getHitResultColor('CRIT')).not.toBe(getHitResultColor('HIT'))
  })

  it('HIT color is distinct from GRAZE color — visual tier distinction', () => {
    expect(getHitResultColor('HIT')).not.toBe(getHitResultColor('GRAZE'))
  })

  it('all four results map to distinct colors', () => {
    const colors = new Set(['CRIT', 'HIT', 'GRAZE', 'MISS'].map(r => getHitResultColor(r as import('../../types').HitResult)))
    expect(colors.size).toBe(4)
  })
})

describe('LEVELS array', () => {
  it('has 18 levels', () => {
    expect(LEVELS.length).toBe(18)
  })

  it('level numbers are sequential 1–18', () => {
    LEVELS.forEach((l, i) => expect(l.level).toBe(i + 1))
  })

  it('level 1 uses Goblin Scout', () => {
    expect(LEVELS[0].enemyDef.name).toBe('Goblin Scout')
  })

  it('level 2 uses Orc Warrior', () => {
    expect(LEVELS[1].enemyDef.name).toBe('Orc Warrior')
  })

  it('level 3 uses Stone Giant', () => {
    expect(LEVELS[2].enemyDef.name).toBe('Stone Giant')
  })

  it('level 18 uses Titan Lord as final boss', () => {
    expect(LEVELS[17].enemyDef.name).toBe('Titan Lord')
  })

  it('all levels reference a defined enemyDef with positive maxHp', () => {
    for (const level of LEVELS) {
      expect(level.enemyDef).toBeDefined()
      expect(level.enemyDef.maxHp).toBeGreaterThan(0)
    }
  })
})

describe('XP & player leveling constants', () => {
  it('PLAYER_START_LEVEL is 1', () => {
    expect(PLAYER_START_LEVEL).toBe(1)
  })

  it('PLAYER_MAX_LEVEL is the highest key in XP_LEVEL_THRESHOLDS', () => {
    const keys = Object.keys(XP_LEVEL_THRESHOLDS).map(Number)
    expect(PLAYER_MAX_LEVEL).toBe(Math.max(...keys))
  })

  it('XP_LEVEL_THRESHOLDS values are strictly increasing with level', () => {
    const keys = Object.keys(XP_LEVEL_THRESHOLDS).map(Number).sort((a, b) => a - b)
    let prev = 0
    for (const k of keys) {
      const v = XP_LEVEL_THRESHOLDS[k]
      expect(v).toBeGreaterThan(prev)
      prev = v
    }
  })

  it('XP_LEVEL_THRESHOLDS top threshold equals the campaign kill count', () => {
    expect(XP_LEVEL_THRESHOLDS[PLAYER_MAX_LEVEL]).toBe(LEVELS.length)
  })

  it('start level is below max level — at least one level-up exists in a run', () => {
    expect(PLAYER_START_LEVEL).toBeLessThan(PLAYER_MAX_LEVEL)
  })
})
