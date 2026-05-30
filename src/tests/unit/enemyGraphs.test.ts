// ============================================================
// enemyGraphs — smoke tests verifying all 11 ENEMY_POOL graphs
// actually emit an attack and deal HP damage via runner+delivery.
// Contract: TASK-60.6 AC#5.
// ============================================================

import { describe, it, expect } from 'vitest'
import { EnemyBehaviorRunner } from '../../game/systems/EnemyBehaviorRunner'
import type { BehaviorContext } from '../../game/systems/EnemyBehaviorRunner'
import { DeliverySystem } from '../../game/systems/DeliverySystem'
import type { BehaviorGraph } from '../../types'
import {
  stoneGiantGraph,
  plagueRatGraph,
  iceGiantGraph,
  crystalSpiderGraph,
  emberWispGraph,
  ironGolemGraph,
  ancientTreantGraph,
  goblinScoutGraph,
  orcWarriorGraph,
  mirrorKnightGraph,
  insectSwarmGraph,
} from '../../game/enemyGraphs'
import {
  ENEMY_STONE_GIANT_ATTACK_DAMAGE,
  ENEMY_PLAGUE_RAT_ATTACK_DAMAGE,
  ENEMY_ICE_GIANT_ATTACK_DAMAGE,
  ENEMY_ICE_GIANT_THROW_DAMAGE,
  ENEMY_CRYSTAL_SPIDER_ATTACK_DAMAGE,
  ENEMY_CRYSTAL_SPIDER_MANDIBLE_DAMAGE,
  ENEMY_CRYSTAL_SPIDER_BITE_DAMAGE,
  ENEMY_EMBER_WISP_ATTACK_DAMAGE,
  ENEMY_IRON_GOLEM_ATTACK_DAMAGE,
  ENEMY_ANCIENT_TREANT_ATTACK_DAMAGE,
  ENEMY_GOBLIN_SCOUT_ATTACK_DAMAGE,
  ENEMY_ORC_WARRIOR_ATTACK_DAMAGE,
  ENEMY_MIRROR_KNIGHT_ATTACK_DAMAGE,
  ENEMY_INSECT_SWARM_ATTACK_DAMAGE,
} from '../../game/enemyAttackConstants'

// Canvas coordinates for the delivery system smoke test.
const ENEMY_CENTRE = { x: 195, y: 270 }
const PLAYER_CENTRE = { x: 195, y: 770 }

// Default context: full HP, not stunned, frame 0, animation not done.
function ctx(overrides: Partial<BehaviorContext> = {}): BehaviorContext {
  return { frameIndex: 0, animationComplete: false, enemyHpPct: 1, isStunned: false, ...overrides }
}

/**
 * Simulate runner + delivery until the first DeliveryHitEvent.
 * Returns the total damage delivered, or 0 if the graph never attacks within the
 * given tick budget (which would be a test failure).
 *
 * Strategy:
 *   1. Tick large dt chunks to exhaust idle/dwell timers quickly.
 *   2. Once in an attack node, send animationComplete=true with a frame >= releaseFrame
 *      to trigger the attack and exit the attack node.
 *   3. Feed spawned attacks to DeliverySystem and advance until a hit event.
 */
function simulateFirstHit(graph: BehaviorGraph, maxTicksMs = 20_000): number {
  const runner = new EnemyBehaviorRunner(graph)
  const delivery = new DeliverySystem()

  let elapsed = 0
  const DT = 100 // ms per tick

  while (elapsed < maxTicksMs) {
    const node = runner.currentNode
    const isAttackNode = node.exitTrigger.kind === 'animationComplete'

    const frameIndex = isAttackNode && node.attack ? node.attack.releaseFrame + 1 : 0
    const animationComplete = isAttackNode

    const result = runner.tick(DT, ctx({ frameIndex, animationComplete }))

    for (const attackSpec of result.attacks) {
      delivery.spawn(attackSpec, ENEMY_CENTRE, PLAYER_CENTRE)
    }

    const hits = delivery.update(DT)
    if (hits.length > 0) {
      return hits.reduce((sum, h) => sum + h.damage, 0)
    }

    elapsed += DT
  }

  return 0 // no hit within budget
}

// ============================================================
// Pure TS purity check
// ============================================================

