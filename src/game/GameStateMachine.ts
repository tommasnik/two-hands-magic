// ============================================================
// GameStateMachine — pure TypeScript, no Phaser dependency
// Orchestrates all game systems and tracks state transitions.
// ============================================================

import type { GameState, InputEvent, HitResult, SkillType, Phase, HitZoneName, ActiveSlotState, HitZoneEntry, HitZoneEntryPx, PlayerHitEvent, GlobalUpgradeState, UpgradeNodeId, FightStats, SkillFightStats } from '../types'
import { computePlayerStats } from './systems/PlayerProgression'
import { InputManager } from './systems/InputManager'
import type { TouchPointEntry } from './systems/InputManager'
import { computeReticle } from './systems/AimSystem'
import { ProjectileSystem } from './systems/ProjectileSystem'
import { calculateDamage } from './systems/DamageSystem'
import { computeEnemyPosition } from './systems/BehaviorSystem'
import { scaleHitZoneMap } from './systems/HitZoneSystem'
import { DeliverySystem } from './systems/DeliverySystem'
import { EnemyBehaviorRunner } from './systems/EnemyBehaviorRunner'
import { applyUpgradeNode, getAvailableNodes } from './upgrades'
import type { EnemyBehaviorDef, EnemyDef, BehaviorGraph } from '../types'

import type { MaskHitDetector } from './systems/MaskHitDetector'
import { AnimationController } from './systems/AnimationController'
import { characterRegistry } from './CharacterRegistry'
import { Enemy } from './entities/Enemy'
import { Player } from './entities/Player'
import { generateTouchPointLayout } from './entities/touchPoints'
import type { ActiveTouchPointPos } from './entities/touchPoints'
import {
  MAX_DELTA_MS, CRIT_SCORE, HIT_SCORE, GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM,
  ENEMY_DEFAULT_Y, DEFAULT_SKILL_CONFIG,
  DEFAULT_HIT_ZONE_MAP,
  ENEMY_TORSO_WIDTH_PX, ENEMY_TORSO_HEIGHT_PX, ENEMY_HEAD_RADIUS_PX, ENEMY_LEG_LENGTH_PX,
  PLAYER_MAX_HP, LASER_ORIGIN_Y,
  PLAYER_START_LEVEL, PLAYER_MAX_LEVEL, XP_LEVEL_THRESHOLDS,
  DEFAULT_GLOBAL_UPGRADE_STATE,
  ENEMY_POOL,
  LIGHTNING_BLAST_DURATION_CRIT_MS, LIGHTNING_BLAST_DURATION_HIT_MS, LIGHTNING_BLAST_DURATION_GRAZE_MS,
} from './constants'
import type { SkillSlotConfig } from './constants'
import { SkillRegistry } from './skills/registry'
import type { StatusApplier, EnemyStateSlice } from './skills/types'
import { StatusEffectSystem } from './systems/StatusEffectSystem'
import { resolveHit } from './systems/DamageSystem'
import type { HitResolution } from './systems/DamageSystem'

// Ensure all skill modules are registered before GameStateMachine is used.
import './skills/index'

/** Player centre — origin point enemy missiles target. */
const PLAYER_CENTRE = { x: GAME_WIDTH / 2, y: LASER_ORIGIN_Y }

/** Default behavior for enemy defs that do not specify a behavior. */
const DEFAULT_ENEMY_BEHAVIOR: EnemyBehaviorDef = { pattern: 'static', speed: 0 }

/** Extract behavior from an EnemyDef, falling back to static if undefined. */
export function resolveBehavior(enemyDef: EnemyDef): EnemyBehaviorDef {
  return enemyDef.behavior ?? DEFAULT_ENEMY_BEHAVIOR
}

/** Fallback Phaser texture key when an EnemyDef has no spriteKey. */
const SPRITE_KEY_FALLBACK = 'enemy_placeholder'

/**
 * Extract the sprite key from an EnemyDef, falling back to the placeholder key if undefined.
 * Pure function — fully unit-testable.
 */
export function resolveSpriteKey(enemyDef: EnemyDef): string {
  return enemyDef.spriteKey ?? SPRITE_KEY_FALLBACK
}

/**
 * Extract the hit zone map from an EnemyDef, falling back to the default three-zone map.
 * Pure function — fully unit-testable.
 */
export function resolveHitZoneMap(enemyDef: EnemyDef): readonly HitZoneEntry[] {
  return enemyDef.hitZoneMap ?? DEFAULT_HIT_ZONE_MAP
}

/**
 * Central game state machine.
 * update() is the single entry point per frame — pure orchestration, no rendering.
 *
 * Accepts an optional skill configuration (array of SkillSlotConfig) at construction time.
 * Defaults to DEFAULT_SKILL_CONFIG (1 slow_shot left + 1 fast_shot right).
 */
