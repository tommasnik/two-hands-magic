// ============================================================
// GameStateMachine — pure TypeScript, no Phaser dependency
// Orchestrates all game systems and tracks state transitions.
// ============================================================

import type { GameState, InputEvent, TouchPointId, HitResult, SkillType, Phase, HitZoneName, ActiveSlotState, HitZoneEntry, HitZoneEntryPx, HitZoneLayout, ShapeDescriptor, PlayerHitEvent, GlobalUpgradeState, UpgradeNodeId, FightStats, SkillFightStats } from '../types'
import { InputManager } from './systems/InputManager'
import type { TouchPointEntry } from './systems/InputManager'
import { computeReticle } from './systems/AimSystem'
import { ProjectileSystem } from './systems/ProjectileSystem'
import { calculateDamage } from './systems/DamageSystem'
import { computeEnemyPosition } from './systems/BehaviorSystem'
import { scaleHitZoneMap } from './systems/HitZoneSystem'
import { EnemyAttackSystem } from './systems/EnemyAttackSystem'
import { applyUpgradeNode, getAvailableNodes } from './upgrades'
import type { EnemyBehaviorDef, EnemyDef } from '../types'

import type { MaskHitDetector } from './systems/MaskHitDetector'
import { AnimationController } from './systems/AnimationController'
import { characterRegistry } from './CharacterRegistry'
import { Enemy } from './entities/Enemy'
import { Player } from './entities/Player'
import { generateTouchPointLayout } from './entities/touchPoints'
import type { ActiveTouchPointPos } from './entities/touchPoints'
import {
  MAX_DELTA_MS, CRIT_SCORE, HIT_SCORE, GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM,
  LEVELS, ENEMY_GOBLIN_SCOUT, ENEMY_DEFAULT_Y, DEFAULT_SKILL_CONFIG,
  ENEMY_SPRITE_PLACEHOLDER_KEY, DEFAULT_HIT_ZONE_MAP,
  ENEMY_TORSO_WIDTH_PX, ENEMY_TORSO_HEIGHT_PX, ENEMY_HEAD_RADIUS_PX, ENEMY_LEG_LENGTH_PX,
  DEFAULT_HIT_ZONE_LAYOUT, DEFAULT_SHAPE, PLAYER_MAX_HP, LASER_ORIGIN_Y,
  PLAYER_START_LEVEL, PLAYER_MAX_LEVEL, XP_LEVEL_THRESHOLDS,
  DEFAULT_GLOBAL_UPGRADE_STATE,
} from './constants'
import type { SkillSlotConfig } from './constants'

/** Player centre — origin point enemy missiles target. */
const PLAYER_CENTRE = { x: GAME_WIDTH / 2, y: LASER_ORIGIN_Y }

/** Default behavior for enemy defs that do not specify a behavior. */
const DEFAULT_ENEMY_BEHAVIOR: EnemyBehaviorDef = { pattern: 'static', speed: 0 }

/** Extract behavior from an EnemyDef, falling back to static if undefined. */
export function resolveBehavior(enemyDef: EnemyDef): EnemyBehaviorDef {
  return enemyDef.behavior ?? DEFAULT_ENEMY_BEHAVIOR
}

/**
 * Extract the sprite key from an EnemyDef, falling back to the placeholder key if undefined.
 * Pure function — fully unit-testable.
 */
export function resolveSpriteKey(enemyDef: EnemyDef): string {
  return enemyDef.spriteKey ?? ENEMY_SPRITE_PLACEHOLDER_KEY
}

/**
 * Extract the hit zone map from an EnemyDef, falling back to the default three-zone map.
 * Pure function — fully unit-testable.
 */
export function resolveHitZoneMap(enemyDef: EnemyDef): readonly HitZoneEntry[] {
  return enemyDef.hitZoneMap ?? DEFAULT_HIT_ZONE_MAP
}

/**
 * Extract the hit zone layout from an EnemyDef, falling back to the default layout.
 * The layout drives Enemy.getHitZone() and Enemy.getHitResult() per-enemy geometry.
 * Pure function — fully unit-testable.
 */
