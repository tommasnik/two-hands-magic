import Phaser from 'phaser'
import { gameMachine } from '../game/GameStateMachine'
import { generateTouchPointLayout } from '../game/entities/touchPoints'
import type { ActiveTouchPointPos } from '../game/entities/touchPoints'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MAX_DELTA_MS,
  PIXELS_PER_CM,
  DEFAULT_SKILL_CONFIG,
} from '../game/constants'
import { DeliveryRenderer } from './rendering/DeliveryRenderer'
import { createDefaultDeliveryRegistry } from './rendering/DeliveryVisualRegistry'
import { BackgroundRenderer } from './rendering/BackgroundRenderer'
import { EnemyRenderer } from './rendering/EnemyRenderer'
import { HUDRenderer } from './rendering/HUDRenderer'
import { PhaseOverlayManager } from './rendering/PhaseOverlayManager'
import { SkillRenderer } from './rendering/SkillRenderer'
import { initMaskDetector } from './rendering/MaskDetectorLoader'
import type { InputEvent } from '../types'

export class BattleScene extends Phaser.Scene {
  private pendingInputs: InputEvent[] = []
  private ctx!: CanvasRenderingContext2D
  private _dynamicLayout!: ActiveTouchPointPos[]

  // Renderers
  private _backgroundRenderer = new BackgroundRenderer()
  private _enemyRenderer = new EnemyRenderer()
  private _hudRenderer = new HUDRenderer()
  private _skillRenderer = new SkillRenderer()
  private _deliveryRenderer = new DeliveryRenderer(createDefaultDeliveryRegistry())
  private _phaseOverlay!: PhaseOverlayManager

  /** Time since the previous game-loop frame, forwarded to the delivery renderer. Unit: ms. */
  private _lastFrameDtMs = 0

  constructor() {
    super({ key: 'BattleScene' })
  }

  create(): void {
    // Measure pixels-per-cm from DOM if possible (like laser-shot does)
    let pxCm = PIXELS_PER_CM
    const cmRef = document.getElementById('cmRef')
    if (cmRef) {
      const measured = cmRef.getBoundingClientRect().width
      if (measured > 0) pxCm = measured
    }

    // Generate dynamic touch-point layout from default skill config
    const leftSlots = DEFAULT_SKILL_CONFIG
      .filter(s => s.side === 'left')
      .map(s => ({ skillType: s.skillType, side: s.side as 'left', slotIndex: s.slotIndex }))
    const rightSlots = DEFAULT_SKILL_CONFIG
      .filter(s => s.side === 'right')
      .map(s => ({ skillType: s.skillType, side: s.side as 'right', slotIndex: s.slotIndex }))
    this._dynamicLayout = generateTouchPointLayout(leftSlots, rightSlots, GAME_WIDTH, GAME_HEIGHT, pxCm)

    // Sync GameStateMachine layout with the visually rendered circles
    gameMachine.setTouchPointPositions(this._dynamicLayout)

    // Get canvas 2D context from Phaser's Canvas renderer
    const renderer = this.game.renderer as Phaser.Renderer.Canvas.CanvasRenderer
    this.ctx = renderer.gameContext

    // Initialize sub-systems
    this._hudRenderer.init()
    this._phaseOverlay = new PhaseOverlayManager(this._deliveryRenderer)
    this._phaseOverlay.onNextLevel = () => gameMachine.nextLevel()
    this._phaseOverlay.onRestartLevel = () => gameMachine.restartLevel()
    this._phaseOverlay.onConfirmUpgrade = (id) => gameMachine.confirmLevelUpUpgrade(id)
    this._phaseOverlay.onFightOverviewContinue = () => gameMachine.completeFightOverview()
    this._phaseOverlay.init()
    initMaskDetector(this.textures)

    // Wire start button
    document.getElementById('start-btn')?.addEventListener('click', () => {
      document.getElementById('start-overlay')?.classList.add('hidden')
      gameMachine.startBattle()
      const el = document.documentElement
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => { /* fullscreen denied — continue without it */ })
      }
    })

    // Input bridge — Phaser pointer events → InputEvent[]
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.pendingInputs.push({ pointerId: ptr.id, action: 'down', x: ptr.x, y: ptr.y, timestamp: Date.now() })
    })
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr.isDown) {
        this.pendingInputs.push({ pointerId: ptr.id, action: 'move', x: ptr.x, y: ptr.y, timestamp: Date.now() })
      }
    })
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      this.pendingInputs.push({ pointerId: ptr.id, action: 'up', x: ptr.x, y: ptr.y, timestamp: Date.now() })
    })

    // Install test bridge after mask detector is ready
    if (import.meta.env.DEV) {
      import('../tests/helpers/testBridge').then(({ installTestBridge }) => {
        installTestBridge(this.game)
      })
    }

    // Hook into Phaser's render phase
    this.events.on(Phaser.Scenes.Events.RENDER, this.onRender, this)

    // Release delivery-visual resources on shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this._deliveryRenderer.destroy({ scene: this, ctx: this.ctx, nowMs: 0, dtMs: 0 })
    })
  }

  update(_time: number, delta: number): void {
    const cappedDelta = Math.min(delta, MAX_DELTA_MS)
    this._lastFrameDtMs = cappedDelta

    // Collect inputs → update game state
    const inputs = this.pendingInputs.splice(0)
    const { fight, game } = gameMachine.update(cappedDelta, inputs)

    // Advance renderers that need per-frame state (animations, timers)
    const dtS = cappedDelta / 1000
    this._enemyRenderer.update(dtS, { ...fight, ...game })
    this._skillRenderer.update(dtS, fight.activeProjectiles)
    this._hudRenderer.update(cappedDelta, { ...fight, ...game })
    this._phaseOverlay.update(
      game,
      fight.fightStatsSnapshot,
      cappedDelta,
      fight.enemyName,
      fight.globalUpgrades,
    )
  }

  // -----------------------------------------------------------------------
  // Render phase — called by Phaser after its own drawing
  // -----------------------------------------------------------------------

  private onRender(): void {
    const { fight, game } = gameMachine.getState()
    const state = { ...fight, ...game }
    const ctx = this.ctx
    const now = performance.now()

    ctx.save()

    this._backgroundRenderer.render(ctx)
    this._enemyRenderer.render(ctx, this.textures, state, now)

    // Fire particles (drawn before projectiles so balls render on top)
    this._skillRenderer.drawFireParticles(ctx)

    // Projectiles
    for (const proj of fight.activeProjectiles) {
      if (!proj.alive) continue
      const px = proj.origin.x + (proj.target.x - proj.origin.x) * proj.progress
      const py = proj.origin.y + (proj.target.y - proj.origin.y) * proj.progress
      this._skillRenderer.drawProjectile(ctx, px, py, proj, this._dynamicLayout)
    }

    // Skill overlays (frozen, lightning discharge)
    this._skillRenderer.drawFrozenOverlay(ctx, state)
    this._skillRenderer.drawLightningDischarge(ctx, state)

    // Incoming enemy attack deliveries
    this._deliveryRenderer.render(fight.activeDeliveries, {
      scene: this,
      ctx,
      nowMs: now,
      dtMs: this._lastFrameDtMs,
    })

    this._hudRenderer.render(ctx, state, this._dynamicLayout, now)

    ctx.restore()
  }
}
