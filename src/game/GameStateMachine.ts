// GameStateMachine — pure TypeScript, no Phaser dependency.
// Orchestrates all game systems and tracks state transitions.

import type { GameState, InputEvent, HitResult, SkillType, PlayerHitEvent, GlobalUpgradeState, UpgradeNodeId, FightStats, HitZoneEntry, EnemyBehaviorDef, EnemyDef, BehaviorGraph } from '../types'
import { InputManager } from './systems/InputManager'; import type { TouchPointEntry } from './systems/InputManager'
import { ProjectileSystem } from './systems/ProjectileSystem'
import { computeEnemyPosition } from './systems/BehaviorSystem'
import { DeliverySystem } from './systems/DeliverySystem'
import { EnemyBehaviorRunner } from './systems/EnemyBehaviorRunner'
import { applyUpgradeNode, getAvailableNodes } from './upgrades'; import type { MaskHitDetector } from './systems/MaskHitDetector'
import { Enemy } from './entities/Enemy'; import { Player } from './entities/Player'
import { generateTouchPointLayout } from './entities/touchPoints'; import type { ActiveTouchPointPos } from './entities/touchPoints'
import { MAX_DELTA_MS, GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM, ENEMY_DEFAULT_Y, DEFAULT_SKILL_CONFIG, PLAYER_MAX_HP, PLAYER_START_LEVEL, PLAYER_MAX_LEVEL, XP_LEVEL_THRESHOLDS, DEFAULT_GLOBAL_UPGRADE_STATE, ENEMY_POOL } from './constants'
import type { SkillSlotConfig } from './constants'; import type { EnemyStateSlice, StatusEffect } from './skills/types'
import { StatusEffectSystem } from './systems/StatusEffectSystem'; import { PhaseManager } from './systems/PhaseManager'
import { CombatSystem, initSkillFightStats } from './systems/CombatSystem'
import { buildGameState } from './systems/StateBuilder'; import { loadLevel } from './systems/LevelLoader'; import { processCommands } from './systems/CommandProcessor'
import { resolveBehavior, resolveSpriteKey, resolveHitZoneMap, PLAYER_CENTRE, LIGHTNING_DURATIONS } from './resolvers'
export { resolveBehavior, resolveSpriteKey, resolveHitZoneMap }; import './skills/index'

