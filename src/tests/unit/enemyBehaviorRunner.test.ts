import { describe, it, expect } from 'vitest'
import { EnemyBehaviorRunner } from '../../game/systems/EnemyBehaviorRunner'
import type { BehaviorContext } from '../../game/systems/EnemyBehaviorRunner'
import type { AttackSpec, BehaviorGraph } from '../../types'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/** A default, "nothing happening" context: not stunned, full HP, frame 0, anim not done. */
function ctx(overrides: Partial<BehaviorContext> = {}): BehaviorContext {
  return {
    frameIndex: 0,
    animationComplete: false,
    enemyHpPct: 1,
    isStunned: false,
    ...overrides,
  }
}

function orbAttack(overrides: Partial<AttackSpec> = {}): AttackSpec {
  return {
    damage: 5,
    releaseFrame: 2,
    kind: 'orb',
    visualKey: 'orb_fire',
    ...overrides,
  }
}

/** Deterministic RNG that replays a fixed sequence (clamped to the last value). */
function seqRng(values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

// ------------------------------------------------------------
// AC#1 — pure TS, no Phaser import
// ------------------------------------------------------------

describe('EnemyBehaviorRunner — purity (AC#1)', () => {
  it('the source file imports nothing from phaser', async () => {
    // Statically read the file and assert no Phaser import (mirrors the repo rule).
    const fs = await import('node:fs')
    const url = await import('node:url')
    const path = url.fileURLToPath(
      new URL('../../game/systems/EnemyBehaviorRunner.ts', import.meta.url),
    )
    const src = fs.readFileSync(path, 'utf8')
    expect(src).not.toMatch(/from ['"]phaser['"]/)
  })
})

// ------------------------------------------------------------
// AC#2 — exit triggers
// ------------------------------------------------------------

describe('EnemyBehaviorRunner — exit triggers (AC#2)', () => {
  it('animationComplete: stays until the one-shot animation finishes, then transitions', () => {
    const graph: BehaviorGraph = {
      start: 'attack',
      nodes: {
        attack: {
          id: 'attack',
          animKey: 'attack',
          exitTrigger: { kind: 'animationComplete' },
          edges: [{ to: 'idle', weight: 1 }],
        },
        idle: {
          id: 'idle',
          animKey: 'idle',
          exitTrigger: { kind: 'afterMs', ms: 1000 },
          edges: [],
        },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)

    runner.tick(100, ctx({ animationComplete: false }))
    expect(runner.currentNode.id).toBe('attack')

    runner.tick(100, ctx({ animationComplete: true }))
    expect(runner.currentNode.id).toBe('idle')
  })

  it('afterMs: dwells for the configured time before transitioning', () => {
    const graph: BehaviorGraph = {
      start: 'idle',
      nodes: {
        idle: {
          id: 'idle',
          animKey: 'idle',
          exitTrigger: { kind: 'afterMs', ms: 500 },
          edges: [{ to: 'attack', weight: 1 }],
        },
        attack: {
          id: 'attack',
          animKey: 'attack',
          exitTrigger: { kind: 'animationComplete' },
          edges: [],
        },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)

    runner.tick(300, ctx())
    expect(runner.currentNode.id).toBe('idle')
    // Crossing 500ms total triggers the exit.
    runner.tick(200, ctx())
    expect(runner.currentNode.id).toBe('attack')
  })

  it('condition: exits as soon as the trigger guard becomes satisfied', () => {
    const graph: BehaviorGraph = {
      start: 'wait',
      nodes: {
        wait: {
          id: 'wait',
          animKey: 'idle',
          exitTrigger: { kind: 'condition', guard: { kind: 'enemyHpBelow', pct: 0.5 } },
          edges: [{ to: 'enrage', weight: 1 }],
        },
        enrage: {
          id: 'enrage',
          animKey: 'attack',
          exitTrigger: { kind: 'animationComplete' },
          edges: [],
        },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)

    // HP still high → guard not satisfied → stay.
    runner.tick(16, ctx({ enemyHpPct: 0.8 }))
    expect(runner.currentNode.id).toBe('wait')

    // HP drops below 50% → condition fires.
    runner.tick(16, ctx({ enemyHpPct: 0.4 }))
    expect(runner.currentNode.id).toBe('enrage')
  })
})

// ------------------------------------------------------------
// AC#3 — guards
// ------------------------------------------------------------

describe('EnemyBehaviorRunner — guards (AC#3)', () => {
  function branchingGraph(): BehaviorGraph {
    return {
      start: 'idle',
      nodes: {
        idle: {
          id: 'idle',
          animKey: 'idle',
          exitTrigger: { kind: 'afterMs', ms: 100 },
          edges: [
            { to: 'low', weight: 1, guard: { kind: 'enemyHpBelow', pct: 0.3 } },
            { to: 'high', weight: 1, guard: { kind: 'enemyHpAbove', pct: 0.3 } },
          ],
        },
        low: { id: 'low', animKey: 'attack', exitTrigger: { kind: 'afterMs', ms: 100 }, edges: [] },
        high: { id: 'high', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 100 }, edges: [] },
      },
    }
  }

  it('only edges with a satisfied guard are eligible (enemyHpBelow)', () => {
    const runner = new EnemyBehaviorRunner(branchingGraph(), seqRng([0]))
    runner.tick(100, ctx({ enemyHpPct: 0.1 }))
    expect(runner.currentNode.id).toBe('low')
  })

  it('only edges with a satisfied guard are eligible (enemyHpAbove)', () => {
    const runner = new EnemyBehaviorRunner(branchingGraph(), seqRng([0]))
    runner.tick(100, ctx({ enemyHpPct: 0.9 }))
    expect(runner.currentNode.id).toBe('high')
  })

  it('an absent guard is always eligible', () => {
    const graph: BehaviorGraph = {
      start: 'a',
      nodes: {
        a: { id: 'a', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 10 }, edges: [{ to: 'b', weight: 1 }] },
        b: { id: 'b', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 10 }, edges: [] },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)
    runner.tick(10, ctx({ enemyHpPct: 0.0 }))
    expect(runner.currentNode.id).toBe('b')
  })

  it('explicit always guard is eligible', () => {
    const graph: BehaviorGraph = {
      start: 'a',
      nodes: {
        a: {
          id: 'a',
          animKey: 'idle',
          exitTrigger: { kind: 'afterMs', ms: 10 },
          edges: [{ to: 'b', weight: 1, guard: { kind: 'always' } }],
        },
        b: { id: 'b', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 10 }, edges: [] },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)
    runner.tick(10, ctx())
    expect(runner.currentNode.id).toBe('b')
  })

  it('attackCountAtLeast guard unlocks an edge only after enough attacks were emitted', () => {
    // idle (no attack) → jab (attack, releaseFrame 0) → branch:
    //   if attackCount >= 2 go to 'finisher', else loop back to 'jab'.
    const graph: BehaviorGraph = {
      start: 'jab',
      nodes: {
        jab: {
          id: 'jab',
          animKey: 'attack',
          exitTrigger: { kind: 'animationComplete' },
          attack: orbAttack({ releaseFrame: 0 }),
          edges: [
            { to: 'finisher', weight: 1, guard: { kind: 'attackCountAtLeast', n: 2 } },
            { to: 'jab', weight: 1 },
          ],
        },
        finisher: {
          id: 'finisher',
          animKey: 'attack',
          exitTrigger: { kind: 'animationComplete' },
          edges: [],
        },
      },
    }
    // rng picks the first eligible edge (cumulative) whenever possible.
    const runner = new EnemyBehaviorRunner(graph, seqRng([0]))

    // 1st jab: attackCount becomes 1 → finisher guard fails → loops to jab.
    runner.tick(16, ctx({ frameIndex: 0, animationComplete: true }))
    expect(runner.attackCount).toBe(1)
    expect(runner.currentNode.id).toBe('jab')

    // 2nd jab: attackCount becomes 2 → finisher guard now holds → picks finisher.
    runner.tick(16, ctx({ frameIndex: 0, animationComplete: true }))
    expect(runner.attackCount).toBe(2)
    expect(runner.currentNode.id).toBe('finisher')
  })
})

// ------------------------------------------------------------
// AC#4 — weighted edge selection is deterministic with injected RNG
// ------------------------------------------------------------

describe('EnemyBehaviorRunner — weighted selection (AC#4)', () => {
  function twoWayGraph(): BehaviorGraph {
    return {
      start: 'fork',
      nodes: {
        fork: {
          id: 'fork',
          animKey: 'idle',
          exitTrigger: { kind: 'afterMs', ms: 10 },
          edges: [
            { to: 'a', weight: 3 },
            { to: 'b', weight: 1 },
          ],
        },
        a: { id: 'a', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 1_000_000 }, edges: [] },
        b: { id: 'b', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 1_000_000 }, edges: [] },
      },
    }
  }

  it('rng landing in the first weight band picks the first edge', () => {
    // total weight 4; r = 0.1 * 4 = 0.4 < 3 → edge "a"
    const runner = new EnemyBehaviorRunner(twoWayGraph(), seqRng([0.1]))
    runner.tick(10, ctx())
    expect(runner.currentNode.id).toBe('a')
  })

  it('rng landing in the second weight band picks the second edge', () => {
    // total weight 4; r = 0.9 * 4 = 3.6 → past "a" (3) → edge "b"
    const runner = new EnemyBehaviorRunner(twoWayGraph(), seqRng([0.9]))
    runner.tick(10, ctx())
    expect(runner.currentNode.id).toBe('b')
  })

  it('distribution over many runs matches the 3:1 weight ratio', () => {
    // Drive the fork repeatedly by feeding rng values spread across [0,1).
    const N = 4000
    const rngValues = Array.from({ length: N }, (_, i) => (i + 0.5) / N)
    let countA = 0
    for (const r of rngValues) {
      const runner = new EnemyBehaviorRunner(twoWayGraph(), seqRng([r]))
      runner.tick(10, ctx())
      if (runner.currentNode.id === 'a') countA++
    }
    // Expect ~75% for weight 3 of 4. Allow a small tolerance.
    expect(countA / N).toBeGreaterThan(0.72)
    expect(countA / N).toBeLessThan(0.78)
  })

  it('rng at the very top of the range still resolves (no out-of-band pick)', () => {
    // r just under total → falls through to the fallback (last edge).
    const runner = new EnemyBehaviorRunner(twoWayGraph(), seqRng([0.999999999]))
    runner.tick(10, ctx())
    expect(runner.currentNode.id).toBe('b')
  })

  it('all-zero weights resolve to the last edge via the fallback', () => {
    const graph: BehaviorGraph = {
      start: 'fork',
      nodes: {
        fork: {
          id: 'fork',
          animKey: 'idle',
          exitTrigger: { kind: 'afterMs', ms: 10 },
          edges: [
            { to: 'a', weight: 0 },
            { to: 'b', weight: 0 },
          ],
        },
        a: { id: 'a', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 1_000_000 }, edges: [] },
        b: { id: 'b', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 1_000_000 }, edges: [] },
      },
    }
    const runner = new EnemyBehaviorRunner(graph, seqRng([0]))
    runner.tick(10, ctx())
    expect(runner.currentNode.id).toBe('b')
  })
})