export class GameStateMachine {
  private phase: Phase = 'loading'
  private elapsedMs = 0
  private score = { total: 0, crits: 0, hits: 0, grazes: 0, misses: 0 }
  // Enemy spawn origin — BehaviorSystem computes position relative to this anchor
  private _enemyOriginX = GAME_WIDTH / 2
  private _enemyOriginY = ENEMY_DEFAULT_Y
  // Active behavior def — updated on level load; defaults to static
  private _enemyBehavior: EnemyBehaviorDef = resolveBehavior(ENEMY_POOL[0])
  private enemy = new Enemy(GAME_WIDTH / 2, ENEMY_DEFAULT_Y)
  // Index into ENEMY_POOL for sequential rotation (wraps around modulo pool length)
  private _enemyPoolIndex = 0
  private currentLevel = 1
  private enemyHp = ENEMY_POOL[0].maxHp
  private enemyMaxHp = ENEMY_POOL[0].maxHp
  private enemyName = ENEMY_POOL[0].name
  private _enemySpriteKey = resolveSpriteKey(ENEMY_POOL[0])
  private _enemyManifestId?: string = ENEMY_POOL[0].manifestId
  private _enemyHitZoneMap: readonly HitZoneEntry[] = resolveHitZoneMap(ENEMY_POOL[0])
  private inputManager: InputManager
  private projectileSystem = new ProjectileSystem()
  // Enemy attack delivery layer (orb flight + overlay connect). Replaces the
  // legacy EnemyAttackSystem missile mechanic. Always present; emptied per level.
  private _deliverySystem = new DeliverySystem()
  // Behaviour-graph runner for the active enemy. Undefined when the current
  // enemy has no behaviorGraph — a valid, non-attacking state.
  private _behaviorRunner?: EnemyBehaviorRunner
  // Id of the behaviour-graph node whose animation the enemy is currently
  // playing. Lets _syncEnemyAnimation (re)play an animation exactly once per
  // node activation rather than every frame. Reset on level load.
  private _lastAnimNodeId: string | null = null
  private player = new Player(PLAYER_MAX_HP)
  private lastHit: { result: HitResult; timestamp: number; damage: number; hitZone: HitZoneName; position: { x: number; y: number } | null } | null = null
  private lastPlayerHit: PlayerHitEvent | null = null
  private _pendingInputs: InputEvent[] = []
  private playerXp = 0
  private playerLevel: number = PLAYER_START_LEVEL
  private pendingLevelUp = false

  // Global upgrade state — drives crit, chain, cast time, stun, and tolerance effects.
  // Defaults to the no-effect state; mutated via confirmLevelUpUpgrade and
  // _applyUpgradeForTesting.
  private _globalUpgrades: GlobalUpgradeState = {
    ...DEFAULT_GLOBAL_UPGRADE_STATE,
    unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
  }
  // Cross-slot fire timing for the quick chain bonus.
  // Maps slot id ("left_0", "right_0", …) → elapsedMs of the slot's last fire.
  private _lastCastBySlot: Record<string, number> = {}
  // Absolute elapsedMs until which the enemy is stunned (cannot attack).
  // 0 = not stunned. Reset on every level load.
  private _enemyStunnedUntilMs = 0
  // StatusEffectSystem manages all active status effects (frozen, burning, …).
  // Replaces the former inline _enemyFrozenUntilMs + _wasFrozenLastTick fields.
  private _statusEffectSystem = new StatusEffectSystem()
  // Active status effects for the current enemy — reset on every level load.
  // Owned here (not by Enemy entity) so getState() can expose them as serialisable data.
  private _enemyStatusEffects: import('./skills/types').StatusEffect[] = []
  // Tracks whether the enemy was frozen on the previous tick — drives holdFrame
  // (freeze start) and animation restore (freeze end) transitions.
  private _wasFrozenLastTick = false
  // Lightning discharge state — set on lightning_blast release, consumed by the render layer.
  private _lightningDischargeUntilMs = 0
  private _lightningDischargeResult: HitResult | null = null
  private _lightningDischargeTarget: { x: number; y: number } | null = null
  // Optional pixel-perfect mask detector for sprite-based enemies.
  // Injected from BattleScene after mask data is loaded from textures.
  private _maskDetector?: MaskHitDetector

  // Injectable RNG used for both the crit-stun probability roll and the
  // spread-skill (fireball/white_shot) base-damage roll. A single channel
  // keeps determinism predictable for tests: stubbing the RNG fixes BOTH
  // sources, so an assertion on damage after a forced stun stays stable.
  private _rng: () => number

  // Per-skill-slot fight statistics — reset on nextLevel() and restartGame()
  private _fightStats!: FightStats
  // Snapshot of fightStats captured at enemy kill — exposed in getState() for FightOverviewOverlay.
  // Cleared on nextLevel() / restartGame() after it has been consumed.
  private _fightStatsSnapshot: FightStats | null = null
  // Tracks the elapsedMs of the most recent touch-up per slot id.
  // Used to compute touchGaps: gap = next touch-down elapsedMs - _lastTouchUpMs[slotId]
  private _lastTouchUpMs: Record<string, number | null> = {}

  // Dynamic layout — generated from skill config
  private _layout: ActiveTouchPointPos[]
  // Per-slot touch interaction state, keyed by slot ID ("left_0", "right_0", …)
  private _slotStates: Record<string, { active: boolean; dragOffsetX: number; touchStartMs: number }>

