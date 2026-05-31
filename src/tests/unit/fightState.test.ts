// ============================================================
// FightState unit tests — coverage for uncovered branches
// ============================================================

import { describe, it, expect } from 'vitest'
import { FightState } from '../../game/systems/FightState'
import type { EnemyDef, FightInitSnapshot, FightStats } from '../../types'
import { DEFAULT_GLOBAL_UPGRADE_STATE, PLAYER_MAX_HP } from '../../game/constants'

const SNAPSHOT: FightInitSnapshot = {
  upgrades: { ...DEFAULT_GLOBAL_UPGRADE_STATE, unlockedNodeIds: [] },
  playerMaxHp: PLAYER_MAX_HP,
}

const DEF_NO_GRAPH: EnemyDef = {
  name: 'Test Enemy',
  maxHp: 50,
}

const DEF_WITH_GRAPH: EnemyDef = {
  name: 'Graph Enemy',
  maxHp: 60,
  behaviorGraph: {
    start: 'idle',
    nodes: {
      idle: {
        id: 'idle',
        animKey: 'idle',
        exitTrigger: { kind: 'afterMs', ms: 1000 },
        edges: [],
      },
    },
  },
}

const DUMMY_FIGHT_STATS: FightStats = {
  left: { skillType: 'slow_shot', fireCount: 3, hitsByResult: { CRIT: 1, HIT: 1, GRAZE: 0, MISS: 1 }, totalDamage: 10, touchGaps: [100, 200] },
  right: { skillType: 'fast_shot', fireCount: 2, hitsByResult: { CRIT: 0, HIT: 2, GRAZE: 0, MISS: 0 }, totalDamage: 5, touchGaps: [50] },
  durationMs: 3000,
}

describe('FightState — constructor without behaviorGraph', () => {
  it('runner is undefined when EnemyDef has no behaviorGraph', () => {
    const fs = new FightState(DEF_NO_GRAPH, SNAPSHOT)
    expect(fs.runner).toBeUndefined()
  })
})

describe('FightState — constructor with behaviorGraph', () => {
  it('runner is defined when EnemyDef has a behaviorGraph', () => {
    const fs = new FightState(DEF_WITH_GRAPH, SNAPSHOT)
    expect(fs.runner).toBeDefined()
  })
})

describe('FightState.buildResult()', () => {
  it('returns xpGained=1 and playerSurvived=true when player wins', () => {
    const fs = new FightState(DEF_NO_GRAPH, SNAPSHOT)
    const result = fs.buildResult(DUMMY_FIGHT_STATS, true)
    expect(result.xpGained).toBe(1)
    expect(result.playerSurvived).toBe(true)
  })

  it('returns xpGained=0 and playerSurvived=false when player loses', () => {
    const fs = new FightState(DEF_NO_GRAPH, SNAPSHOT)
    const result = fs.buildResult(DUMMY_FIGHT_STATS, false)
    expect(result.xpGained).toBe(0)
    expect(result.playerSurvived).toBe(false)
  })

  it('deep-copies fightStats into the snapshot', () => {
    const fs = new FightState(DEF_NO_GRAPH, SNAPSHOT)
    const result = fs.buildResult(DUMMY_FIGHT_STATS, true)
    const snap = result.statsSnapshot
    expect(snap.durationMs).toBe(DUMMY_FIGHT_STATS.durationMs)
    expect(snap.left.totalDamage).toBe(DUMMY_FIGHT_STATS.left.totalDamage)
    expect(snap.right.hitsByResult).toEqual(DUMMY_FIGHT_STATS.right.hitsByResult)
    // Verify deep copy — mutation of original does not affect snapshot
    DUMMY_FIGHT_STATS.left.totalDamage = 999
    expect(snap.left.totalDamage).toBe(10)
    DUMMY_FIGHT_STATS.left.totalDamage = 10 // restore
  })
})
