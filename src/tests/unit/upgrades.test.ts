import { describe, it, expect } from 'vitest'
import {
  applyUpgradeNode,
  getAvailableNodes,
  getUpgradeNode,
  getUpgradeNodeStatus,
  getXpProgress,
} from '../../game/upgrades'
import {
  DEFAULT_GLOBAL_UPGRADE_STATE,
  UPGRADE_NODES,
  CRIT_DAMAGE_MULTIPLIER,
  PLAYER_MAX_LEVEL,
  PLAYER_START_LEVEL,
  XP_LEVEL_THRESHOLDS,
} from '../../game/constants'
import type { GlobalUpgradeState, UpgradeNodeId } from '../../types'

describe('DEFAULT_GLOBAL_UPGRADE_STATE', () => {
  it('is the no-effect baseline', () => {
    expect(DEFAULT_GLOBAL_UPGRADE_STATE).toEqual({
      castTimeMultiplier: 1.0,
      critDamageMultiplier: CRIT_DAMAGE_MULTIPLIER,
      critZoneTolerance: 0,
      critStunChance: 0,
      critStunDurationMs: 0,
      projectileSpeedMultiplier: 1.0,
      quickChainBonus: 0,
      quickChainWindowMs: 0,
      spellAreaMultiplier: 1.0,
      unlockedNodeIds: [],
    })
  })

  it('is frozen — neither the object nor unlockedNodeIds can be mutated', () => {
    expect(Object.isFrozen(DEFAULT_GLOBAL_UPGRADE_STATE)).toBe(true)
    expect(Object.isFrozen(DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds)).toBe(true)
  })
})

describe('UPGRADE_NODES', () => {
  it('has unique ids', () => {
    const ids = UPGRADE_NODES.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('references only known ids in requires', () => {
    const ids = new Set(UPGRADE_NODES.map((n) => n.id))
    for (const node of UPGRADE_NODES) {
      for (const dep of node.requires) {
        expect(ids.has(dep)).toBe(true)
      }
    }
  })
})

describe('getUpgradeNode', () => {
  it('returns the node matching the id', () => {
    const node = getUpgradeNode('crit_dmg_1')
    expect(node.id).toBe('crit_dmg_1')
    expect(node.title).toBe('Ostré hroty I')
  })

  it('throws for an unknown id', () => {
    expect(() => getUpgradeNode('not_a_real_node' as UpgradeNodeId)).toThrow()
  })
})

describe('applyUpgradeNode', () => {
  it('applies stat changes and records the unlocked node', () => {
    const next = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'crit_dmg_1')
    expect(next.critDamageMultiplier).toBe(2.3)
    expect(next.unlockedNodeIds).toEqual(['crit_dmg_1'])
  })

  it('does not mutate the input state', () => {
    const before: GlobalUpgradeState = { ...DEFAULT_GLOBAL_UPGRADE_STATE, unlockedNodeIds: [] }
    const snapshot = JSON.parse(JSON.stringify(before))
    applyUpgradeNode(before, 'cast_time_1')
    expect(before).toEqual(snapshot)
  })

  it('throws when the node is already unlocked', () => {
    const once = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'cast_time_1')
    expect(() => applyUpgradeNode(once, 'cast_time_1')).toThrow(/already unlocked/)
  })

  it('chains tiers to the final value on a single path', () => {
    let s = DEFAULT_GLOBAL_UPGRADE_STATE
    s = applyUpgradeNode(s, 'cast_time_1')
    expect(s.castTimeMultiplier).toBe(0.90)
    s = applyUpgradeNode(s, 'cast_time_2')
    expect(s.castTimeMultiplier).toBe(0.80)
    s = applyUpgradeNode(s, 'cast_time_3')
    expect(s.castTimeMultiplier).toBe(0.70)
    expect(s.unlockedNodeIds).toEqual(['cast_time_1', 'cast_time_2', 'cast_time_3'])
  })

  it('reaches the documented stun values at tier 2', () => {
    let s = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'crit_dmg_1')
    s = applyUpgradeNode(s, 'crit_dmg_2')
    s = applyUpgradeNode(s, 'crit_stun_1')
    expect(s.critStunChance).toBe(0.20)
    expect(s.critStunDurationMs).toBe(1500)
    s = applyUpgradeNode(s, 'crit_stun_2')
    expect(s.critStunChance).toBe(0.35)
    expect(s.critStunDurationMs).toBe(2000)
  })

  it('reaches the documented quick-chain values at tier 2', () => {
    let s = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'cast_time_1')
    s = applyUpgradeNode(s, 'quick_chain_1')
    expect(s.quickChainBonus).toBe(0.20)
    expect(s.quickChainWindowMs).toBe(800)
    s = applyUpgradeNode(s, 'quick_chain_2')
    expect(s.quickChainBonus).toBe(0.35)
    expect(s.quickChainWindowMs).toBe(1000)
  })
})