  constructor(skillConfig?: readonly SkillSlotConfig[], rng: () => number = Math.random) {
    const config = skillConfig ?? DEFAULT_SKILL_CONFIG
    this._layout = this._buildLayout(config, GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM)
    this._slotStates = {}
    for (const slot of this._layout) {
      this._slotStates[slot.id] = { active: false, dragOffsetX: 0, touchStartMs: 0 }
    }
    this.inputManager = new InputManager(this._layoutToEntries(this._layout))
    this._rng = rng
    this._fightStats = this._initFightStats()
    for (const slot of this._layout) {
      this._lastTouchUpMs[slot.id] = null
    }
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /**
   * Transition from 'loading' → 'battle'.
   * Initializes enemy HP from the first ENEMY_POOL entry.
   * Idempotent if already in battle.
   */
  startBattle(): void {
    if (this.phase === 'loading') {
      this._enemyPoolIndex = 0
      this._loadLevel(ENEMY_POOL[this._enemyPoolIndex])
      this.phase = 'battle'
    }
  }

  /**
   * Advance to the next level.
   * Loads the next ENEMY_POOL entry (enemy name, HP, behavior).
   * Resets phase to 'battle' for the new fight.
   * Does nothing if not in 'fight_overview' phase.
   * Blocked while pendingLevelUp is true — the upgrade pick gate must clear first.
   */
  nextLevel(): void {
    if (this.phase !== 'fight_overview') return
    if (this.pendingLevelUp) return
    // Guard: if already on the last level, nextLevel() is not valid — use completeFightOverview() instead.
    if (this.currentLevel >= ENEMY_POOL.length) return
    this.currentLevel++
    // Sequential enemy rotation from ENEMY_POOL
    this._enemyPoolIndex = (this._enemyPoolIndex + 1) % ENEMY_POOL.length
    this._loadLevel(ENEMY_POOL[this._enemyPoolIndex])
    this.projectileSystem.reset()
    this._fightStats = this._initFightStats()
    this._fightStatsSnapshot = null
    this._lastTouchUpMs = {}
    this.phase = 'battle'
  }

  /**
   * Restart the current level after a game over.
   * Resets enemy HP, player HP, projectiles, and missiles — keeps the current level number.
   * Does nothing if not in 'game_over' phase.
   */
  restartLevel(): void {
    if (this.phase !== 'game_over') return
    // Clear the upgrade-pick gate if the player died mid-decision — otherwise
    // the next kill's pendingLevelUp gate would prevent progression with no UI
    // re-entry point.
    this.pendingLevelUp = false
    this._loadLevel(ENEMY_POOL[this._enemyPoolIndex])
    this.projectileSystem.reset()
    this.phase = 'battle'
  }

  /**
   * Restart the game from level 1.
   * Used after 'fight_overview' (when on the last level) phase.
   * Does nothing if not in 'fight_overview' phase.
   */
  restartGame(): void {
    if (this.phase !== 'fight_overview') return
    this.currentLevel = 1
    this._enemyPoolIndex = 0
    this.score = { total: 0, crits: 0, hits: 0, grazes: 0, misses: 0 }
    this.elapsedMs = 0
    this.lastHit = null
    this.playerXp = 0
    this.playerLevel = PLAYER_START_LEVEL
    this.pendingLevelUp = false
    this._globalUpgrades = {
      ...DEFAULT_GLOBAL_UPGRADE_STATE,
      unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds],
    }
    this._loadLevel(ENEMY_POOL[this._enemyPoolIndex])
    this.projectileSystem.reset()
    this._fightStats = this._initFightStats()
    this._fightStatsSnapshot = null
    this._lastTouchUpMs = {}
    this.phase = 'battle'
  }

  /**
   * Complete the fight overview screen — called by the "Next enemy" / "Play again" button.
   * Advances to the next level or restarts the game based on whether the last level was completed.
   * Does nothing if not in 'fight_overview' phase.
   */
  completeFightOverview(): void {
    if (this.phase !== 'fight_overview') return
    if (this.currentLevel >= ENEMY_POOL.length) {
      // Last level was completed — restart the full game
      this.restartGame()
    } else {
      // More levels remain — advance to the next one
      this.nextLevel()
    }
  }

  /**
   * Confirm the upgrade pick from the level-up screen and release the gate.
   * The nodeId is accepted but not validated here — task-42 introduces the
   * UpgradeNodeId type and applyUpgradeNode logic.
   * Does nothing when no level-up is pending.
   */
  confirmLevelUpUpgrade(nodeId?: UpgradeNodeId): void {
    if (!this.pendingLevelUp) return
    if (nodeId !== undefined) {
      // Enforce dependency order (and the "no double-pick" invariant) at the
      // gate, not just at the UI layer — debug tooling and Playwright bridges
      // can call this directly and must not be able to skip prerequisites or
      // silently consume the level-up on a stale id.
      const available = getAvailableNodes(this._globalUpgrades)
      if (!available.some((n) => n.id === nodeId)) {
        throw new Error(`Upgrade node not available: ${nodeId}`)
      }
      this._globalUpgrades = applyUpgradeNode(this._globalUpgrades, nodeId)
    }
    this.pendingLevelUp = false
  }

  /**
   * Set the pixel-perfect mask detector for sprite-based enemies.
   * Called from BattleScene after mask PNG data has been loaded from textures.
   * The detector is passed into Enemy constructors for enemies whose manifest declares hasMasks.
   */
  setMaskDetector(detector: MaskHitDetector): void {
    this._maskDetector = detector
  }

