// ============================================================
// EnemyBehaviorRunner — pure TypeScript, no Phaser dependency
// The "brain" of the enemy attack framework: executes a BehaviorGraph.
// Holds the active node, evaluates exit triggers / guards / weighted edges,
// emits an AttackSpec on the release frame, and exposes the animation to render.
// Contract: EnemyAttacks.md §3 and §6.
// ============================================================

import type { AttackSpec, BehaviorGraph, BehaviorNode, Edge, Guard } from '../../types'

/**
 * Per-tick context handed to the runner by the orchestrator (GameStateMachine).
 * The runner owns transition logic; the orchestrator owns animation playback and
 * feeds back the current frame so the runner can detect release frames and
 * animation completion.
 */
export interface BehaviorContext {
  /** Current frame index of the active node's animation (from AnimationController). */
  frameIndex: number
  /** True once the active one-shot animation has finished (drives `animationComplete`). */
  animationComplete: boolean
  /** Enemy HP as a fraction in 0..1 (drives the HP guards). */
  enemyHpPct: number
  /** True while the enemy is stunned — the whole graph freezes (tick is a no-op). */
  isStunned: boolean
}

/** Result of a single {@link EnemyBehaviorRunner.tick}. */
export interface BehaviorTickResult {
  /**
   * Attacks emitted this tick (each on its release frame). Normally 0 or 1 entries.
   * The orchestrator forwards them to DeliverySystem.spawn.
   */
  attacks: AttackSpec[]
}

/** Default RNG used for weighted edge selection when none is injected. */
const defaultRng = (): number => Math.random()

/**
 * Executes one enemy's BehaviorGraph.
 *
 * - Holds exactly one active node. When the node's exit trigger fires, eligible
 *   edges (guard holds) are weighted-randomly chosen and the runner transitions.
 * - Emits the node's AttackSpec exactly once, when the animation reaches the
 *   release frame. Increments {@link attackCount} on every emitted attack.
 * - A terminal node (no edges) — or a node whose edges are all guard-ineligible —
 *   restarts the graph into its `start` node.
 * - Stun freezes the whole graph: tick becomes a no-op (node, dwell timer and the
 *   release-frame latch all hold their state).
 *
 * Pure TS, deterministic given an injected RNG.
 */
export class EnemyBehaviorRunner {
  private readonly graph: BehaviorGraph
  private readonly rng: () => number

  private activeNode: BehaviorNode
  /** Time spent in the active node so far. Drives the `afterMs` exit trigger. Unit: ms. */
  private dwellMs = 0
  /** Whether the active node's attack has already been emitted this activation. */
  private attackEmitted = false
  /** Lifetime count of attacks emitted (drives the attackCountAtLeast guard). */
  private attackCountValue = 0
  /** Last frame index seen via ctx — exposed for the renderer. */
  private lastFrameIndex = 0

  constructor(graph: BehaviorGraph, rng: () => number = defaultRng) {
    this.graph = graph
    this.rng = rng
    this.activeNode = this.nodeById(graph.start)
  }

  /**
   * Advance the runner by `dtMs`, using the supplied context.
   *
   * Order within a non-stunned tick: accumulate dwell → emit release-frame attack
   * (once) → evaluate the exit trigger and possibly transition.
   * When `ctx.isStunned` is true the tick is a no-op and nothing freezes-forward.
   */
  tick(dtMs: number, ctx: BehaviorContext): BehaviorTickResult {
    const attacks: AttackSpec[] = []
    if (ctx.isStunned) return { attacks }

    this.lastFrameIndex = ctx.frameIndex
    this.dwellMs += dtMs

    const node = this.activeNode
    if (node.attack && !this.attackEmitted && ctx.frameIndex >= node.attack.releaseFrame) {
      attacks.push(node.attack)
      this.attackEmitted = true
      this.attackCountValue++
    }

    if (this.shouldExit(ctx)) {
      this.transition(ctx)
    }

    return { attacks }
  }

  /** The currently active node. */
  get currentNode(): BehaviorNode {
    return this.activeNode
  }

  /**
   * Animation key the renderer should display. For a holdFrame node this is the
   * held animation (the node's own `animKey` is then a 'hold' placeholder).
   */
  get currentAnimKey(): string {
    return this.activeNode.holdFrame?.animKey ?? this.activeNode.animKey
  }

  /** When set, the renderer should freeze on this single frame instead of playing. */
  get currentHoldFrame(): { animKey: string; frameIndex: number } | undefined {
    return this.activeNode.holdFrame
  }

  /** Last animation frame index seen via the context. */
  get currentFrameIndex(): number {
    return this.lastFrameIndex
  }

  /** Lifetime number of attacks emitted (used by the attackCountAtLeast guard). */
  get attackCount(): number {
    return this.attackCountValue
  }

  /** Whether the active node's exit trigger is satisfied this tick. */
  private shouldExit(ctx: BehaviorContext): boolean {
    const trigger = this.activeNode.exitTrigger
    switch (trigger.kind) {
      case 'animationComplete':
        return ctx.animationComplete
      case 'afterMs':
        return this.dwellMs >= trigger.ms
      case 'condition':
        return this.guardHolds(trigger.guard, ctx)
    }
  }

  /** Pick the next node among guard-eligible edges, or restart into `start`. */
  private transition(ctx: BehaviorContext): void {
    const eligible = this.activeNode.edges.filter((e) => this.guardHolds(e.guard, ctx))
    const nextId = eligible.length > 0 ? this.weightedPick(eligible) : this.graph.start
    this.enterNode(nextId)
  }

  /** Enter a node: clear its dwell timer and re-arm the release-frame latch. */
  private enterNode(id: string): void {
    this.activeNode = this.nodeById(id)
    this.dwellMs = 0
    this.attackEmitted = false
  }

  /** Weighted-random choice among edges, deterministic given the injected RNG. */
  private weightedPick(edges: Edge[]): string {
    const total = edges.reduce((sum, e) => sum + e.weight, 0)
    let r = this.rng() * total
    for (const e of edges) {
      r -= e.weight
      if (r < 0) return e.to
    }
    // Fallback for floating-point rounding / all-zero weights.
    return edges[edges.length - 1].to
  }

  /** Evaluate a guard against the context. Absent guard = always eligible. */
  private guardHolds(guard: Guard | undefined, ctx: BehaviorContext): boolean {
    if (!guard) return true
    switch (guard.kind) {
      case 'always':
        return true
      case 'enemyHpBelow':
        return ctx.enemyHpPct < guard.pct
      case 'enemyHpAbove':
        return ctx.enemyHpPct > guard.pct
      case 'attackCountAtLeast':
        return this.attackCountValue >= guard.n
    }
  }

  /** Look up a node by id, throwing on an unknown reference (graph config error). */
  private nodeById(id: string): BehaviorNode {
    const node = this.graph.nodes[id]
    if (!node) {
      throw new Error(`EnemyBehaviorRunner: unknown node id "${id}"`)
    }
    return node
  }
}