describe('applyUpgradeNode — every node produces a non-default value', () => {
  // Each entry maps a node id to a probe: a function that, given the post-apply
  // state, returns the field the node is expected to have changed away from baseline.
  const probes: Record<UpgradeNodeId, (s: GlobalUpgradeState) => number> = {
    cast_time_1: (s) => s.castTimeMultiplier,
    cast_time_2: (s) => s.castTimeMultiplier,
    cast_time_3: (s) => s.castTimeMultiplier,
    crit_dmg_1:  (s) => s.critDamageMultiplier,
    crit_dmg_2:  (s) => s.critDamageMultiplier,
    crit_dmg_3:  (s) => s.critDamageMultiplier,
    crit_zone_1: (s) => s.critZoneTolerance,
    crit_zone_2: (s) => s.critZoneTolerance,
    crit_stun_1: (s) => s.critStunChance,
    crit_stun_2: (s) => s.critStunChance,
    proj_speed_1: (s) => s.projectileSpeedMultiplier,
    proj_speed_2: (s) => s.projectileSpeedMultiplier,
    proj_speed_3: (s) => s.projectileSpeedMultiplier,
    quick_chain_1: (s) => s.quickChainBonus,
    quick_chain_2: (s) => s.quickChainBonus,
    spell_area_1: (s) => s.spellAreaMultiplier,
    spell_area_2: (s) => s.spellAreaMultiplier,
    spell_area_3: (s) => s.spellAreaMultiplier,
  }

  for (const node of UPGRADE_NODES) {
    it(`${node.id} changes its target field`, () => {
      const probe = probes[node.id]
      const baseline = probe(DEFAULT_GLOBAL_UPGRADE_STATE)
      const next = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, node.id)
      expect(probe(next)).not.toBe(baseline)
    })
  }

  it('the deepest crit_dmg tier reaches 3.2', () => {
    let s = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'crit_dmg_1')
    s = applyUpgradeNode(s, 'crit_dmg_2')
    s = applyUpgradeNode(s, 'crit_dmg_3')
    expect(s.critDamageMultiplier).toBe(3.2)
  })

  it('the deepest proj_speed tier reaches 1.5', () => {
    let s = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'proj_speed_1')
    s = applyUpgradeNode(s, 'proj_speed_2')
    s = applyUpgradeNode(s, 'proj_speed_3')
    expect(s.projectileSpeedMultiplier).toBe(1.5)
  })

  it('the deepest spell_area tier reaches 1.6', () => {
    let s = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'spell_area_1')
    s = applyUpgradeNode(s, 'spell_area_2')
    s = applyUpgradeNode(s, 'spell_area_3')
    expect(s.spellAreaMultiplier).toBe(1.6)
  })

  it('the deepest crit_zone tier reaches 0.30', () => {
    let s = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'crit_dmg_1')
    s = applyUpgradeNode(s, 'crit_zone_1')
    s = applyUpgradeNode(s, 'crit_zone_2')
    expect(s.critZoneTolerance).toBe(0.30)
  })
})

describe('getAvailableNodes', () => {
  it('returns only root nodes for the default state', () => {
    const available = getAvailableNodes(DEFAULT_GLOBAL_UPGRADE_STATE).map((n) => n.id)
    expect(available.sort()).toEqual(
      ['cast_time_1', 'crit_dmg_1', 'proj_speed_1', 'spell_area_1'].sort(),
    )
  })

  it('after crit_dmg_1, crit_dmg_2 and crit_zone_1 become available alongside the remaining roots', () => {
    const s = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'crit_dmg_1')
    const available = getAvailableNodes(s).map((n) => n.id).sort()
    expect(available).toEqual(
      ['cast_time_1', 'crit_dmg_2', 'crit_zone_1', 'proj_speed_1', 'spell_area_1'].sort(),
    )
  })

  it('treats quick_chain_1 prerequisites as OR (cast_time_1 OR proj_speed_1)', () => {
    const viaCastTime = getAvailableNodes(
      applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'cast_time_1'),
    ).map((n) => n.id)
    expect(viaCastTime).toContain('quick_chain_1')

    const viaProjSpeed = getAvailableNodes(
      applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'proj_speed_1'),
    ).map((n) => n.id)
    expect(viaProjSpeed).toContain('quick_chain_1')
  })

  it('does not return nodes that are already unlocked', () => {
    const s = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'cast_time_1')
    const available = getAvailableNodes(s).map((n) => n.id)
    expect(available).not.toContain('cast_time_1')
  })

  it('locked deeper tiers stay locked until their prerequisite is unlocked', () => {
    const available = getAvailableNodes(DEFAULT_GLOBAL_UPGRADE_STATE).map((n) => n.id)
    expect(available).not.toContain('cast_time_2')
    expect(available).not.toContain('crit_dmg_2')
    expect(available).not.toContain('crit_stun_1')
    expect(available).not.toContain('quick_chain_1')
    expect(available).not.toContain('spell_area_2')
  })
})