  /**
   * Advance the game by dt milliseconds, processing the given input events.
   * Delta time is capped at MAX_DELTA_MS to prevent spiral-of-death.
   *
   * @param dt     - frame delta in ms (uncapped)
   * @param inputs - raw pointer events captured since last frame
   * @returns      - serializable GameState snapshot
   */
  update(dt: number, inputs: InputEvent[]): GameState {
    if (this.phase !== 'battle') return this.getState()

    const cappedDt = Math.min(dt, MAX_DELTA_MS)
    this.elapsedMs += cappedDt
    this._fightStats.durationMs += cappedDt

    // 1. Process raw inputs → typed commands (including queued test-bridge inputs)
    const allInputs = [...this._pendingInputs, ...inputs]
    this._pendingInputs = []
    const commands = this.inputManager.update(allInputs)

    // 2. Apply commands to slot states and fire projectiles
    for (const cmd of commands) {
      if (cmd.type === 'aim') {
        const ts = this._slotStates[cmd.touchPointId]
        if (ts) {
          // Touch-down: if the slot was previously inactive, check for a touchGap.
          if (!ts.active) {
            const slot = this._layout.find((s) => s.id === cmd.touchPointId)
            if (slot) {
              const lastUp = this._lastTouchUpMs[cmd.touchPointId]
              if (lastUp !== null && lastUp !== undefined) {
                const gap = this.elapsedMs - lastUp
                const side = slot.side
                this._fightStats[side].touchGaps.push(gap)
              }
            }
          }
          if (!ts.active) ts.touchStartMs = this.elapsedMs
          ts.active = true
          ts.dragOffsetX = cmd.dragOffsetX
        }
      } else if (cmd.type === 'fire') {
        const ts = this._slotStates[cmd.touchPointId]
        if (ts) {
          ts.active = false
          ts.dragOffsetX = 0
        }
        // Find the slot in the layout to get position, rotationPeriodMs, and side.
        // Also used to track touchGap timestamps and fireCount for per-skill stats.
        const slot = this._layout.find((s) => s.id === cmd.touchPointId)
        if (slot) {
          // Touch-up: record timestamp for touchGap tracking and increment fireCount.
          this._lastTouchUpMs[cmd.touchPointId] = this.elapsedMs
          this._fightStats[slot.side].fireCount++
          // All slot IDs are initialised in the constructor and setTouchPointPositions().
          // Non-null assertion is safe: slotState is always defined for a valid slot ID.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const touchStartMs = this._slotStates[cmd.touchPointId]!.touchStartMs
          const effectivePeriodMs = slot.rotationPeriodMs * this._globalUpgrades.castTimeMultiplier
          const reticle = computeReticle(
            { rotationPeriodMs: effectivePeriodMs } as import('../types').TouchPoint,
            cmd.dragOffsetX,
            this.elapsedMs - touchStartMs,
          )

          // Decide chain bonus AT FIRE TIME, then record this cast. Doing this
          // before the bookkeeping update means the bonus reflects fire-to-fire
          // timing (not later projectile flight) and does not depend on whether
          // the same slot fires again before this projectile lands.
          const chainBonus = this._computeChainBonus(slot.id)
          this._lastCastBySlot[slot.id] = this.elapsedMs

          // Use the slot's configured skillType (not cmd.skillType which is hardcoded
          // to LEFT_SIDE_SKILL / RIGHT_SIDE_SKILL by InputManager.skillTypeForSide).
          const skillType = slot.skillType
          if (skillType === 'lightning_blast') {
            const hitResult = this.enemy.getHitResult(
              { x: reticle.x, y: reticle.y },
              this._globalUpgrades.critZoneTolerance,
            )
            this._applyHit(hitResult, 'lightning_blast', { x: reticle.x, y: reticle.y }, chainBonus, 0, slot.side)
            const durations: Record<HitResult, number> = {
              CRIT: LIGHTNING_BLAST_DURATION_CRIT_MS,
              HIT: LIGHTNING_BLAST_DURATION_HIT_MS,
              GRAZE: LIGHTNING_BLAST_DURATION_GRAZE_MS,
              MISS: 0,
            }
            this._lightningDischargeUntilMs = this.elapsedMs + durations[hitResult]
            this._lightningDischargeResult = hitResult
            this._lightningDischargeTarget = { x: reticle.x, y: reticle.y }
          } else {
            this.projectileSystem.fire(
              { x: slot.x, y: slot.y },
              { x: reticle.x, y: reticle.y },
              skillType,
              chainBonus,
              {
                projectileSpeedMultiplier: this._globalUpgrades.projectileSpeedMultiplier,
                spellAreaMultiplier: this._globalUpgrades.spellAreaMultiplier,
              },
              slot.side,
            )
          }
        }
      }
    }

    // 3. Update enemy position via BehaviorSystem
    const newPos = computeEnemyPosition(
      this._enemyOriginX,
      this._enemyOriginY,
      this.elapsedMs,
      this._enemyBehavior,
    )
    this.enemy.x = newPos.x
    this.enemy.y = newPos.y

    // 4. Advance projectiles and collect hits — pass the active crit tolerance
    //    so near-miss CRIT promotion is applied uniformly across all projectiles.
    const hitEvents = this.projectileSystem.update(
      cappedDt,
      this.enemy,
      this._globalUpgrades.critZoneTolerance,
    )

    // 5. Update score from hit events
    for (const evt of hitEvents) {
      this._applyHit(evt.result, evt.skillType, evt.position, evt.chainBonus, evt.projectileRadius, evt.side)
    }

    // 6. Advance enemy animation
    this.enemy.updateAnimation(cappedDt)

    // 6.5 Tick StatusEffectSystem — advance timers, remove expired effects.
    this._statusEffectSystem.tick(cappedDt, this._enemyStateSlice())

    // 7. Tick the behaviour-graph runner (if the enemy has a graph).
    //    The runner owns the state machine; the orchestrator owns animation
    //    playback. Stun/freeze freezes the whole graph (tick = no-op) — already-flying
    //    deliveries still advance in step 8. Skip if the enemy died in step 5.
    if (this.phase === 'battle' && this._behaviorRunner) {
      const isFrozen = this._statusEffectSystem.isActive(this._enemyStateSlice(), 'frozen')
      const isStunned = isFrozen || this.elapsedMs < this._enemyStunnedUntilMs

      // Freeze start: hold the animation on the current frame.
      if (isFrozen && !this._wasFrozenLastTick) {
        this.enemy.holdFrame(this.enemy.currentAnimKey, this.enemy.currentFrameIndex)
      }
      // Freeze end: reset anim sync so runner immediately restores natural animation.
      if (!isFrozen && this._wasFrozenLastTick) {
        this._lastAnimNodeId = null
      }
      this._wasFrozenLastTick = isFrozen

      const ctx = {
        frameIndex: this.enemy.currentFrameIndex,
        // A one-shot node's animation is complete once the controller is no
        // longer playing it (it has returned to default or frozen on last).
        animationComplete: !this.enemy.isAnimPlaying,
        // enemyMaxHp is always positive (set from EnemyDef.maxHp on level load).
        enemyHpPct: this.enemyHp / this.enemyMaxHp,
        isStunned,
      }
      const { attacks } = this._behaviorRunner.tick(cappedDt, ctx)
      for (const spec of attacks) {
        this._deliverySystem.spawn(spec, { x: this.enemy.x, y: this.enemy.y }, PLAYER_CENTRE)
      }
      // Drive the enemy sprite from the (possibly new) active node.
      this._syncEnemyAnimation(this._behaviorRunner)
    }

    // 8. Advance in-flight deliveries and apply connects to the player.
    //    Deliveries are fire-and-forget: they keep travelling through stun and
    //    even after the runner stops ticking, so this runs unconditionally while
    //    in battle.
    if (this.phase === 'battle') {
      const deliveryHits = this._deliverySystem.update(cappedDt)
      for (const hit of deliveryHits) {
        this._applyPlayerHit(hit.damage)
        if (this.phase !== 'battle') break
      }
    }

    return this.getState()
  }

