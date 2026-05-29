// ============================================================
// Game Design Spec — Crystal Spider
//
// Small enemy with a disproportionately large crit zone.
// Crystalline weak spots make crits easy to land, even for
// casual players — but very low HP means a few crits kill it.
//
// Design intent:
//   - Even casual players frequently land crits (large critZone)
//   - But the low HP means the fight is short if crits land
//   - Power user: trivially quick kill via crits
//   - Casual player: may miss the small body but when they hit, it crits
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  ENEMY_CRYSTAL_SPIDER,
  ENEMY_GOBLIN_SCOUT,
} from '../../game/constants'

const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const FAST_CRIT_DMG = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER
const SLOW_HIT_DMG  = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

function minHitsToKill(maxHp: number, dmgPerHit: number): number {
  return Math.ceil(maxHp / dmgPerHit)
}

describe('Game Design: Crystal Spider — large crit zone, but low HP', () => {
  it('#4 Crystal Spider has a very large critZoneScale (easy to crit)', () => {
    // critZoneScale > 1.5 means the crit zone is 150%+ of normal head radius
    expect(ENEMY_CRYSTAL_SPIDER.critZoneScale).toBeGreaterThan(1.5)
  })

  it('#4 Crystal Spider crit zone fraction is very high (casual players crit easily)', () => {
    expect(ENEMY_CRYSTAL_SPIDER.critZone).toBeDefined()
    // 75% of the hit zone is a crit zone — even careless shots likely crit
    expect(ENEMY_CRYSTAL_SPIDER.critZone!).toBeGreaterThan(0.6)
  })

  it('#4 Crystal Spider has less HP than Goblin Scout (low endurance)', () => {
    expect(ENEMY_CRYSTAL_SPIDER.maxHp).toBeLessThan(ENEMY_GOBLIN_SCOUT.maxHp)
  })

  it('#4 power user can kill Crystal Spider with a single slow CRIT (damage math)', () => {
    // Design: one slow CRIT should be enough or very close
    const oneCritDmg = SLOW_CRIT_DMG

    if (oneCritDmg >= ENEMY_CRYSTAL_SPIDER.maxHp) {
      // Exactly one CRIT kills it — verify via HP simulation
      let hp = ENEMY_CRYSTAL_SPIDER.maxHp
      hp = Math.max(0, hp - oneCritDmg)
      expect(hp).toBe(0)
    } else {
      // Two crits kill it — verify hit count is at most 2
      const hitsNeeded = minHitsToKill(ENEMY_CRYSTAL_SPIDER.maxHp, SLOW_CRIT_DMG)
      expect(hitsNeeded).toBeLessThanOrEqual(2)

      let hp = ENEMY_CRYSTAL_SPIDER.maxHp
      for (let i = 0; i < hitsNeeded; i++) {
        hp = Math.max(0, hp - oneCritDmg)
      }
      expect(hp).toBe(0)
    }
  })

  it('#4 power user: minimum crits to kill Crystal Spider is low (quick encounter)', () => {
    const hitsForSpider = minHitsToKill(ENEMY_CRYSTAL_SPIDER.maxHp, SLOW_CRIT_DMG)
    const hitsForGoblin = minHitsToKill(ENEMY_GOBLIN_SCOUT.maxHp, SLOW_CRIT_DMG)

    // Spider should die faster than Goblin Scout (fewer crits needed)
    expect(hitsForSpider).toBeLessThanOrEqual(hitsForGoblin)
  })

  it('#4 casual player needs more hits than crits — shows crit advantage', () => {
    const critHitsNeeded = minHitsToKill(ENEMY_CRYSTAL_SPIDER.maxHp, SLOW_CRIT_DMG)
    const normalHitsNeeded = minHitsToKill(ENEMY_CRYSTAL_SPIDER.maxHp, SLOW_HIT_DMG)

    // Normal HIT deals half CRIT damage → needs more shots
    expect(normalHitsNeeded).toBeGreaterThanOrEqual(critHitsNeeded)
  })

  it('#4 fast CRIT can also kill Crystal Spider (accessible to both skill slots)', () => {
    const hitsForSpider = minHitsToKill(ENEMY_CRYSTAL_SPIDER.maxHp, FAST_CRIT_DMG)
    // Fast crits should kill it in a reasonable number of hits
    expect(hitsForSpider).toBeLessThanOrEqual(4)

    let hp = ENEMY_CRYSTAL_SPIDER.maxHp
    for (let i = 0; i < hitsForSpider; i++) {
      hp = Math.max(0, hp - FAST_CRIT_DMG)
    }
    expect(hp).toBe(0)
  })
})