// ------------------------------------------------------------
// AC#5 — release frame emits the attack exactly once; attackCount increments
// ------------------------------------------------------------

describe('EnemyBehaviorRunner — release frame & attackCount (AC#5)', () => {
  function attackGraph(releaseFrame: number): BehaviorGraph {
    return {
      start: 'attack',
      nodes: {
        attack: {
          id: 'attack',
          animKey: 'attack',
          exitTrigger: { kind: 'animationComplete' },
          attack: orbAttack({ releaseFrame, damage: 9 }),
          edges: [{ to: 'idle', weight: 1 }],
        },
        idle: { id: 'idle', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 1000 }, edges: [] },
      },
    }
  }

  it('emits the AttackSpec when frameIndex reaches the release frame', () => {
    const runner = new EnemyBehaviorRunner(attackGraph(2))

    expect(runner.tick(16, ctx({ frameIndex: 0 })).attacks).toEqual([])
    expect(runner.tick(16, ctx({ frameIndex: 1 })).attacks).toEqual([])

    const result = runner.tick(16, ctx({ frameIndex: 2 }))
    expect(result.attacks).toHaveLength(1)
    expect(result.attacks[0]).toMatchObject({ damage: 9, releaseFrame: 2, kind: 'orb' })
    expect(runner.attackCount).toBe(1)
  })

  it('emits exactly once even if the frame lingers at/after the release frame', () => {
    const runner = new EnemyBehaviorRunner(attackGraph(1))

    expect(runner.tick(16, ctx({ frameIndex: 1 })).attacks).toHaveLength(1)
    // Frame stays at 1, then advances past it — no further emissions.
    expect(runner.tick(16, ctx({ frameIndex: 1 })).attacks).toEqual([])
    expect(runner.tick(16, ctx({ frameIndex: 3 })).attacks).toEqual([])
    expect(runner.attackCount).toBe(1)
  })

  it('emits on the first tick where the frame is already past the release frame (skipped frame)', () => {
    const runner = new EnemyBehaviorRunner(attackGraph(2))
    // Jump straight past frame 2 — still fires once.
    const result = runner.tick(50, ctx({ frameIndex: 4 }))
    expect(result.attacks).toHaveLength(1)
    expect(runner.attackCount).toBe(1)
  })

  it('a node without an attack never emits', () => {
    const graph: BehaviorGraph = {
      start: 'idle',
      nodes: {
        idle: { id: 'idle', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 1000 }, edges: [] },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)
    expect(runner.tick(16, ctx({ frameIndex: 5 })).attacks).toEqual([])
    expect(runner.attackCount).toBe(0)
  })

  it('re-arms the attack latch when the attack node is re-entered', () => {
    // attack → idle (short) → attack ... a full lap should emit again.
    const graph: BehaviorGraph = {
      start: 'attack',
      nodes: {
        attack: {
          id: 'attack',
          animKey: 'attack',
          exitTrigger: { kind: 'animationComplete' },
          attack: orbAttack({ releaseFrame: 0 }),
          edges: [{ to: 'idle', weight: 1 }],
        },
        idle: {
          id: 'idle',
          animKey: 'idle',
          exitTrigger: { kind: 'afterMs', ms: 10 },
          edges: [{ to: 'attack', weight: 1 }],
        },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)

    // 1st attack emission + transition to idle on animationComplete.
    expect(runner.tick(16, ctx({ frameIndex: 0, animationComplete: true })).attacks).toHaveLength(1)
    expect(runner.currentNode.id).toBe('idle')
    // dwell in idle → back to attack
    runner.tick(10, ctx())
    expect(runner.currentNode.id).toBe('attack')
    // 2nd lap emits again
    expect(runner.tick(16, ctx({ frameIndex: 0, animationComplete: true })).attacks).toHaveLength(1)
    expect(runner.attackCount).toBe(2)
  })
})