export function resolveHitZoneLayout(enemyDef: EnemyDef): HitZoneLayout {
  return enemyDef.hitZoneLayout ?? DEFAULT_HIT_ZONE_LAYOUT
}

/**
 * Extract the shape descriptor from an EnemyDef, falling back to the default humanoid shape.
 * The shape drives BattleScene's procedural drawing when no sprite is loaded.
 * Pure function — fully unit-testable.
 */
export function resolveShape(enemyDef: EnemyDef): ShapeDescriptor {
  return enemyDef.shape ?? DEFAULT_SHAPE
}

// Legacy named touch point IDs for backward-compatible touchStates map.
const LEGACY_TOUCH_IDS: TouchPointId[] = ['green', 'violet', 'orange', 'blue', 'red', 'yellow']

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
  private _enemyBehavior: EnemyBehaviorDef = resolveBehavior(ENEMY_GOBLIN_SCOUT)
  // Active hit zone layout — updated on level load; drives per-enemy hit detection
  private _enemyHitZoneLayout: HitZoneLayout = resolveHitZoneLayout(ENEMY_GOBLIN_SCOUT)
  // Active shape descriptor — updated on level load; drives procedural rendering
  private _enemyShape: ShapeDescriptor = resolveShape(ENEMY_GOBLIN_SCOUT)
  private enemy = new Enemy(GAME_WIDTH / 2, ENEMY_DEFAULT_Y)
  private currentLevel = 1
  private enemyHp = ENEMY_GOBLIN_SCOUT.maxHp
  private enemyMaxHp = ENEMY_GOBLIN_SCOUT.maxHp
  private enemyName = ENEMY_GOBLIN_SCOUT.name
  private _enemySpriteKey = resolveSpriteKey(ENEMY_GOBLIN_SCOUT)
  private _enemyHitZoneMap: readonly HitZoneEntry[] = resolveHitZoneMap(ENEMY_GOBLIN_SCOUT)
  private inputManager: InputManager
  private projectileSystem = new ProjectileSystem()
  private enemyAttackSystem = new EnemyAttackSystem()
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
   * Initializes enemy HP from the current level's LevelDef.
   * Idempotent if already in battle.
   */
  startBattle(): void {
    if (this.phase === 'loading') {
      const levelDef = LEVELS[this.currentLevel - 1]
      this._loadLevel(levelDef.enemyDef)
      this.phase = 'battle'
    }
  }

  /**
   * Advance to the next level.
   * Loads new LevelDef (enemy name, HP, critZoneScale).
   * Resets phase to 'battle' for the new fight.
   * Does nothing if not in 'level_complete' or 'fight_overview' phase.
   * Blocked while pendingLevelUp is true — the upgrade pick gate must clear first.
   */
  nextLevel(): void {
    if (this.phase !== 'level_complete' && this.phase !== 'fight_overview') return
    if (this.pendingLevelUp) return
    // Guard: if already on the last level, nextLevel() is not valid — use completeFightOverview() instead.
    if (this.currentLevel >= LEVELS.length) return
    this.currentLevel++
    const levelDef = LEVELS[this.currentLevel - 1]
    this._loadLevel(levelDef.enemyDef)
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
    const levelDef = LEVELS[this.currentLevel - 1]
    this._loadLevel(levelDef.enemyDef)
    this.projectileSystem.reset()
    this.phase = 'battle'
  }

  /**
   * Restart the game from level 1.
   * Used after 'victory' or 'fight_overview' (when on the last level) phase.
   * Does nothing if not in 'victory' or 'fight_overview' phase.
   */
  restartGame(): void {
    if (this.phase !== 'victory' && this.phase !== 'fight_overview') return
    this.currentLevel = 1
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
    const levelDef = LEVELS[0]
    this._loadLevel(levelDef.enemyDef)
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
    if (this.currentLevel >= LEVELS.length) {
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
   * The detector is passed into Enemy constructors for enemies that have maskConfig.
   */
  setMaskDetector(detector: MaskHitDetector): void {
    this._maskDetector = detector
  }

  /**
   * Update the current animation key and frame index for the active enemy.
   * Called from BattleScene each frame to keep the Enemy entity in sync with
   * the visual animation state. Needed for pixel-perfect mask lookup.
   */
  setEnemyAnimState(animKey: string, frameIndex: number): void {
    this.enemy.currentAnimKey = animKey
    this.enemy.currentFrameIndex = frameIndex
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

          this.projectileSystem.fire(
            { x: slot.x, y: slot.y },
            { x: reticle.x, y: reticle.y },
            cmd.skillType,
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

    // 7. Update enemy attack system (cooldowns, missile flight)
    //    Skip if the enemy is already dead (phase transitioned out of battle in step 5).
    if (this.phase === 'battle') {
      const isStunned = this.elapsedMs < this._enemyStunnedUntilMs
      const missileCountBefore = this.enemyAttackSystem.getMissiles().length
      const missileHits = this.enemyAttackSystem.update(
        cappedDt,
        { x: this.enemy.x, y: this.enemy.y },
        PLAYER_CENTRE,
        isStunned,
      )
      // Trigger attack animation when a new missile is spawned
      const missileCountAfter = this.enemyAttackSystem.getMissiles().length
      if (missileCountAfter > missileCountBefore) {
        this.enemy.playAnimation('attack')
      }
      for (const hit of missileHits) {
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

    // Build legacy touchStates for backward compat (maps named TouchPointId → inactive state)
    // Active slots with matching IDs are reflected; others stay inactive.
    const legacyTouchStates = {} as Record<TouchPointId, { active: boolean; dragOffsetX: number; touchStartMs: number }>
    for (const id of LEGACY_TOUCH_IDS) {
      legacyTouchStates[id] = { active: false, dragOffsetX: 0, touchStartMs: 0 }
    }

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
      touchStates: legacyTouchStates,
      activeSlots,
      enemyHp: this.enemyHp,
      enemyMaxHp: this.enemyMaxHp,
      enemyName: this.enemyName,
      enemySpriteKey: this._enemySpriteKey,
      enemyAnimKey: this.enemy.currentAnimKey,
      enemyFrameIndex: this.enemy.currentFrameIndex,
      currentLevel: this.currentLevel,
      touchPointsPerSide: { left: leftCount, right: rightCount },
      enemyHitZonesPx,
      enemyShape: { ...this._enemyShape },
      player: { hp: this.player.hp, maxHp: this.player.maxHp },
      incomingMissiles: this.enemyAttackSystem.getMissiles(),
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
    this._enemyHitZoneMap = resolveHitZoneMap(enemyDef)
    this._enemyHitZoneLayout = resolveHitZoneLayout(enemyDef)
    this._enemyShape = resolveShape(enemyDef)
    this._enemyBehavior = resolveBehavior(enemyDef)

    // Build AnimationController from CharacterRegistry if manifest is registered
    let animController: AnimationController | undefined
    const manifestId = enemyDef.manifestId
    if (manifestId && characterRegistry.has(manifestId)) {
      const animDefs = characterRegistry.getAnimationDefs(manifestId)
      animController = new AnimationController(animDefs)
    }

    // Pass maskDetector to Enemy only when the enemyDef has maskConfig
    const useMask = enemyDef.maskConfig !== undefined ? this._maskDetector : undefined
    const displayW = enemyDef.displayWidth ?? 128
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
    this.enemyAttackSystem.setAttacks(enemyDef.attacks)
    this._enemyStunnedUntilMs = 0
    this._lastCastBySlot = {}
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
   * Applies a HitResult to the score, deals damage to the enemy HP,
   * and records lastHit (including damage dealt and hit zone).
   * Transitions phase to 'level_complete' or 'victory' when HP reaches 0.
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

    const damage = calculateDamage(result, skillType, this._rng, {
      upgrades: this._globalUpgrades,
      chainBonus,
    })
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
      if (this.currentLevel >= LEVELS.length) {
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