export class GameStateMachine {
  private _phaseManager = new PhaseManager('loading')
  private _statusEffectSystem = new StatusEffectSystem()
  private _combat = new CombatSystem(this._statusEffectSystem)
  private elapsedMs = 0
  private _enemyOriginX = GAME_WIDTH / 2
  private _enemyOriginY = ENEMY_DEFAULT_Y
  private _enemyBehavior: EnemyBehaviorDef = resolveBehavior(ENEMY_POOL[0])
  private enemy = new Enemy(GAME_WIDTH / 2, ENEMY_DEFAULT_Y)
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
  private _deliverySystem = new DeliverySystem()
  private _behaviorRunner?: EnemyBehaviorRunner
  private _lastAnimNodeId: string | null = null
  private player = new Player(PLAYER_MAX_HP)
  private lastPlayerHit: PlayerHitEvent | null = null
  private _pendingInputs: InputEvent[] = []
  private playerXp = 0
  private playerLevel: number = PLAYER_START_LEVEL
  private pendingLevelUp = false
  private _globalUpgrades: GlobalUpgradeState = { ...DEFAULT_GLOBAL_UPGRADE_STATE, unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds] }
  private _enemyStunnedUntilMs = 0
  private _enemyStatusEffects: StatusEffect[] = []
  private _wasFrozenLastTick = false
  private _lightningDischargeUntilMs = 0
  private _lightningDischargeResult: HitResult | null = null
  private _lightningDischargeTarget: { x: number; y: number } | null = null
  private _maskDetector?: MaskHitDetector
  private _rng: () => number
  private _lastTouchUpMs: Record<string, number | null> = {}
  private _layout: ActiveTouchPointPos[]
  private _slotStates: Record<string, { active: boolean; dragOffsetX: number; touchStartMs: number }>

  constructor(skillConfig?: readonly SkillSlotConfig[], rng: () => number = Math.random) {
    const config = skillConfig ?? DEFAULT_SKILL_CONFIG
    this._layout = this._buildLayout(config, GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM)
    this._slotStates = {}
    for (const slot of this._layout) {
      this._slotStates[slot.id] = { active: false, dragOffsetX: 0, touchStartMs: 0 }
      this._lastTouchUpMs[slot.id] = null
    }
    this.inputManager = new InputManager(this._layoutToEntries(this._layout))
    this._rng = rng
    this._combat.fightStats = this._initFightStats()
  }

  startBattle(): void {
    if (this._phaseManager.currentPhase === 'loading') {
      this._enemyPoolIndex = 0; this._applyLoadLevel(ENEMY_POOL[0])
      this._phaseManager.forceTransition('battle')
    }
  }

  nextLevel(): void {
    if (this._phaseManager.currentPhase !== 'fight_overview') return
    if (this.pendingLevelUp || this.currentLevel >= ENEMY_POOL.length) return
    this.currentLevel++
    this._enemyPoolIndex = (this._enemyPoolIndex + 1) % ENEMY_POOL.length
    this._applyLoadLevel(ENEMY_POOL[this._enemyPoolIndex])
    this.projectileSystem.reset(); this._combat.fightStats = this._initFightStats()
    this._combat.fightStatsSnapshot = null; this._lastTouchUpMs = {}
    this._phaseManager.forceTransition('battle')
  }

  restartLevel(): void {
    if (this._phaseManager.currentPhase !== 'game_over') return
    this.pendingLevelUp = false
    this._applyLoadLevel(ENEMY_POOL[this._enemyPoolIndex])
    this.projectileSystem.reset(); this._phaseManager.forceTransition('battle')
  }

  restartGame(): void {
    if (this._phaseManager.currentPhase !== 'fight_overview') return
    this.currentLevel = 1; this._enemyPoolIndex = 0
    this._combat.score = { total: 0, crits: 0, hits: 0, grazes: 0, misses: 0 }
    this.elapsedMs = 0; this._combat.lastHit = null
    this.playerXp = 0; this.playerLevel = PLAYER_START_LEVEL; this.pendingLevelUp = false
    this._globalUpgrades = { ...DEFAULT_GLOBAL_UPGRADE_STATE, unlockedNodeIds: [...DEFAULT_GLOBAL_UPGRADE_STATE.unlockedNodeIds] }
    this._applyLoadLevel(ENEMY_POOL[0]); this.projectileSystem.reset()
    this._combat.fightStats = this._initFightStats(); this._combat.fightStatsSnapshot = null
    this._lastTouchUpMs = {}; this._phaseManager.forceTransition('battle')
  }

  completeFightOverview(): void {
    if (this._phaseManager.currentPhase !== 'fight_overview') return
    if (this.currentLevel >= ENEMY_POOL.length) { this.restartGame() } else { this.nextLevel() }
  }

  confirmLevelUpUpgrade(nodeId?: UpgradeNodeId): void {
    if (!this.pendingLevelUp) return
    if (nodeId !== undefined) {
      const available = getAvailableNodes(this._globalUpgrades)
      if (!available.some((n) => n.id === nodeId)) throw new Error(`Upgrade node not available: ${nodeId}`)
      this._globalUpgrades = applyUpgradeNode(this._globalUpgrades, nodeId)
    }
    this.pendingLevelUp = false
  }

  setMaskDetector(detector: MaskHitDetector): void { this._maskDetector = detector }

  update(dt: number, inputs: InputEvent[]): GameState {
    if (this._phaseManager.currentPhase !== 'battle') return this.getState()
    const cappedDt = Math.min(dt, MAX_DELTA_MS)
    this.elapsedMs += cappedDt; this._combat.fightStats.durationMs += cappedDt
    const allInputs = [...this._pendingInputs, ...inputs]; this._pendingInputs = []
    const lightning = processCommands(this.inputManager.update(allInputs), {
      layout: this._layout, slotStates: this._slotStates, lastTouchUpMs: this._lastTouchUpMs,
      elapsedMs: this.elapsedMs, globalUpgrades: this._globalUpgrades,
      combat: this._combat, projectileSystem: this.projectileSystem, enemy: this.enemy,
      applyHit: (r, sk, pos, cb, pr, side) => this._applyHit(r, sk, pos, cb, pr, side),
    })
    if (lightning) {
      this._lightningDischargeUntilMs = lightning.lightningDischargeUntilMs
      this._lightningDischargeResult = lightning.lightningDischargeResult
      this._lightningDischargeTarget = lightning.lightningDischargeTarget
    }
    const newPos = computeEnemyPosition(this._enemyOriginX, this._enemyOriginY, this.elapsedMs, this._enemyBehavior)
    this.enemy.x = newPos.x; this.enemy.y = newPos.y
    for (const evt of this.projectileSystem.update(cappedDt, this.enemy, this._globalUpgrades.critZoneTolerance)) {
      this._applyHit(evt.result, evt.skillType, evt.position, evt.chainBonus, evt.projectileRadius, evt.side)
    }
    this.enemy.updateAnimation(cappedDt); this._statusEffectSystem.tick(cappedDt, this._enemyStateSlice())
    if (this._phaseManager.currentPhase === 'battle' && this._behaviorRunner) this._tickBehaviorRunner(cappedDt)
    if (this._phaseManager.currentPhase === 'battle') {
      for (const hit of this._deliverySystem.update(cappedDt)) {
        this._applyPlayerHit(hit.damage)
        if (this._phaseManager.currentPhase !== 'battle') break
      }
    }
    return this.getState()
  }

  queueInput(event: InputEvent): void { this._pendingInputs.push(event) }

  setTouchPointPositions(positions: ActiveTouchPointPos[]): void {
    this._layout = positions
    for (const slot of positions) {
      if (!(slot.id in this._slotStates)) this._slotStates[slot.id] = { active: false, dragOffsetX: 0, touchStartMs: 0 }
    }
    this.inputManager = new InputManager(this._layoutToEntries(positions))
  }

  getTouchPointPositions(): ActiveTouchPointPos[] { return this._layout.map(p => ({ ...p })) }

  getState(): GameState {
    return buildGameState({
      phaseManager: this._phaseManager, combat: this._combat, enemy: this.enemy, player: this.player,
      projectileSystem: this.projectileSystem, deliverySystem: this._deliverySystem,
      layout: this._layout, slotStates: this._slotStates, elapsedMs: this.elapsedMs,
      enemyHp: this.enemyHp, enemyMaxHp: this.enemyMaxHp, enemyName: this.enemyName,
      enemySpriteKey: this._enemySpriteKey, enemyManifestId: this._enemyManifestId,
      enemyHitZoneMap: this._enemyHitZoneMap, enemyStunnedUntilMs: this._enemyStunnedUntilMs,
      lightningDischargeUntilMs: this._lightningDischargeUntilMs,
      lightningDischargeResult: this._lightningDischargeResult,
      lightningDischargeTarget: this._lightningDischargeTarget,
      currentLevel: this.currentLevel, lastPlayerHit: this.lastPlayerHit,
      playerXp: this.playerXp, playerLevel: this.playerLevel,
      pendingLevelUp: this.pendingLevelUp, globalUpgrades: this._globalUpgrades,
      enemyStatusEffects: this._enemyStatusEffects,
    })
  }

  // @internal test-only
  _applyHitForTesting(result: HitResult, skillType: SkillType, chainBonus = 0, projectileRadius = 0, side: 'left' | 'right' = 'left'): void {
    this._applyHit(result, skillType, null, chainBonus, projectileRadius, side)
  }
  _fireLightningBlastForTesting(result: HitResult): void {
    this._applyHit(result, 'lightning_blast', null, 0, 0, 'left')
    this._lightningDischargeUntilMs = this.elapsedMs + LIGHTNING_DURATIONS[result]
    this._lightningDischargeResult = result; this._lightningDischargeTarget = { x: GAME_WIDTH / 2, y: 0 }
  }
  _applyUpgradeForTesting(nodeId: UpgradeNodeId): void {
    if (this._globalUpgrades.unlockedNodeIds.includes(nodeId)) return
    this._globalUpgrades = applyUpgradeNode(this._globalUpgrades, nodeId)
  }
  _setPlayerLevelForTesting(level: number): void { this.playerLevel = level }
  _initBehaviorGraphForTesting(graph: BehaviorGraph | undefined): void { this._initBehaviorRunner(graph); this._deliverySystem.reset() }
  _applyPlayerHitForTesting(damage: number): void { this._applyPlayerHit(damage) }

  // private helpers
  private _initFightStats(): FightStats {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const leftSkill = this._layout.find((s) => s.side === 'left')!.skillType
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rightSkill = this._layout.find((s) => s.side === 'right')!.skillType
    return { left: initSkillFightStats(leftSkill), right: initSkillFightStats(rightSkill), durationMs: 0 }
  }

  private _applyLoadLevel(enemyDef: EnemyDef): void {
    const lvl = loadLevel(enemyDef, this._enemyOriginX, this._enemyOriginY, this._maskDetector)
    this.enemyHp = lvl.enemyHp; this.enemyMaxHp = lvl.enemyMaxHp; this.enemyName = lvl.enemyName
    this._enemySpriteKey = lvl.enemySpriteKey; this._enemyManifestId = lvl.enemyManifestId
    this._enemyHitZoneMap = lvl.enemyHitZoneMap; this._enemyBehavior = lvl.enemyBehavior; this.enemy = lvl.enemy
    this.player.reset(); this.lastPlayerHit = null; this._initBehaviorRunner(enemyDef.behaviorGraph)
    this._deliverySystem.reset(); this._enemyStunnedUntilMs = 0; this._enemyStatusEffects = []; this._wasFrozenLastTick = false
    this._lightningDischargeUntilMs = 0; this._lightningDischargeResult = null; this._lightningDischargeTarget = null
    this._combat.resetForLevel()
  }

  private _initBehaviorRunner(graph: BehaviorGraph | undefined): void {
    this._behaviorRunner = graph ? new EnemyBehaviorRunner(graph, this._rng) : undefined; this._lastAnimNodeId = null
  }

  private _syncEnemyAnimation(runner: EnemyBehaviorRunner): void {
    const nodeId = runner.currentNode.id
    if (nodeId === this._lastAnimNodeId) return
    this._lastAnimNodeId = nodeId
    const holdFrame = runner.currentHoldFrame
    if (holdFrame) { this.enemy.holdFrame(holdFrame.animKey, holdFrame.frameIndex) } else { this.enemy.playAnimation(runner.currentAnimKey) }
  }

  private _buildLayout(config: readonly SkillSlotConfig[], W: number, H: number, pxCm: number): ActiveTouchPointPos[] {
    const leftSlots = config.filter(s => s.side === 'left').map(s => ({ skillType: s.skillType, side: s.side as 'left', slotIndex: s.slotIndex }))
    const rightSlots = config.filter(s => s.side === 'right').map(s => ({ skillType: s.skillType, side: s.side as 'right', slotIndex: s.slotIndex }))
    return generateTouchPointLayout(leftSlots, rightSlots, W, H, pxCm)
  }

  private _layoutToEntries(layout: ActiveTouchPointPos[]): TouchPointEntry[] {
    return layout.map(slot => ({ id: slot.id, x: slot.x, y: slot.y, side: slot.side }))
  }

  private _enemyStateSlice(): EnemyStateSlice {
    return { hp: this.enemyHp, maxHp: this.enemyMaxHp, activeStatusEffects: this._enemyStatusEffects }
  }

  private _applyHit(result: HitResult, skillType: SkillType, position: { x: number; y: number } | null, chainBonus = 0, projectileRadius = 0, side: 'left' | 'right' = 'left'): void {
    const { damage, enemyDied, stunnedUntilMs } = this._combat.processHit(
      result, skillType, position, chainBonus, projectileRadius, side,
      { elapsedMs: this.elapsedMs, enemyHp: this.enemyHp, enemy: this.enemy, globalUpgrades: this._globalUpgrades, enemyStateSlice: this._enemyStateSlice(), rng: this._rng },
    )
    this.enemyHp = Math.max(0, this.enemyHp - damage)
    if (stunnedUntilMs > 0) this._enemyStunnedUntilMs = stunnedUntilMs
    this._phaseManager.evaluate({ hp: this.player.hp }, { hp: this.enemyHp })
    if (enemyDied && this._phaseManager.currentPhase === 'fight_overview') {
      this._combat.snapshotFightStats(); this._onEnemyKilled()
      if (this.currentLevel >= ENEMY_POOL.length) this.pendingLevelUp = false
    }
  }

  private _onEnemyKilled(): void {
    this.playerXp += 1
    if (this.playerLevel >= PLAYER_MAX_LEVEL) return
    const nextLevel = this.playerLevel + 1; const threshold = XP_LEVEL_THRESHOLDS[nextLevel]
    if (threshold !== undefined && this.playerXp >= threshold) { this.playerLevel = nextLevel; this.pendingLevelUp = true }
  }

  private _applyPlayerHit(damage: number): void {
    this.player.takeDamage(damage); this.lastPlayerHit = { timestamp: this.elapsedMs, damage }
    this._phaseManager.evaluate({ hp: this.player.hp }, { hp: this.enemyHp })
  }

  private _tickBehaviorRunner(cappedDt: number): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const runner = this._behaviorRunner!
    const isFrozen = this._statusEffectSystem.isActive(this._enemyStateSlice(), 'frozen')
    const isStunned = isFrozen || this.elapsedMs < this._enemyStunnedUntilMs
    if (isFrozen && !this._wasFrozenLastTick) this.enemy.holdFrame(this.enemy.currentAnimKey, this.enemy.currentFrameIndex)
    if (!isFrozen && this._wasFrozenLastTick) this._lastAnimNodeId = null
    this._wasFrozenLastTick = isFrozen
    const { attacks } = runner.tick(cappedDt, { frameIndex: this.enemy.currentFrameIndex, animationComplete: !this.enemy.isAnimPlaying, enemyHpPct: this.enemyHp / this.enemyMaxHp, isStunned })
    for (const spec of attacks) this._deliverySystem.spawn(spec, { x: this.enemy.x, y: this.enemy.y }, PLAYER_CENTRE)
    this._syncEnemyAnimation(runner)
  }
}

/** Module-level singleton — shared between BattleScene and the test bridge. */
export const gameMachine = new GameStateMachine()