describe('UPGRADE_NODES — every node carries path + description metadata', () => {
  it('every node has a non-empty description', () => {
    for (const node of UPGRADE_NODES) {
      expect(node.description.length).toBeGreaterThan(0)
    }
  })

  it('every node id resolves to a known path classifier', () => {
    const validPaths = new Set(['cast_time', 'crit', 'proj_speed', 'spell_area', 'quick_chain'])
    for (const node of UPGRADE_NODES) {
      expect(validPaths.has(node.path)).toBe(true)
    }
  })
})

describe('getUpgradeNodeStatus', () => {
  it('returns "available" for root nodes and "locked" for nodes whose deps are unmet', () => {
    expect(getUpgradeNodeStatus(DEFAULT_GLOBAL_UPGRADE_STATE, 'crit_dmg_1')).toBe('available')
    expect(getUpgradeNodeStatus(DEFAULT_GLOBAL_UPGRADE_STATE, 'crit_dmg_2')).toBe('locked')
    expect(getUpgradeNodeStatus(DEFAULT_GLOBAL_UPGRADE_STATE, 'quick_chain_1')).toBe('locked')
  })

  it('returns "unlocked" for already-picked nodes', () => {
    const s = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'crit_dmg_1')
    expect(getUpgradeNodeStatus(s, 'crit_dmg_1')).toBe('unlocked')
  })

  it('promotes a locked node to available when ANY prerequisite is satisfied (OR semantics)', () => {
    const viaCast = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'cast_time_1')
    expect(getUpgradeNodeStatus(viaCast, 'quick_chain_1')).toBe('available')
    const viaProj = applyUpgradeNode(DEFAULT_GLOBAL_UPGRADE_STATE, 'proj_speed_1')
    expect(getUpgradeNodeStatus(viaProj, 'quick_chain_1')).toBe('available')
  })
})

describe('getXpProgress', () => {
  it('at start-of-run reports the first XP_LEVEL_THRESHOLDS step with 0 progress', () => {
    const p = getXpProgress(PLAYER_START_LEVEL, 0)
    expect(p.isMax).toBe(false)
    // Non-null assertion safe: tests own the constants table contents.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(p.nextThreshold).toBe(XP_LEVEL_THRESHOLDS[PLAYER_START_LEVEL + 1]!)
    expect(p.progress).toBe(0)
  })

  it('mid-tier reports the (xp - cur) / (next - cur) fraction', () => {
    // Level 2 → next = XP_LEVEL_THRESHOLDS[3], current = XP_LEVEL_THRESHOLDS[2]
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const cur = XP_LEVEL_THRESHOLDS[2]!
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const next = XP_LEVEL_THRESHOLDS[3]!
    const xp = cur + Math.floor((next - cur) / 2)
    const p = getXpProgress(2, xp)
    expect(p.currentThreshold).toBe(cur)
    expect(p.nextThreshold).toBe(next)
    expect(p.progress).toBeCloseTo((xp - cur) / (next - cur), 5)
  })

  it('clamps progress to [0, 1] when xp overshoots or undershoots the band', () => {
    expect(getXpProgress(2, 0).progress).toBe(0)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const next = XP_LEVEL_THRESHOLDS[3]!
    expect(getXpProgress(2, next + 100).progress).toBe(1)
  })

  it('at PLAYER_MAX_LEVEL reports isMax with progress 1', () => {
    const p = getXpProgress(PLAYER_MAX_LEVEL, 999)
    expect(p.isMax).toBe(true)
    expect(p.progress).toBe(1)
  })
})