// ------------------------------------------------------------
// AC#6 — stun freezes the whole graph
// ------------------------------------------------------------

describe('EnemyBehaviorRunner — stun freeze (AC#6)', () => {
  it('tick is a no-op while stunned: no dwell accumulation, no transition, no attack', () => {
    const graph: BehaviorGraph = {
      start: 'attack',
      nodes: {
        attack: {
          id: 'attack',
          animKey: 'attack',
          exitTrigger: { kind: 'afterMs', ms: 100 },
          attack: orbAttack({ releaseFrame: 0 }),
          edges: [{ to: 'idle', weight: 1 }],
        },
        idle: { id: 'idle', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 1000 }, edges: [] },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)

    // Huge stunned tick: dwell timer must NOT advance and the attack must NOT fire.
    const stunned = runner.tick(10_000, ctx({ frameIndex: 0, isStunned: true }))
    expect(stunned.attacks).toEqual([])
    expect(runner.currentNode.id).toBe('attack')
    expect(runner.attackCount).toBe(0)

    // After the stun ends, it resumes from where it was: the attack fires, then dwell.
    expect(runner.tick(16, ctx({ frameIndex: 0 })).attacks).toHaveLength(1)
    expect(runner.currentNode.id).toBe('attack')
    runner.tick(100, ctx({ frameIndex: 1 }))
    expect(runner.currentNode.id).toBe('idle')
  })

  it('frame index exposed for the renderer is not advanced by a stunned tick', () => {
    const graph: BehaviorGraph = {
      start: 'idle',
      nodes: {
        idle: { id: 'idle', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 1000 }, edges: [] },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)
    runner.tick(16, ctx({ frameIndex: 3 }))
    expect(runner.currentFrameIndex).toBe(3)
    // A stunned tick reporting a different frame must not update the exposed frame.
    runner.tick(16, ctx({ frameIndex: 7, isStunned: true }))
    expect(runner.currentFrameIndex).toBe(3)
  })
})