  /**
   * Enqueue a raw input event to be processed on the next update() call.
   * Used by the test bridge to simulate touch events from Playwright.
   */
  queueInput(event: InputEvent): void {
    this._pendingInputs.push(event)
  }

  /**
   * Update the dynamic layout positions (e.g. after measuring pixel density from DOM).
   * Rebuilds InputManager with the new positions and initialises slot states for any new IDs.
   * Positions must follow the same slot ID scheme as the original layout ("left_0", "right_0", …).
   *
   * IMPORTANT: `rotationPeriodMs` in `positions` must be the BASE rotation period
   * for the skill (the value returned by rotationPeriodForSkill), not the
   * effective value exposed in `getState().activeSlots[i].rotationPeriodMs`,
   * which is already multiplied by castTimeMultiplier. Round-tripping the
   * latter through this method would double-scale the laser sweep.
   *
   * @param positions - Array of ActiveTouchPointPos matching the rendered slot circles
   */
  setTouchPointPositions(positions: ActiveTouchPointPos[]): void {
    this._layout = positions
    // Ensure all slot IDs have a corresponding state entry (handles new IDs from new layout)
    for (const slot of positions) {
      if (!(slot.id in this._slotStates)) {
        this._slotStates[slot.id] = { active: false, dragOffsetX: 0, touchStartMs: 0 }
      }
    }
    this.inputManager = new InputManager(this._layoutToEntries(positions))
  }

  /**
   * Returns the current dynamic layout positions used for rendering and nearest-point lookup.
   * Exposed for the test bridge so Playwright can query rendered slot positions.
   */
  getTouchPointPositions(): ActiveTouchPointPos[] {
    return this._layout.map(p => ({ ...p }))
  }

  /**
   * Directly apply a hit (result + skillType) to the state machine.
   * Mirrors the production fire→resolve path: callers may supply chainBonus and
   * projectileRadius for symmetry with ProjectileHitEvent. Today `position` is
   * always null here (no geometry), so the radius only matters for any future
   * extension that re-derives hitZone from a position.
   * `side` defaults to 'left' so existing tests that don't care about per-slot
   * stats don't need to be updated.
   * @internal For unit tests only — do not use in production code.
   */
  _applyHitForTesting(
    result: HitResult,
    skillType: SkillType,
    chainBonus = 0,
    projectileRadius = 0,
    side: 'left' | 'right' = 'left',
  ): void {
    this._applyHit(result, skillType, null, chainBonus, projectileRadius, side)
  }

  /**
   * Simulate a lightning_blast hit with a given result, setting discharge state
   * exactly as the real fire path would. Used to test discharge duration mapping
   * without requiring input-system routing.
   * @internal For unit tests only — do not use in production code.
   */
  _fireLightningBlastForTesting(result: HitResult): void {
    this._applyHit(result, 'lightning_blast', null, 0, 0, 'left')
    const durations: Record<HitResult, number> = {
      CRIT: LIGHTNING_BLAST_DURATION_CRIT_MS,
      HIT: LIGHTNING_BLAST_DURATION_HIT_MS,
      GRAZE: LIGHTNING_BLAST_DURATION_GRAZE_MS,
      MISS: 0,
    }
    this._lightningDischargeUntilMs = this.elapsedMs + durations[result]
    this._lightningDischargeResult = result
    this._lightningDischargeTarget = { x: GAME_WIDTH / 2, y: 0 }
  }

  /**
   * Apply an upgrade node to the global upgrade state immediately, bypassing
   * the pendingLevelUp gate. Used by unit and game-design tests to set up
   * specific upgrade states without driving the XP/level pipeline.
   * Idempotent — applying an already-unlocked node is a no-op so describe.each
   * style stacking tests do not throw.
   * @internal For tests only — production code should call confirmLevelUpUpgrade.
   */
  _applyUpgradeForTesting(nodeId: UpgradeNodeId): void {
    if (this._globalUpgrades.unlockedNodeIds.includes(nodeId)) return
    this._globalUpgrades = applyUpgradeNode(this._globalUpgrades, nodeId)
  }

  /**
   * Install (or clear) a behaviour graph on the active enemy, bypassing _loadLevel.
   * Pass a BehaviorGraph to install it; pass undefined to clear the runner so the
   * enemy stops attacking — used by tests to verify the no-graph code path.
   * Also resets the delivery system so a freshly injected graph starts clean.
   * @internal For tests only.
   */
  _initBehaviorGraphForTesting(graph: BehaviorGraph | undefined): void {
    this._initBehaviorRunner(graph)
    this._deliverySystem.reset()
  }

  /**
   * Returns a fully serializable snapshot of the current game state.
   * JSON.stringify safe — no class instances or functions.
   */
  getState(): GameState {
    // Build activeSlots from layout + slot states.
    // All slot IDs are initialised in the constructor and setTouchPointPositions().
    // Non-null assertion is safe: slotState is always defined for a valid slot ID.
    const activeSlots: ActiveSlotState[] = this._layout.map(slot => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const ts = this._slotStates[slot.id]!
      return {
        id: slot.id,
        x: slot.x,
        y: slot.y,
        side: slot.side,
        skillType: slot.skillType,
        // Effective rotation period — base × castTimeMultiplier so UI, aim math
        // and test bridge all agree on what the laser is actually doing.
        rotationPeriodMs: slot.rotationPeriodMs * this._globalUpgrades.castTimeMultiplier,
        active: ts.active,
        dragOffsetX: ts.dragOffsetX,
        touchStartMs: ts.touchStartMs,
      }
    })

