// ============================================================
// Game Design Spec — Level Encounter Scenarios
//
// Validates that damage math, HP pools, and level progression
// are consistent across the 18-level campaign.
//
// Uses _applyHitForTesting() for deterministic simulation —
// no Phaser dependency, no projectile physics.
//
// Damage reference:
//   slow_shot CRIT  = SLOW_SKILL_DAMAGE × CRIT_MULTIPLIER = 20 × 2.0 = 40
//   fast_shot CRIT  = FAST_SKILL_DAMAGE × CRIT_MULTIPLIER = 10 × 2.0 = 20
//   slow_shot HIT   = SLOW_SKILL_DAMAGE × HIT_MULTIPLIER  = 20 × 1.0 = 20
//   fast_shot HIT   = FAST_SKILL_DAMAGE × HIT_MULTIPLIER  = 10 × 1.0 = 10
//
// First 3 levels (static enemies):
//   Level 1 — Goblin Scout:  60 HP
//   Level 2 — Orc Warrior:   80 HP
//   Level 3 — Stone Giant:  140 HP
// Final boss (level 18):
//   Level 18 — Titan Lord:  500 HP
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import {
  SLOW_SKILL_DAMAGE,
  FAST_SKILL_DAMAGE,
  CRIT_DAMAGE_MULTIPLIER,
  HIT_DAMAGE_MULTIPLIER,
  GRAZE_DAMAGE_MULTIPLIER,
  ENEMY_GOBLIN_SCOUT,
  ENEMY_ORC_WARRIOR,
  ENEMY_STONE_GIANT,
  LEVELS,
} from '../../game/constants'

// ---------------------------------------------------------------------------
// Derived damage constants (shared across tests for clarity)
// ---------------------------------------------------------------------------

/** slow_shot CRIT damage: 20 × 2.0 = 40 */
const SLOW_CRIT_DMG = SLOW_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER

/** fast_shot CRIT damage: 10 × 2.0 = 20 */
const FAST_CRIT_DMG = FAST_SKILL_DAMAGE * CRIT_DAMAGE_MULTIPLIER

/** slow_shot HIT damage: 20 × 1.0 = 20 */
const SLOW_HIT_DMG = SLOW_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

/** fast_shot HIT damage: 10 × 1.0 = 10 */
const FAST_HIT_DMG = FAST_SKILL_DAMAGE * HIT_DAMAGE_MULTIPLIER

/** slow_shot GRAZE damage: 20 × 0.6 = 12 (green zone = 60% of HIT) */
const SLOW_GRAZE_DMG = SLOW_SKILL_DAMAGE * GRAZE_DAMAGE_MULTIPLIER

/** fast_shot GRAZE damage: 10 × 0.6 = 6 (green zone = 60% of HIT) */
const FAST_GRAZE_DMG = FAST_SKILL_DAMAGE * GRAZE_DAMAGE_MULTIPLIER

// ---------------------------------------------------------------------------
// Helper: create a fresh machine at a given level
// ---------------------------------------------------------------------------

function createMachineAtLevel(level: 1 | 2 | 3): GameStateMachine {
  const machine = new GameStateMachine()
  machine.startBattle() // Level 1 battle starts

  if (level >= 2) {
    // Defeat Level 1 to reach level_complete, then advance
    machine._applyHitForTesting('CRIT', 'slow_shot') // 40 HP
    machine._applyHitForTesting('CRIT', 'slow_shot') // 80 HP — overshoots 60, HP → 0
    // Now phase = fight_overview; advance to Level 2
    machine.confirmLevelUpUpgrade()
    machine.nextLevel()
  }

  if (level >= 3) {
    // Defeat Level 2 (Orc Warrior, 80 HP) to reach level_complete
    machine._applyHitForTesting('CRIT', 'slow_shot') // 40
    machine._applyHitForTesting('CRIT', 'slow_shot') // 80 — HP → 0
    // Now phase = fight_overview; advance to Level 3
    machine.confirmLevelUpUpgrade()
    machine.nextLevel()
  }

  return machine
}

// ===========================================================================
// Level 1 — Goblin Scout (60 HP)
// ===========================================================================