// ------------------------------------------------------------
// AC#7 — holdFrame fallback + terminal node restarts the graph
// ------------------------------------------------------------

describe('EnemyBehaviorRunner — holdFrame & restart (AC#7)', () => {
  it('holdFrame node exposes the held animation + frozen frame for the renderer', () => {
    const graph: BehaviorGraph = {
      start: 'rest',
      nodes: {
        rest: {
          id: 'rest',
          animKey: 'hold',
          holdFrame: { animKey: 'attack', frameIndex: 0 },
          exitTrigger: { kind: 'afterMs', ms: 500 },
          edges: [{ to: 'attack', weight: 1 }],
        },
        attack: {
          id: 'attack',
          animKey: 'attack',
          exitTrigger: { kind: 'animationComplete' },
          edges: [],
        },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)

    expect(runner.currentAnimKey).toBe('attack')
    expect(runner.currentHoldFrame).toEqual({ animKey: 'attack', frameIndex: 0 })

    // After dwell it moves to a normal node — holdFrame clears.
    runner.tick(500, ctx())
    expect(runner.currentNode.id).toBe('attack')
    expect(runner.currentAnimKey).toBe('attack')
    expect(runner.currentHoldFrame).toBeUndefined()
  })

  it('a terminal node (no edges) restarts the graph into the start node', () => {
    const graph: BehaviorGraph = {
      start: 'idle',
      nodes: {
        idle: {
          id: 'idle',
          animKey: 'idle',
          exitTrigger: { kind: 'afterMs', ms: 100 },
          edges: [{ to: 'attack', weight: 1 }],
        },
        attack: {
          id: 'attack',
          animKey: 'attack',
          exitTrigger: { kind: 'animationComplete' },
          edges: [], // terminal
        },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)

    runner.tick(100, ctx())
    expect(runner.currentNode.id).toBe('attack')
    // attack completes → terminal → restart into 'idle'
    runner.tick(16, ctx({ animationComplete: true }))
    expect(runner.currentNode.id).toBe('idle')
  })

  it('a node whose edges are all guard-ineligible also restarts into start', () => {
    const graph: BehaviorGraph = {
      start: 'idle',
      nodes: {
        idle: {
          id: 'idle',
          animKey: 'idle',
          exitTrigger: { kind: 'afterMs', ms: 100 },
          edges: [{ to: 'low', weight: 1, guard: { kind: 'enemyHpBelow', pct: 0.1 } }],
        },
        low: { id: 'low', animKey: 'attack', exitTrigger: { kind: 'afterMs', ms: 100 }, edges: [] },
      },
    }
    const runner = new EnemyBehaviorRunner(graph)
    // HP high → the only edge's guard fails → no eligible edge → restart into start ('idle').
    runner.tick(100, ctx({ enemyHpPct: 0.9 }))
    expect(runner.currentNode.id).toBe('idle')
  })
})

// ------------------------------------------------------------
// Construction, exposure & reset
// ------------------------------------------------------------

describe('EnemyBehaviorRunner — construction / exposure / reset', () => {
  const graph: BehaviorGraph = {
    start: 'idle',
    nodes: {
      idle: {
        id: 'idle',
        animKey: 'idle',
        exitTrigger: { kind: 'afterMs', ms: 100 },
        attack: orbAttack({ releaseFrame: 0 }),
        edges: [{ to: 'idle', weight: 1 }],
      },
    },
  }

  it('starts in the graph start node and exposes its animation', () => {
    const runner = new EnemyBehaviorRunner(graph)
    expect(runner.currentNode.id).toBe('idle')
    expect(runner.currentAnimKey).toBe('idle')
    expect(runner.currentHoldFrame).toBeUndefined()
    expect(runner.currentFrameIndex).toBe(0)
    expect(runner.attackCount).toBe(0)
  })

  it('reset returns to the start node and clears counters', () => {
    const runner = new EnemyBehaviorRunner(graph)
    // emit an attack + advance the frame
    runner.tick(16, ctx({ frameIndex: 4 }))
    expect(runner.attackCount).toBe(1)
    expect(runner.currentFrameIndex).toBe(4)

    runner.reset()
    expect(runner.currentNode.id).toBe('idle')
    expect(runner.attackCount).toBe(0)
    expect(runner.currentFrameIndex).toBe(0)
    // After reset the attack latch is re-armed: it can emit again.
    expect(runner.tick(16, ctx({ frameIndex: 0 })).attacks).toHaveLength(1)
  })

  it('uses the default RNG (Math.random) when none is injected', () => {
    // No injected RNG; just assert it constructs and ticks without throwing.
    const runner = new EnemyBehaviorRunner({
      start: 'fork',
      nodes: {
        fork: {
          id: 'fork',
          animKey: 'idle',
          exitTrigger: { kind: 'afterMs', ms: 1 },
          edges: [
            { to: 'a', weight: 1 },
            { to: 'b', weight: 1 },
          ],
        },
        a: { id: 'a', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 1_000_000 }, edges: [] },
        b: { id: 'b', animKey: 'idle', exitTrigger: { kind: 'afterMs', ms: 1_000_000 }, edges: [] },
      },
    })
    runner.tick(1, ctx())
    expect(['a', 'b']).toContain(runner.currentNode.id)
  })

  it('throws on a graph referencing an unknown start node', () => {
    expect(
      () => new EnemyBehaviorRunner({ start: 'missing', nodes: {} }),
    ).toThrow(/unknown node id "missing"/)
  })

  it('throws when an edge points at an unknown node', () => {
    const broken: BehaviorGraph = {
      start: 'a',
      nodes: {
        a: {
          id: 'a',
          animKey: 'idle',
          exitTrigger: { kind: 'afterMs', ms: 10 },
          edges: [{ to: 'ghost', weight: 1 }],
        },
      },
    }
    const runner = new EnemyBehaviorRunner(broken)
    expect(() => runner.tick(10, ctx())).toThrow(/unknown node id "ghost"/)
  })
})