    // Count slots per side
    const leftCount = this._layout.filter(s => s.side === 'left').length
    const rightCount = this._layout.filter(s => s.side === 'right').length

    // Compute enemy bounding box for hit zone scaling.
    // Head top = torso centre Y - torso half-height - head diameter
    // Leg bottom = torso centre Y + torso half-height + leg length
    const bboxW = ENEMY_TORSO_WIDTH_PX
    const headDiameter = ENEMY_HEAD_RADIUS_PX * 2
    const bboxH = headDiameter + ENEMY_TORSO_HEIGHT_PX + ENEMY_LEG_LENGTH_PX
    // Centre of bounding box = midpoint between head top and leg bottom
    const bboxCentreY = this.enemy.y - ENEMY_TORSO_HEIGHT_PX / 2 - headDiameter + bboxH / 2

    const enemyHitZonesPx: HitZoneEntryPx[] = scaleHitZoneMap(
      this._enemyHitZoneMap,
      this.enemy.x,
      bboxCentreY,
      bboxW,
      bboxH,
    )

    return {
      phase: this.phase,
      score: { ...this.score },
      enemy: { x: this.enemy.x, y: this.enemy.y, stunnedUntilMs: this._enemyStunnedUntilMs },
      activeProjectiles: this.projectileSystem.getProjectiles().map((p) => ({ ...p })),
      elapsedMs: this.elapsedMs,
      lastHit: this.lastHit ? { ...this.lastHit } : null,
      activeSlots,
      enemyHp: this.enemyHp,
      enemyMaxHp: this.enemyMaxHp,
      enemyName: this.enemyName,
      enemySpriteKey: this._enemySpriteKey,
      enemyManifestId: this._enemyManifestId,
      enemyDisplayWidth: this.enemy.displayWidth,
      enemyFrozenUntilMs: this._computeEnemyFrozenUntilMs(),
      lightningDischargeUntilMs: this._lightningDischargeUntilMs,
      lightningDischargeResult: this._lightningDischargeResult,
      lightningDischargeTarget: this._lightningDischargeTarget ? { ...this._lightningDischargeTarget } : null,
      enemyAnimKey: this.enemy.currentAnimKey,
      enemyFrameIndex: this.enemy.currentFrameIndex,
      currentLevel: this.currentLevel,
      touchPointsPerSide: { left: leftCount, right: rightCount },
      enemyHitZonesPx,
      player: { hp: this.player.hp, maxHp: this.player.maxHp },
      activeDeliveries: this._deliverySystem.getActive(),
      lastPlayerHit: this.lastPlayerHit ? { ...this.lastPlayerHit } : null,
      playerXp: this.playerXp,
      playerLevel: this.playerLevel,
      pendingLevelUp: this.pendingLevelUp,
      globalUpgrades: {
        ...this._globalUpgrades,
        unlockedNodeIds: [...this._globalUpgrades.unlockedNodeIds],
      },
      lastCastBySlot: { ...this._lastCastBySlot },
      fightStats: {
        left: {
          ...this._fightStats.left,
          hitsByResult: { ...this._fightStats.left.hitsByResult },
          touchGaps: [...this._fightStats.left.touchGaps],
        },
        right: {
          ...this._fightStats.right,
          hitsByResult: { ...this._fightStats.right.hitsByResult },
          touchGaps: [...this._fightStats.right.touchGaps],
        },
        durationMs: this._fightStats.durationMs,
      },
      fightStatsSnapshot: this._fightStatsSnapshot
        ? {
            left: {
              ...this._fightStatsSnapshot.left,
              hitsByResult: { ...this._fightStatsSnapshot.left.hitsByResult },
              touchGaps: [...this._fightStatsSnapshot.left.touchGaps],
            },
            right: {
              ...this._fightStatsSnapshot.right,
              hitsByResult: { ...this._fightStatsSnapshot.right.hitsByResult },
              touchGaps: [...this._fightStatsSnapshot.right.touchGaps],
            },
            durationMs: this._fightStatsSnapshot.durationMs,
          }
        : null,
    }
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  /**
   * Create a zeroed SkillFightStats entry for the given skill type.
   */
  private _initSkillFightStats(skillType: SkillType): SkillFightStats {
    return {
      skillType,
      fireCount: 0,
      hitsByResult: { CRIT: 0, HIT: 0, GRAZE: 0, MISS: 0 },
      totalDamage: 0,
      touchGaps: [],
    }
  }

  /**
   * Create a fresh FightStats object from the current layout.
   * Left stats use the first left-side slot's skillType; right stats use the first right-side slot.
   * The layout is guaranteed to have at least one slot per side by the constructor invariant.
   */
  private _initFightStats(): FightStats {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const leftSkill = this._layout.find((s) => s.side === 'left')!.skillType
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rightSkill = this._layout.find((s) => s.side === 'right')!.skillType
    return {
      left: this._initSkillFightStats(leftSkill),
      right: this._initSkillFightStats(rightSkill),
      durationMs: 0,
    }
  }

