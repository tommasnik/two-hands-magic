// GameStateMachine — pure TypeScript, no Phaser dependency.
// Orchestrates all game systems and tracks state transitions.

import type { GameStateResult, InputEvent, HitResult, SkillType, UpgradeNodeId, FightStats, EnemyBehaviorDef, EnemyDef, BehaviorGraph } from '../types'
import { InputManager } from './systems/InputManager'; import type { TouchPointEntry } from './systems/InputManager'
import { computeEnemyPosition } from './systems/BehaviorSystem'
import type { EnemyBehaviorRunner } from './systems/EnemyBehaviorRunner'
import type { MaskHitDetector } from './systems/MaskHitDetector'
import { Enemy } from './entities/Enemy'; import { Player } from './entities/Player'
import { generateTouchPointLayout } from './entities/touchPoints'; import type { ActiveTouchPointPos } from './entities/touchPoints'
import { MAX_DELTA_MS, GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM, ENEMY_DEFAULT_Y, DEFAULT_SKILL_CONFIG, PLAYER_MAX_HP, ENEMY_POOL } from './constants'
import type { SkillSlotConfig } from './constants'; import type { EnemyStateSlice } from './skills/types'
import { PhaseManager } from './systems/PhaseManager'
import { initSkillFightStats } from './systems/CombatSystem'
import { buildGameStateResult } from './systems/StateBuilder'; import { loadLevel } from './systems/LevelLoader'; import { processCommands } from './systems/CommandProcessor'
import { resolveBehavior, PLAYER_CENTRE, LIGHTNING_DURATIONS } from './resolvers'
export { resolveBehavior }; import { resolveSpriteKey, resolveHitZoneMap } from './resolvers'
export { resolveSpriteKey, resolveHitZoneMap }; import './skills/index'
import { FightState } from './systems/FightState'
import { GlobalState } from './systems/GlobalState'