describe('Game Design: Level 1 — Goblin Scout encounter', () => {
  let machine: GameStateMachine

  beforeEach(() => {
    machine = createMachineAtLevel(1)
  })

  it('#7 drives GameStateMachine directly — no Phaser dependency', () => {
    // Verify we are in the battle phase and using the correct enemy
    const state = machine.getState()
    expect(state.phase).toBe('battle')
    expect(state.enemyName).toBe(ENEMY_GOBLIN_SCOUT.name)
    expect(state.currentLevel).toBe(1)
  })

  it('#2 damage constants: slow CRIT = 40, fast CRIT = 20, total = 60 = maxHp', () => {
    expect(SLOW_CRIT_DMG).toBe(40)
    expect(FAST_CRIT_DMG).toBe(20)
    expect(SLOW_CRIT_DMG + FAST_CRIT_DMG).toBe(ENEMY_GOBLIN_SCOUT.maxHp)
  })

  it('#6 zone multipliers and skill damages produce expected HP reduction', () => {
    const beforeState = machine.getState()
    expect(beforeState.enemyHp).toBe(60)

    // First hit: slow_shot CRIT → -40 HP
    machine._applyHitForTesting('CRIT', 'slow_shot')
    expect(machine.getState().enemyHp).toBe(20)

    // Second hit: fast_shot CRIT → -20 HP
    machine._applyHitForTesting('CRIT', 'fast_shot')
    expect(machine.getState().enemyHp).toBe(0)
  })

  it('#1 power user: 1 slow CRIT + 1 fast CRIT → HP = 0, phase = fight_overview', () => {
    machine._applyHitForTesting('CRIT', 'slow_shot') // 60 - 40 = 20
    machine._applyHitForTesting('CRIT', 'fast_shot') // 20 - 20 = 0

    const state = machine.getState()
    expect(state.enemyHp).toBe(0)
    expect(state.phase).toBe('fight_overview')
  })

  it('power user: 3 slow CRITs also defeat the enemy (overkill path)', () => {
    machine._applyHitForTesting('CRIT', 'slow_shot') // 60 - 40 = 20
    machine._applyHitForTesting('CRIT', 'slow_shot') // 20 - 40 → clamped to 0

    const state = machine.getState()
    expect(state.enemyHp).toBe(0)
    expect(state.phase).toBe('fight_overview')
  })

  it('verifies HIT and GRAZE damage values for Level 1 enemy', () => {
    const start = machine.getState().enemyHp

    machine._applyHitForTesting('HIT', 'slow_shot')
    expect(machine.getState().enemyHp).toBe(start - SLOW_HIT_DMG)

    machine._applyHitForTesting('HIT', 'fast_shot')
    expect(machine.getState().enemyHp).toBe(start - SLOW_HIT_DMG - FAST_HIT_DMG)

    machine._applyHitForTesting('GRAZE', 'slow_shot')
    expect(machine.getState().enemyHp).toBe(start - SLOW_HIT_DMG - FAST_HIT_DMG - SLOW_GRAZE_DMG)

    machine._applyHitForTesting('GRAZE', 'fast_shot')
    expect(machine.getState().enemyHp).toBe(
      start - SLOW_HIT_DMG - FAST_HIT_DMG - SLOW_GRAZE_DMG - FAST_GRAZE_DMG,
    )
  })

  it('MISS deals zero damage', () => {
    const before = machine.getState().enemyHp
    machine._applyHitForTesting('MISS', 'slow_shot')
    expect(machine.getState().enemyHp).toBe(before)
  })

  it('#4 green zone (GRAZE) deals 60% of HIT damage — slow_shot GRAZE = SLOW_HIT_DMG * 0.6', () => {
    const before = machine.getState().enemyHp

    machine._applyHitForTesting('GRAZE', 'slow_shot')
    const afterGraze = machine.getState().enemyHp

    // GRAZE damage must equal baseDamage * GREEN_ZONE_DAMAGE_MULTIPLIER (60% of HIT)
    expect(before - afterGraze).toBeCloseTo(SLOW_GRAZE_DMG, 10)
    expect(before - afterGraze).toBeCloseTo(SLOW_HIT_DMG * 0.6, 10)
  })

  it('#4 green zone (GRAZE) deals 60% of HIT damage — fast_shot GRAZE = FAST_HIT_DMG * 0.6', () => {
    const before = machine.getState().enemyHp

    machine._applyHitForTesting('GRAZE', 'fast_shot')
    const afterGraze = machine.getState().enemyHp

    expect(before - afterGraze).toBeCloseTo(FAST_GRAZE_DMG, 10)
    expect(before - afterGraze).toBeCloseTo(FAST_HIT_DMG * 0.6, 10)
  })
})