  /**
   * Load an EnemyDef into all per-level state — enemy stats, behavior, shape,
   * hit geometry, attack system, and player HP. Shared by startBattle / nextLevel /
   * restartLevel / restartGame so level entry is uniform.
   */
  private _loadLevel(enemyDef: EnemyDef): void {
    this.enemyHp = enemyDef.maxHp
    this.enemyMaxHp = enemyDef.maxHp
    this.enemyName = enemyDef.name
    this._enemySpriteKey = resolveSpriteKey(enemyDef)
    this._enemyManifestId = enemyDef.manifestId
    this._enemyHitZoneMap = resolveHitZoneMap(enemyDef)
    this._enemyBehavior = resolveBehavior(enemyDef)

    // Build AnimationController and resolve mask/display from CharacterRegistry manifest
    let animController: AnimationController | undefined
    let useMask: MaskHitDetector | undefined
    let displayW = enemyDef.displayWidth ?? 128
    const manifestId = enemyDef.manifestId
    if (manifestId && characterRegistry.has(manifestId)) {
      const manifest = characterRegistry.get(manifestId)
      const animDefs = characterRegistry.getAnimationDefs(manifestId)
      animController = new AnimationController(animDefs)
      displayW = enemyDef.displayWidth ?? manifest.displayWidth

      const hasMasks = Object.values(manifest.animations).some(a => a.hasMasks)
      if (hasMasks && this._maskDetector) {
        useMask = this._maskDetector
      }
    }

    this.enemy = new Enemy(
      this._enemyOriginX,
      this._enemyOriginY,
      this._enemySpriteKey,
      animController,
      useMask,
      displayW,
      displayW,
    )
    this.player.reset()
    this.lastPlayerHit = null
    // Init the behaviour-graph runner from the enemy's graph. Enemies without a
    // graph never attack — the runner stays undefined and update() skips ticking.
    this._initBehaviorRunner(enemyDef.behaviorGraph)
    this._deliverySystem.reset()
    this._enemyStunnedUntilMs = 0
    this._enemyStatusEffects = []
    this._wasFrozenLastTick = false
    this._lightningDischargeUntilMs = 0
    this._lightningDischargeResult = null
    this._lightningDischargeTarget = null
    this._lastCastBySlot = {}
  }

  /**
   * (Re)build the behaviour-graph runner for the active enemy.
   * Resets the per-node animation latch so the start node's animation is played
   * on the first tick. A null/undefined graph clears the runner (no attacks).
   * Shares the machine's RNG channel so weighted edge picks stay deterministic
   * under the same stubbed rng used elsewhere in tests.
   */
  private _initBehaviorRunner(graph: BehaviorGraph | undefined): void {
    this._behaviorRunner = graph ? new EnemyBehaviorRunner(graph, this._rng) : undefined
    this._lastAnimNodeId = null
  }

  /**
   * Drive the enemy sprite from the runner's active node.
   * Plays the node's animation (or freezes a holdFrame) exactly once per node
   * activation: a one-shot animation returning to its default must not be
   * re-triggered every frame while the node is still active.
   */
  private _syncEnemyAnimation(runner: EnemyBehaviorRunner): void {
    const nodeId = runner.currentNode.id
    if (nodeId === this._lastAnimNodeId) return
    this._lastAnimNodeId = nodeId
    const holdFrame = runner.currentHoldFrame
    if (holdFrame) {
      this.enemy.holdFrame(holdFrame.animKey, holdFrame.frameIndex)
    } else {
      this.enemy.playAnimation(runner.currentAnimKey)
    }
  }

  /**
   * Build the dynamic layout from a skill config array.
   */
  private _buildLayout(
    config: readonly SkillSlotConfig[],
    W: number,
    H: number,
    pxCm: number,
  ): ActiveTouchPointPos[] {
    const leftSlots = config
      .filter(s => s.side === 'left')
      .map(s => ({ skillType: s.skillType, side: s.side as 'left', slotIndex: s.slotIndex }))
    const rightSlots = config
      .filter(s => s.side === 'right')
      .map(s => ({ skillType: s.skillType, side: s.side as 'right', slotIndex: s.slotIndex }))
    return generateTouchPointLayout(leftSlots, rightSlots, W, H, pxCm)
  }

  /**
   * Convert ActiveTouchPointPos[] to TouchPointEntry[] for InputManager constructor.
   */
  private _layoutToEntries(layout: ActiveTouchPointPos[]): TouchPointEntry[] {
    return layout.map(slot => ({
      id: slot.id,
      x: slot.x,
      y: slot.y,
      side: slot.side,
    }))
  }

  /**
   * Build a minimal EnemyStateSlice from current GSM state.
   * The slice is the live view of the enemy's mutable status — it references
   * _enemyStatusEffects directly so StatusEffectSystem mutates the same array.
   */
  private _enemyStateSlice(): EnemyStateSlice {
    return {
      hp: this.enemyHp,
      maxHp: this.enemyMaxHp,
      activeStatusEffects: this._enemyStatusEffects,
    }
  }

  /**
   * Derive the legacy `enemyFrozenUntilMs` timestamp from the active status effects.
   * Returns elapsedMs + remainingMs for the 'frozen' effect, or 0 if not frozen.
   * This keeps the GameState interface backward-compatible for renderers and tests.
   */
  private _computeEnemyFrozenUntilMs(): number {
    const frozen = this._enemyStatusEffects.find(e => e.kind === 'frozen')
    if (!frozen || frozen.remainingMs <= 0) return 0
    return this.elapsedMs + frozen.remainingMs
  }