export class GameStateMachine {
  private _phaseManager = new PhaseManager('loading')
  private elapsedMs = 0
  private _enemyOriginX = GAME_WIDTH / 2
  private _enemyOriginY = ENEMY_DEFAULT_Y
  private _enemyBehavior: EnemyBehaviorDef = resolveBehavior(ENEMY_POOL[0])
  private enemy = new Enemy(GAME_WIDTH / 2, ENEMY_DEFAULT_Y)
  private _enemyPoolIndex = 0
  private _global = new GlobalState('loading', 1)
  private _rng: () => number
  private _fight: FightState
  private player = new Player(PLAYER_MAX_HP)
  private inputManager: InputManager
  private _lastAnimNodeId: string | null = null
  private _pendingInputs: InputEvent[] = []
  private _maskDetector?: MaskHitDetector
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
    this._fight = new FightState(ENEMY_POOL[0], {
      upgrades: this._global.progression.upgrades,
      playerMaxHp: PLAYER_MAX_HP,
    }, this._rng)
    this._fight.combat.fightStats = this._initFightStats()
  }

  startBattle(): void {
    if (this._phaseManager.currentPhase === 'loading') {
      this._enemyPoolIndex = 0; this._applyLoadLevel(ENEMY_POOL[0])
      this._phaseManager.forceTransition('battle')
    }
  }

  nextLevel(): void {
    if (this._phaseManager.currentPhase !== 'fight_overview') return
    if (this._global.progression.pendingLevelUp || this._global.currentLevel >= ENEMY_POOL.length) return
    this._global.currentLevel++
    this._enemyPoolIndex = (this._enemyPoolIndex + 1) % ENEMY_POOL.length
    this._applyLoadLevel(ENEMY_POOL[this._enemyPoolIndex])
    this._lastTouchUpMs = {}
    this._phaseManager.forceTransition('battle')
  }

  restartLevel(): void {
    if (this._phaseManager.currentPhase !== 'game_over') return
    this._global.progression.pendingLevelUp = false
    this._applyLoadLevel(ENEMY_POOL[this._enemyPoolIndex])
    this._phaseManager.forceTransition('battle')
  }

  restartGame(): void {
    if (this._phaseManager.currentPhase !== 'fight_overview') return
    this._global.currentLevel = 1; this._enemyPoolIndex = 0
    this.elapsedMs = 0
    this._global.progression.reset()
    this._applyLoadLevel(ENEMY_POOL[0])
    this._lastTouchUpMs = {}; this._phaseManager.forceTransition('battle')
  }

  completeFightOverview(): void {
    if (this._phaseManager.currentPhase !== 'fight_overview') return
    if (this._global.currentLevel >= ENEMY_POOL.length) { this.restartGame() } else { this.nextLevel() }
  }

  confirmLevelUpUpgrade(nodeId?: UpgradeNodeId): void {
    this._global.progression.confirmUpgrade(nodeId)
    // Sync the fight snapshot so getState().globalUpgrades reflects the new upgrade.
    // (The next fight will re-snapshot from progression anyway via _resetFight.)
    this._fight.upgrades = { ...this._global.progression.upgrades, unlockedNodeIds: [...this._global.progression.upgrades.unlockedNodeIds] }
  }

  setMaskDetector(detector: MaskHitDetector): void { this._maskDetector = detector }

  update(dt: number, inputs: InputEvent[]): GameStateResult {
    if (this._phaseManager.currentPhase !== 'battle') return this.getState()
    const cappedDt = Math.min(dt, MAX_DELTA_MS)
    this.elapsedMs += cappedDt; this._fight.combat.fightStats.durationMs += cappedDt
    const allInputs = [...this._pendingInputs, ...inputs]; this._pendingInputs = []
    const lightning = processCommands(this.inputManager.update(allInputs), {
      layout: this._layout, slotStates: this._slotStates, lastTouchUpMs: this._lastTouchUpMs,
      elapsedMs: this.elapsedMs, globalUpgrades: this._fight.upgrades,
      combat: this._fight.combat, projectileSystem: this._fight.projectiles, enemy: this.enemy,
      applyHit: (r, sk, pos, cb, pr, side) => this._applyHit(r, sk, pos, cb, pr, side),
    })
    if (lightning) {
      this._fight.lightningDischargeUntilMs = lightning.lightningDischargeUntilMs
      this._fight.lightningDischargeResult = lightning.lightningDischargeResult
      this._fight.lightningDischargeTarget = lightning.lightningDischargeTarget
    }
    const newPos = computeEnemyPosition(this._enemyOriginX, this._enemyOriginY, this.elapsedMs, this._enemyBehavior)
    this.enemy.x = newPos.x; this.enemy.y = newPos.y
    for (const evt of this._fight.projectiles.update(cappedDt, this.enemy, this._fight.upgrades.critZoneTolerance)) {
      this._applyHit(evt.result, evt.skillType, evt.position, evt.chainBonus, evt.projectileRadius, evt.side)
    }
    this.enemy.updateAnimation(cappedDt); this._fight.statusEffects.tick(cappedDt, this._enemyStateSlice())
    if (this._phaseManager.currentPhase === 'battle' && this._fight.runner) this._tickBehaviorRunner(cappedDt)
    if (this._phaseManager.currentPhase === 'battle') {
      for (const hit of this._fight.delivery.update(cappedDt)) {
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

  getState(): GameStateResult {
    return buildGameStateResult({
      phaseManager: this._phaseManager, combat: this._fight.combat, enemy: this.enemy, player: this.player,
      projectileSystem: this._fight.projectiles, deliverySystem: this._fight.delivery,
      layout: this._layout, slotStates: this._slotStates, elapsedMs: this.elapsedMs,
      enemyHp: this._fight.enemyHp, enemyMaxHp: this._fight.enemyMaxHp, enemyName: this._fight.enemyName,
      enemySpriteKey: this._fight.enemySpriteKey, enemyManifestId: this._fight.enemyManifestId,
      enemyHitZoneMap: this._fight.enemyHitZoneMap, enemyStunnedUntilMs: this._fight.enemyStunnedUntilMs,
      lightningDischargeUntilMs: this._fight.lightningDischargeUntilMs,
      lightningDischargeResult: this._fight.lightningDischargeResult,
      lightningDischargeTarget: this._fight.lightningDischargeTarget,
      currentLevel: this._global.currentLevel, lastPlayerHit: this._fight.lastPlayerHit,
      playerXp: this._global.progression.playerXp, playerLevel: this._global.progression.playerLevel,
      pendingLevelUp: this._global.progression.pendingLevelUp, globalUpgrades: this._fight.upgrades,
      enemyStatusEffects: this._fight.enemyStatusEffects,
    })
  }

  // @internal test-only
  _applyHitForTesting(result: HitResult, skillType: SkillType, chainBonus = 0, projectileRadius = 0, side: 'left' | 'right' = 'left'): void {
    this._applyHit(result, skillType, null, chainBonus, projectileRadius, side)
  }
  _fireLightningBlastForTesting(result: HitResult): void {
    this._applyHit(result, 'lightning_blast', null, 0, 0, 'left')
    this._fight.lightningDischargeUntilMs = this.elapsedMs + LIGHTNING_DURATIONS[result]
    this._fight.lightningDischargeResult = result; this._fight.lightningDischargeTarget = { x: GAME_WIDTH / 2, y: 0 }
  }
  _applyUpgradeForTesting(nodeId: UpgradeNodeId): void {
    this._global.progression.applyUpgradeForTesting(nodeId)
    // Also sync the fight snapshot so tests that apply upgrades mid-fight see the effect.
    this._fight.upgrades = { ...this._global.progression.upgrades, unlockedNodeIds: [...this._global.progression.upgrades.unlockedNodeIds] }
  }
  _setPlayerLevelForTesting(level: number): void { this._global.progression.setLevelForTesting(level) }
  _initBehaviorGraphForTesting(graph: BehaviorGraph | undefined): void { this._fight.resetRunner(graph, this._rng); this._fight.delivery.reset(); this._lastAnimNodeId = null }
  _applyPlayerHitForTesting(damage: number): void { this._applyPlayerHit(damage) }

  // private helpers
  private _initFightStats(): FightStats {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const leftSkill = this._layout.find((s) => s.side === 'left')!.skillType
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rightSkill = this._layout.find((s) => s.side === 'right')!.skillType
    return { left: initSkillFightStats(leftSkill), right: initSkillFightStats(rightSkill), durationMs: 0 }
  }

  /**
   * Initialise a new FightState from the current progression snapshot + enemy def.
   * Called at the start of every encounter (level load, restart).
   */
  private _resetFight(def: EnemyDef): void {
    this._fight = new FightState(def, this._global.progression.snapshotForFight(), this._rng)
  }

  private _applyLoadLevel(enemyDef: EnemyDef): void {
    const lvl = loadLevel(enemyDef, this._enemyOriginX, this._enemyOriginY, this._maskDetector)
    this._enemyBehavior = lvl.enemyBehavior; this.enemy = lvl.enemy
    this._resetFight(enemyDef)
    this.player.reset()
    this._lastAnimNodeId = null
    this._fight.combat.fightStats = this._initFightStats()
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
    return { hp: this._fight.enemyHp, maxHp: this._fight.enemyMaxHp, activeStatusEffects: this._fight.enemyStatusEffects }
  }

  private _applyHit(result: HitResult, skillType: SkillType, position: { x: number; y: number } | null, chainBonus = 0, projectileRadius = 0, side: 'left' | 'right' = 'left'): void {
    const { damage, enemyDied, stunnedUntilMs } = this._fight.combat.processHit(
      result, skillType, position, chainBonus, projectileRadius, side,
      { elapsedMs: this.elapsedMs, enemyHp: this._fight.enemyHp, enemy: this.enemy, globalUpgrades: this._fight.upgrades, enemyStateSlice: this._enemyStateSlice(), rng: this._rng },
    )
    this._fight.enemyHp = Math.max(0, this._fight.enemyHp - damage)
    if (stunnedUntilMs > 0) this._fight.enemyStunnedUntilMs = stunnedUntilMs
    this._phaseManager.evaluate({ hp: this.player.hp }, { hp: this._fight.enemyHp })
    if (enemyDied && this._phaseManager.currentPhase === 'fight_overview') {
      this._fight.combat.snapshotFightStats(); this._global.progression.applyKill()
      if (this._global.currentLevel >= ENEMY_POOL.length) this._global.progression.pendingLevelUp = false
    }
  }

  private _applyPlayerHit(damage: number): void {
    this.player.takeDamage(damage); this._fight.lastPlayerHit = { timestamp: this.elapsedMs, damage }
    this._phaseManager.evaluate({ hp: this.player.hp }, { hp: this._fight.enemyHp })
  }

  private _tickBehaviorRunner(cappedDt: number): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const runner = this._fight.runner!
    const isFrozen = this._fight.statusEffects.isActive(this._enemyStateSlice(), 'frozen')
    const isStunned = isFrozen || this.elapsedMs < this._fight.enemyStunnedUntilMs
    if (isFrozen && !this._fight.wasFrozenLastTick) this.enemy.holdFrame(this.enemy.currentAnimKey, this.enemy.currentFrameIndex)
    if (!isFrozen && this._fight.wasFrozenLastTick) this._lastAnimNodeId = null
    this._fight.wasFrozenLastTick = isFrozen
    const { attacks } = runner.tick(cappedDt, { frameIndex: this.enemy.currentFrameIndex, animationComplete: !this.enemy.isAnimPlaying, enemyHpPct: this._fight.enemyHp / this._fight.enemyMaxHp, isStunned })
    for (const spec of attacks) this._fight.delivery.spawn(spec, { x: this.enemy.x, y: this.enemy.y }, PLAYER_CENTRE)
    this._syncEnemyAnimation(runner)
  }
}

/** Module-level singleton — shared between BattleScene and the test bridge. */
export const gameMachine = new GameStateMachine()