// ===========================================================================
// Level 2 — Orc Warrior (80 HP)
// Level 2 swaps skills: left = fast_shot, right = slow_shot
// ===========================================================================

describe('Game Design: Level 2 — Orc Warrior encounter', () => {
  let machine: GameStateMachine

  beforeEach(() => {
    machine = createMachineAtLevel(2)
  })

  it('#7 drives GameStateMachine directly — correct enemy loaded for Level 2', () => {
    const state = machine.getState()
    expect(state.phase).toBe('battle')
    expect(state.enemyName).toBe(ENEMY_ORC_WARRIOR.name)
    expect(state.enemyMaxHp).toBe(80)
    expect(state.currentLevel).toBe(2)
  })

  it('#6 zone multipliers produce correct HP reduction for Orc Warrior', () => {
    expect(machine.getState().enemyHp).toBe(80)

    // slow_shot CRIT = 40
    machine._applyHitForTesting('CRIT', 'slow_shot')
    expect(machine.getState().enemyHp).toBe(40)
  })

  it('#3 power user: 2 slow CRITs (2×40=80) → Orc Warrior HP = 0, phase = fight_overview', () => {
    machine._applyHitForTesting('CRIT', 'slow_shot') // 80 - 40 = 40
    machine._applyHitForTesting('CRIT', 'slow_shot') // 40 - 40 = 0

    const state = machine.getState()
    expect(state.enemyHp).toBe(0)
    expect(state.phase).toBe('fight_overview')
  })

  it('#4 alt path: 4 fast CRITs (4×20=80) → Orc Warrior HP = 0, phase = fight_overview', () => {
    machine._applyHitForTesting('CRIT', 'fast_shot') // 80 - 20 = 60
    machine._applyHitForTesting('CRIT', 'fast_shot') // 60 - 20 = 40
    machine._applyHitForTesting('CRIT', 'fast_shot') // 40 - 20 = 20
    machine._applyHitForTesting('CRIT', 'fast_shot') // 20 - 20 = 0

    const state = machine.getState()
    expect(state.enemyHp).toBe(0)
    expect(state.phase).toBe('fight_overview')
  })

  it('mixed path: 1 slow CRIT + 2 fast CRITs → 40+20+20=80 HP dealt', () => {
    machine._applyHitForTesting('CRIT', 'slow_shot') // 80 - 40 = 40
    machine._applyHitForTesting('CRIT', 'fast_shot') // 40 - 20 = 20
    machine._applyHitForTesting('CRIT', 'fast_shot') // 20 - 20 = 0

    const state = machine.getState()
    expect(state.enemyHp).toBe(0)
    expect(state.phase).toBe('fight_overview')
  })
})

// ===========================================================================
// Level 3 — Stone Giant (140 HP)
// ===========================================================================