  /**
   * Applies a HitResult to the score, deals damage to the enemy HP,
   * and records lastHit (including damage dealt and hit zone).
   * Transitions phase to 'fight_overview' when HP reaches 0.
   * @param position - world position where the projectile landed (null for test-only calls)
   * @param projectileRadius - effective projectile radius (px) used by the originating
   *                           projectile, so the hitZone re-derivation matches the
   *                           ProjectileSystem's hit decision. Defaults to 0.
   * @param side - which skill slot side fired this projectile; drives per-slot stats tracking.
   */
  private _applyHit(
    result: HitResult,
    skillType: SkillType,
    position: { x: number; y: number } | null,
    chainBonus = 0,
    projectileRadius = 0,
    side: 'left' | 'right' = 'left',
  ): void {
    switch (result) {
      case 'CRIT':
        this.score.total += CRIT_SCORE
        this.score.crits++
        break
      case 'HIT':
        this.score.total += HIT_SCORE
        this.score.hits++
        break
      case 'GRAZE':
        this.score.grazes++
        break
      case 'MISS':
        this.score.misses++
        break
    }

    // Resolve interaction rules (OCP — no switch/case on skillType).
    // resolveHit() reads skill.interactions + enemy.activeStatusEffects to
    // produce a damage multiplier override and optional visual key.
    const enemySlice = this._enemyStateSlice()
    let interactionMultiplier = 1.0
    if (result !== 'MISS' && SkillRegistry.has(skillType)) {
      const skill = SkillRegistry.get(skillType)
      const baseResolution: HitResolution = { result, damageMultiplier: 1.0, visualKey: null }
      const resolved = resolveHit(skill, enemySlice, baseResolution)
      interactionMultiplier = resolved.damageMultiplier
    }

    const damage = Math.round(calculateDamage(result, skillType, this._rng, {
      stats: computePlayerStats(this._globalUpgrades),
      chainBonus,
    }) * interactionMultiplier)
    this.enemyHp = Math.max(0, this.enemyHp - damage)

    // Update per-skill fight stats.
    const slotStats = this._fightStats[side]
    slotStats.hitsByResult[result]++
    slotStats.totalDamage += damage

    const hitZone = position
      ? this.enemy.getHitZone(position, this._globalUpgrades.critZoneTolerance, projectileRadius)
      : 'none'
    this.lastHit = { result, timestamp: this.elapsedMs, damage, hitZone, position }

    // Crit stun roll — only on CRITs, only when the upgrade is active, AND only
    // when the enemy survived the hit. Stunning a corpse leaks a positive
    // stunnedUntilMs into the level_complete snapshot.
    if (
      result === 'CRIT' &&
      this.enemyHp > 0 &&
      this._globalUpgrades.critStunChance > 0 &&
      this._rng() < this._globalUpgrades.critStunChance
    ) {
      this._enemyStunnedUntilMs = this.elapsedMs + this._globalUpgrades.critStunDurationMs
    }

    // Skill-specific post-hit effects — dispatched via SkillModule.onHit().
    // No skill-specific branching here: each skill module declares its own onHit().
    // StatusApplier wires directly to StatusEffectSystem.apply() — no inline handling.
    if (this.enemyHp > 0 && SkillRegistry.has(skillType)) {
      const skill = SkillRegistry.get(skillType)
      if (skill.onHit) {
        const applyStatus: StatusApplier = (effect) => {
          this._statusEffectSystem.apply(enemySlice, effect)
        }
        skill.onHit(enemySlice, result, applyStatus)
      }
    }

    if (this.enemyHp <= 0) {
      // Snapshot fightStats before _onEnemyKilled (which may set pendingLevelUp).
      // The snapshot is consumed by FightOverviewOverlay before stats are reset in nextLevel/restartGame.
      this._fightStatsSnapshot = {
        left: {
          ...this._fightStats.left,
          hitsByResult: { ...this._fightStats.left.hitsByResult },
          touchGaps: [...this._fightStats.left.touchGaps],
        },
        right: {
          ...this._fightStats.right,
          hitsByResult: { ...this._fightStats.right.hitsByResult },
          touchGaps: [...this._fightStats.right.touchGaps],
        },
        durationMs: this._fightStats.durationMs,
      }
      this._onEnemyKilled()
      if (this.currentLevel >= ENEMY_POOL.length) {
        // Upgrade picker has no purpose after the run ends — clear the gate
        // so UI never has to disambiguate fight_overview vs. pending pick.
        this.pendingLevelUp = false
      }
      // Always transition to fight_overview — never directly to level_complete or victory.
      // FightOverviewOverlay gate controls the actual level/game transition.
      this.phase = 'fight_overview'
    }
  }

  /**
   * Compute the quick-chain bonus for a fire about to happen from firingSlotId.
   * Returns 0 when no other slot has fired within quickChainWindowMs of the
   * current elapsedMs, or when the upgrade is not active.
   */
  private _computeChainBonus(firingSlotId: string): number {
    const u = this._globalUpgrades
    if (u.quickChainBonus <= 0 || u.quickChainWindowMs <= 0) return 0
    let mostRecent: number | null = null
    for (const id of Object.keys(this._lastCastBySlot)) {
      if (id === firingSlotId) continue
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const t = this._lastCastBySlot[id]!
      if (mostRecent === null || t > mostRecent) mostRecent = t
    }
    if (mostRecent === null) return 0
    if (this.elapsedMs - mostRecent > u.quickChainWindowMs) return 0
    return u.quickChainBonus
  }

  /**
   * Award 1 XP on enemy kill and promote the player level if the cumulative XP
   * reaches the next threshold in XP_LEVEL_THRESHOLDS. Sets pendingLevelUp so
   * the next-level transition gates on an upgrade pick.
   */
  private _onEnemyKilled(): void {
    this.playerXp += 1
    if (this.playerLevel >= PLAYER_MAX_LEVEL) return
    const nextLevel = this.playerLevel + 1
    const threshold = XP_LEVEL_THRESHOLDS[nextLevel]
    if (threshold !== undefined && this.playerXp >= threshold) {
      this.playerLevel = nextLevel
      this.pendingLevelUp = true
    }
  }

  /**
   * Test-only: apply damage to the player (simulates an enemy missile hit).
   * Prefix: underscore signals test-only API — not called by production code.
   */
  _applyPlayerHitForTesting(damage: number): void {
    this._applyPlayerHit(damage)
  }

  /**
   * Apply damage to the player from an enemy missile impact.
   * Records lastPlayerHit (drives the red flash overlay + floating damage number)
   * and transitions to 'game_over' when HP hits 0.
   */
  private _applyPlayerHit(damage: number): void {
    this.player.takeDamage(damage)
    this.lastPlayerHit = { timestamp: this.elapsedMs, damage }
    if (this.player.isDead()) {
      this.phase = 'game_over'
    }
  }
}

/**
 * Module-level singleton — shared between BattleScene and the test bridge.
 * BattleScene drives it via update(); testBridge reads/writes it via window.__game.
 */
export const gameMachine = new GameStateMachine()