describe('enemyGraphs — no Phaser imports', () => {
  it('enemyGraphs.ts has no phaser import', async () => {
    const fs = await import('node:fs')
    const url = await import('node:url')
    const path = url.fileURLToPath(new URL('../../game/enemyGraphs.ts', import.meta.url))
    const src = fs.readFileSync(path, 'utf8')
    expect(src).not.toMatch(/from ['"]phaser['"]/)
  })

  it('enemyAttackConstants.ts has no phaser import', async () => {
    const fs = await import('node:fs')
    const url = await import('node:url')
    const path = url.fileURLToPath(new URL('../../game/enemyAttackConstants.ts', import.meta.url))
    const src = fs.readFileSync(path, 'utf8')
    expect(src).not.toMatch(/from ['"]phaser['"]/)
  })
})

// ============================================================
// All 11 enemies emit an attack and deal the correct HP damage
// ============================================================

describe('enemyGraphs — each enemy emits an attack and deals HP damage (AC#5)', () => {
  it('Stone Giant: orb attack deals ENEMY_STONE_GIANT_ATTACK_DAMAGE', () => {
    const damage = simulateFirstHit(stoneGiantGraph)
    expect(damage).toBe(ENEMY_STONE_GIANT_ATTACK_DAMAGE)
  })

  it('Plague Rat: overlay attack deals ENEMY_PLAGUE_RAT_ATTACK_DAMAGE', () => {
    const damage = simulateFirstHit(plagueRatGraph)
    expect(damage).toBe(ENEMY_PLAGUE_RAT_ATTACK_DAMAGE)
  })

  it('Ice Giant: attack deals one of its two configured damage values', () => {
    const damage = simulateFirstHit(iceGiantGraph)
    // Weighted random picks either windup or throw; both are valid.
    expect([ENEMY_ICE_GIANT_ATTACK_DAMAGE, ENEMY_ICE_GIANT_THROW_DAMAGE]).toContain(damage)
  })

  it('Ice Giant windup node deals ENEMY_ICE_GIANT_ATTACK_DAMAGE (forced RNG → windup)', () => {
    // Force RNG to pick the first edge (windup).
    const rng = () => 0  // always picks edge index 0
    const runner = new EnemyBehaviorRunner(iceGiantGraph, rng)
    const delivery = new DeliverySystem()

    let totalDamage = 0
    for (let t = 0; t < 20_000; t += 100) {
      const node = runner.currentNode
      const isAttack = node.exitTrigger.kind === 'animationComplete'
      const fi = isAttack && node.attack ? node.attack.releaseFrame + 1 : 0
      const { attacks } = runner.tick(100, ctx({ frameIndex: fi, animationComplete: isAttack }))
      for (const a of attacks) delivery.spawn(a, ENEMY_CENTRE, PLAYER_CENTRE)
      const hits = delivery.update(100)
      if (hits.length > 0) {
        totalDamage = hits[0].damage
        break
      }
    }

    expect(totalDamage).toBe(ENEMY_ICE_GIANT_ATTACK_DAMAGE)
  })

  it('Ice Giant throw node deals ENEMY_ICE_GIANT_THROW_DAMAGE (forced RNG → throw)', () => {
    // Force RNG to pick the second edge (throw) by returning a value that lands on it.
    const rng = () => 0.99
    const runner = new EnemyBehaviorRunner(iceGiantGraph, rng)
    const delivery = new DeliverySystem()

    let totalDamage = 0
    for (let t = 0; t < 20_000; t += 100) {
      const node = runner.currentNode
      const isAttack = node.exitTrigger.kind === 'animationComplete'
      const fi = isAttack && node.attack ? node.attack.releaseFrame + 1 : 0
      const { attacks } = runner.tick(100, ctx({ frameIndex: fi, animationComplete: isAttack }))
      for (const a of attacks) delivery.spawn(a, ENEMY_CENTRE, PLAYER_CENTRE)
      const hits = delivery.update(100)
      if (hits.length > 0) {
        totalDamage = hits[0].damage
        break
      }
    }

    expect(totalDamage).toBe(ENEMY_ICE_GIANT_THROW_DAMAGE)
  })

  it('Crystal Spider: attack deals one of its three configured damage values', () => {
    const damage = simulateFirstHit(crystalSpiderGraph)
    expect([
      ENEMY_CRYSTAL_SPIDER_ATTACK_DAMAGE,
      ENEMY_CRYSTAL_SPIDER_MANDIBLE_DAMAGE,
      ENEMY_CRYSTAL_SPIDER_BITE_DAMAGE,
    ]).toContain(damage)
  })

  it('Crystal Spider: all three attack types can be triggered (forced RNG coverage)', () => {
    const rngs = [0, 0.5, 0.99]
    const allDamages = new Set<number>()

    for (const rngVal of rngs) {
      const rng = () => rngVal
      const runner = new EnemyBehaviorRunner(crystalSpiderGraph, rng)
      const delivery = new DeliverySystem()
      for (let t = 0; t < 20_000; t += 100) {
        const node = runner.currentNode
        const isAttack = node.exitTrigger.kind === 'animationComplete'
        const fi = isAttack && node.attack ? node.attack.releaseFrame + 1 : 0
        const { attacks } = runner.tick(100, ctx({ frameIndex: fi, animationComplete: isAttack }))
        for (const a of attacks) delivery.spawn(a, ENEMY_CENTRE, PLAYER_CENTRE)
        const hits = delivery.update(100)
        if (hits.length > 0) { allDamages.add(hits[0].damage); break }
      }
    }

    // All three damage values should appear across the three RNG seeds.
    expect(allDamages).toContain(ENEMY_CRYSTAL_SPIDER_ATTACK_DAMAGE)
    expect(allDamages).toContain(ENEMY_CRYSTAL_SPIDER_MANDIBLE_DAMAGE)
    expect(allDamages).toContain(ENEMY_CRYSTAL_SPIDER_BITE_DAMAGE)
  })

  it('Ember Wisp: orb attack deals ENEMY_EMBER_WISP_ATTACK_DAMAGE', () => {
    const damage = simulateFirstHit(emberWispGraph)
    expect(damage).toBe(ENEMY_EMBER_WISP_ATTACK_DAMAGE)
  })

  it('Iron Golem: overlay attack deals ENEMY_IRON_GOLEM_ATTACK_DAMAGE', () => {
    const damage = simulateFirstHit(ironGolemGraph)
    expect(damage).toBe(ENEMY_IRON_GOLEM_ATTACK_DAMAGE)
  })

  it('Ancient Treant: overlay attack deals ENEMY_ANCIENT_TREANT_ATTACK_DAMAGE', () => {
    const damage = simulateFirstHit(ancientTreantGraph)
    expect(damage).toBe(ENEMY_ANCIENT_TREANT_ATTACK_DAMAGE)
  })

  it('Goblin Scout: orb attack deals ENEMY_GOBLIN_SCOUT_ATTACK_DAMAGE', () => {
    const damage = simulateFirstHit(goblinScoutGraph)
    expect(damage).toBe(ENEMY_GOBLIN_SCOUT_ATTACK_DAMAGE)
  })

  it('Orc Warrior: overlay attack deals ENEMY_ORC_WARRIOR_ATTACK_DAMAGE', () => {
    const damage = simulateFirstHit(orcWarriorGraph)
    expect(damage).toBe(ENEMY_ORC_WARRIOR_ATTACK_DAMAGE)
  })

  it('Mirror Knight: overlay attack deals ENEMY_MIRROR_KNIGHT_ATTACK_DAMAGE', () => {
    const damage = simulateFirstHit(mirrorKnightGraph)
    expect(damage).toBe(ENEMY_MIRROR_KNIGHT_ATTACK_DAMAGE)
  })

  it('Insect Swarm: orb attack deals ENEMY_INSECT_SWARM_ATTACK_DAMAGE', () => {
    const damage = simulateFirstHit(insectSwarmGraph)
    expect(damage).toBe(ENEMY_INSECT_SWARM_ATTACK_DAMAGE)
  })
})

// ============================================================
// Graph structure sanity checks
// ============================================================

describe('enemyGraphs — graph structure', () => {
  const allGraphs: [string, BehaviorGraph][] = [
    ['stone-giant', stoneGiantGraph],
    ['plague-rat', plagueRatGraph],
    ['ice-giant', iceGiantGraph],
    ['crystal-spider', crystalSpiderGraph],
    ['ember-wisp', emberWispGraph],
    ['iron-golem', ironGolemGraph],
    ['ancient-treant', ancientTreantGraph],
    ['goblin-scout', goblinScoutGraph],
    ['orc-warrior', orcWarriorGraph],
    ['mirror-knight', mirrorKnightGraph],
    ['insect-swarm', insectSwarmGraph],
  ]

  it('every graph has a valid start node', () => {
    for (const [name, graph] of allGraphs) {
      expect(graph.nodes[graph.start], `${name}: start node "${graph.start}" missing`).toBeDefined()
    }
  })

  it('every node edge points to an existing node', () => {
    for (const [name, graph] of allGraphs) {
      for (const node of Object.values(graph.nodes)) {
        for (const edge of node.edges) {
          expect(graph.nodes[edge.to], `${name}: node "${node.id}" has edge to unknown "${edge.to}"`).toBeDefined()
        }
      }
    }
  })

  it('every graph has at least one node with an attack', () => {
    for (const [name, graph] of allGraphs) {
      const hasAttack = Object.values(graph.nodes).some(n => n.attack !== undefined)
      expect(hasAttack, `${name}: no attack node found`).toBe(true)
    }
  })

  it('orb attacks have projectileSpeedCmS and castPoint', () => {
    for (const [name, graph] of allGraphs) {
      for (const node of Object.values(graph.nodes)) {
        if (node.attack?.kind === 'orb') {
          expect(node.attack.projectileSpeedCmS, `${name}/${node.id}: missing projectileSpeedCmS`).toBeGreaterThan(0)
          expect(node.attack.castPoint, `${name}/${node.id}: missing castPoint`).toBeDefined()
        }
      }
    }
  })

  it('overlay attacks have overlayConnectMs', () => {
    for (const [name, graph] of allGraphs) {
      for (const node of Object.values(graph.nodes)) {
        if (node.attack?.kind === 'overlay') {
          expect(node.attack.overlayConnectMs, `${name}/${node.id}: missing overlayConnectMs`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('holdFrame nodes (ice-giant, crystal-spider) reference existing anim and frame 0', () => {
    for (const graph of [iceGiantGraph, crystalSpiderGraph]) {
      for (const node of Object.values(graph.nodes)) {
        if (node.holdFrame) {
          expect(node.holdFrame.frameIndex).toBe(0)
          expect(node.holdFrame.animKey).toBeTruthy()
        }
      }
    }
  })

  it('all 11 graphs have all attack damages > 0', () => {
    for (const [name, graph] of allGraphs) {
      for (const node of Object.values(graph.nodes)) {
        if (node.attack) {
          expect(node.attack.damage, `${name}/${node.id}: damage must be > 0`).toBeGreaterThan(0)
        }
      }
    }
  })
})

// ============================================================
// Constants re-export from constants.ts (AC#2)
// ============================================================

describe('enemyGraphs — constants accessible from constants.ts', () => {
  it('attack constants are re-exported from constants.ts', async () => {
    const C = await import('../../game/constants')
    expect(C.ENEMY_STONE_GIANT_ATTACK_DAMAGE).toBeGreaterThan(0)
    expect(C.ENEMY_PLAGUE_RAT_ATTACK_DAMAGE).toBeGreaterThan(0)
    expect(C.ENEMY_ORB_SPEED_CM_S).toBeGreaterThan(0)
    expect(C.ENEMY_OVERLAY_CONNECT_MS).toBeGreaterThan(0)
    expect(C.ENEMY_ATTACK_IDLE_DWELL_FAST_MS).toBeGreaterThan(0)
    expect(C.ENEMY_ATTACK_IDLE_DWELL_NORMAL_MS).toBeGreaterThan(0)
    expect(C.ENEMY_ATTACK_IDLE_DWELL_SLOW_MS).toBeGreaterThan(0)
  })
})

// ============================================================
// ENEMY_POOL entries all have behaviorGraph set (AC#1)
// ============================================================

describe('enemyGraphs — all ENEMY_POOL entries have behaviorGraph', () => {
  it('all 11 enemies in ENEMY_POOL have a non-undefined behaviorGraph', async () => {
    const { ENEMY_POOL } = await import('../../game/constants')
    expect(ENEMY_POOL).toHaveLength(11)
    for (const enemy of ENEMY_POOL) {
      expect(enemy.behaviorGraph, `${enemy.name}: missing behaviorGraph`).toBeDefined()
    }
  })
})