describe('Game Design: Level 3 — Stone Giant encounter', () => {
  let machine: GameStateMachine

  beforeEach(() => {
    machine = createMachineAtLevel(3)
  })

  it('#7 drives GameStateMachine directly — correct enemy loaded for Level 3', () => {
    const state = machine.getState()
    expect(state.phase).toBe('battle')
    expect(state.enemyName).toBe(ENEMY_STONE_GIANT.name)
    expect(state.enemyMaxHp).toBe(ENEMY_STONE_GIANT.maxHp)
    expect(state.currentLevel).toBe(3)
  })

  it('#6 zone multipliers produce correct HP reduction for Stone Giant', () => {
    expect(machine.getState().enemyHp).toBe(ENEMY_STONE_GIANT.maxHp)

    machine._applyHitForTesting('CRIT', 'slow_shot') // -40
    expect(machine.getState().enemyHp).toBe(ENEMY_STONE_GIANT.maxHp - SLOW_CRIT_DMG)

    machine._applyHitForTesting('CRIT', 'fast_shot') // -20
    expect(machine.getState().enemyHp).toBe(ENEMY_STONE_GIANT.maxHp - SLOW_CRIT_DMG - FAST_CRIT_DMG)
  })

  it('#5 power user: enough slow CRITs to deplete Stone Giant HP → fight_overview', () => {
    // 4 slow CRITs = 4 × 40 = 160 > 140 — defeats the giant
    const hitsNeeded = Math.ceil(ENEMY_STONE_GIANT.maxHp / SLOW_CRIT_DMG)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }

    const state = machine.getState()
    expect(state.enemyHp).toBe(0)
    // Level 3 is not the last level (18 levels total) → fight_overview, not victory
    expect(state.phase).toBe('fight_overview')
  })

  it('#5 alt path: mixed crits deplete the Stone Giant', () => {
    // 140 HP: 3 slow CRIT (120) + 1 fast CRIT (20) = 140 — exact kill
    machine._applyHitForTesting('CRIT', 'slow_shot') // 140 → 100
    machine._applyHitForTesting('CRIT', 'slow_shot') // 100 →  60
    machine._applyHitForTesting('CRIT', 'slow_shot') //  60 →  20
    // 20 HP remaining — not zero yet
    expect(machine.getState().enemyHp).toBe(20)
    expect(machine.getState().phase).toBe('battle')

    machine._applyHitForTesting('CRIT', 'fast_shot') // 20 - 20 → 0
    expect(machine.getState().enemyHp).toBe(0)
    expect(machine.getState().phase).toBe('fight_overview')
  })

  it('HP cannot go below zero (clamped)', () => {
    // Apply massive overkill
    for (let i = 0; i < 10; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(machine.getState().enemyHp).toBe(0)
  })
})

// ===========================================================================
// Level progression difficulty validation — design intent tests
// Each test expresses INTENT (e.g. "harder enemy requires more hits") not math.
// No hardcoded numbers — all values derived from constants.ts.
// Survives a game designer tweaking a constant.
// ===========================================================================

describe('Game Design: Level difficulty progression — harder enemies need more hits', () => {
  /**
   * Computes the minimum number of slow CRITs needed to deplete an enemy's HP.
   * Used to compare difficulty across levels without hardcoding values.
   */
  function minSlowCritsToKill(maxHp: number): number {
    return Math.ceil(maxHp / SLOW_CRIT_DMG)
  }

  it('Level 2 enemy requires at least as many slow CRITs to kill as Level 1 (not easier)', () => {
    const hitsForLevel1 = minSlowCritsToKill(ENEMY_GOBLIN_SCOUT.maxHp)
    const hitsForLevel2 = minSlowCritsToKill(ENEMY_ORC_WARRIOR.maxHp)
    expect(hitsForLevel2).toBeGreaterThanOrEqual(hitsForLevel1)
  })

  it('Level 3 enemy requires at least as many slow CRITs to kill as Level 2 (not easier)', () => {
    const hitsForLevel2 = minSlowCritsToKill(ENEMY_ORC_WARRIOR.maxHp)
    const hitsForLevel3 = minSlowCritsToKill(ENEMY_STONE_GIANT.maxHp)
    expect(hitsForLevel3).toBeGreaterThanOrEqual(hitsForLevel2)
  })

  it('Level 3 crit zone is not easier than Level 1 (critZoneScale only decreases or stays same)', () => {
    // Lower critZoneScale = smaller head = harder crit zone
    expect(ENEMY_STONE_GIANT.critZoneScale).toBeLessThanOrEqual(ENEMY_GOBLIN_SCOUT.critZoneScale)
  })

  it('Level 2 crit zone is not easier than Level 1', () => {
    expect(ENEMY_ORC_WARRIOR.critZoneScale).toBeLessThanOrEqual(ENEMY_GOBLIN_SCOUT.critZoneScale)
  })

  it('A power user can complete Level 1 using only slow_shot CRITs', () => {
    const machine = createMachineAtLevel(1)
    const hitsNeeded = minSlowCritsToKill(ENEMY_GOBLIN_SCOUT.maxHp)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(machine.getState().enemyHp).toBe(0)
    expect(machine.getState().phase).toBe('fight_overview')
  })

  it('A power user can complete Level 2 using only slow_shot CRITs', () => {
    const machine = createMachineAtLevel(2)
    const hitsNeeded = minSlowCritsToKill(ENEMY_ORC_WARRIOR.maxHp)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(machine.getState().enemyHp).toBe(0)
    expect(machine.getState().phase).toBe('fight_overview')
  })

  it('A power user can complete Level 3 using only slow_shot CRITs (leads to fight_overview)', () => {
    const machine = createMachineAtLevel(3)
    const hitsNeeded = minSlowCritsToKill(ENEMY_STONE_GIANT.maxHp)
    for (let i = 0; i < hitsNeeded; i++) {
      machine._applyHitForTesting('CRIT', 'slow_shot')
    }
    expect(machine.getState().enemyHp).toBe(0)
    expect(machine.getState().phase).toBe('fight_overview')
  })

  it('A power user can complete all 18 levels in sequence — fight_overview after last kill', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    for (let i = 0; i < LEVELS.length; i++) {
      const hitsNeeded = minSlowCritsToKill(LEVELS[i].enemyDef.maxHp)
      for (let j = 0; j < hitsNeeded; j++) machine._applyHitForTesting('CRIT', 'slow_shot')
      if (i < LEVELS.length - 1) {
        expect(machine.getState().phase).toBe('fight_overview')
        machine.confirmLevelUpUpgrade()
        machine.nextLevel()
      }
    }
    // After the last kill the game enters fight_overview (not victory).
    // completeFightOverview() → restartGame() is the exit path.
    expect(machine.getState().phase).toBe('fight_overview')
    expect(machine.getState().currentLevel).toBe(18)
  })
})

// ===========================================================================
// Level progression: nextLevel() transitions
// ===========================================================================

describe('Game Design: Level progression transitions', () => {
  it('Level 1 → fight_overview → nextLevel() loads Level 2 enemy', () => {
    const machine = new GameStateMachine()
    machine.startBattle()

    // Defeat Level 1
    machine._applyHitForTesting('CRIT', 'slow_shot') // 40
    machine._applyHitForTesting('CRIT', 'slow_shot') // 80 → 0
    expect(machine.getState().phase).toBe('fight_overview')
    expect(machine.getState().currentLevel).toBe(1)

    machine.confirmLevelUpUpgrade()
    machine.nextLevel()
    const state = machine.getState()
    expect(state.phase).toBe('battle')
    expect(state.currentLevel).toBe(2)
    expect(state.enemyName).toBe(ENEMY_ORC_WARRIOR.name)
    expect(state.enemyHp).toBe(ENEMY_ORC_WARRIOR.maxHp)
    expect(state.enemyMaxHp).toBe(ENEMY_ORC_WARRIOR.maxHp)
  })

  it('Level 2 → fight_overview → nextLevel() loads Level 3 enemy', () => {
    const machine = createMachineAtLevel(2)

    machine._applyHitForTesting('CRIT', 'slow_shot') // 40
    machine._applyHitForTesting('CRIT', 'slow_shot') // 80 → 0
    expect(machine.getState().phase).toBe('fight_overview')

    machine.confirmLevelUpUpgrade()
    machine.nextLevel()
    const state = machine.getState()
    expect(state.phase).toBe('battle')
    expect(state.currentLevel).toBe(3)
    expect(state.enemyName).toBe(ENEMY_STONE_GIANT.name)
    expect(state.enemyHp).toBe(ENEMY_STONE_GIANT.maxHp)
  })

  it('Level 3 defeat → fight_overview (continues to level 4)', () => {
    const machine = createMachineAtLevel(3)

    // Stone Giant: 140 HP. 4× CRIT slow_shot = 4 × 40 = 160 (overkill)
    machine._applyHitForTesting('CRIT', 'slow_shot') // 140 → 100
    machine._applyHitForTesting('CRIT', 'slow_shot') // 100 →  60
    machine._applyHitForTesting('CRIT', 'slow_shot') //  60 →  20
    machine._applyHitForTesting('CRIT', 'slow_shot') //  20 →   0

    expect(machine.getState().phase).toBe('fight_overview')
  })

  it('nextLevel() is a no-op when not in level_complete or fight_overview phase', () => {
    const machine = new GameStateMachine()
    machine.startBattle()
    // Still in battle — nextLevel() should not change anything
    machine.nextLevel()
    expect(machine.getState().currentLevel).toBe(1)
    expect(machine.getState().phase).toBe('battle')
  })
})
