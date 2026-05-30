import Phaser from 'phaser'
import { gameMachine } from '../game/GameStateMachine'
import { generateTouchPointLayout } from '../game/entities/touchPoints'
import type { ActiveTouchPointPos } from '../game/entities/touchPoints'
import { MaskHitDetector } from '../game/systems/MaskHitDetector'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MAX_DELTA_MS,
  PIXELS_PER_CM,
  TOUCHPOINT_RADIUS,
  ENEMY_HEAD_RADIUS_PX,
  ENEMY_TORSO_HEIGHT_PX,
  FLOAT_TEXT_FONT_CRIT,
  FLOAT_TEXT_FONT_HIT,
  FLOAT_TEXT_FONT_GRAZE,
  getHitResultColor,
  LEVEL_COMPLETE_DELAY_MS,
  GAME_OVER_RESTART_DELAY_MS,
  DEFAULT_SKILL_CONFIG,
  PLAYER_HIT_FLASH_DURATION_MS,
  PLAYER_HIT_FLOAT_COLOR,
  LASER_ORIGIN_Y,
  PROJECTILE_BASE_RADIUS_PX,
  UPGRADE_NODES,
  UPGRADE_PATH_TITLES,
  UPGRADE_TREE_COLUMNS,
  ENEMY_POOL,
  HIT_ZONE_OVERLAY_ENABLED,
  HIT_ZONE_OVERLAY_OPACITY,
} from '../game/constants'
import { characterRegistry } from '../game/CharacterRegistry'
import { DeliveryRenderer } from './rendering/DeliveryRenderer'
import { createDefaultDeliveryRegistry } from './rendering/DeliveryVisualRegistry'
import { computeReticle } from '../game/systems/AimSystem'
import { getUpgradeNodeStatus, getXpProgress } from '../game/upgrades'
import type { GameState, HitResult, HitZoneName, ActiveSlotState, UpgradeNodeId, GlobalUpgradeState, SkillFightStats } from '../types'

interface Spark {
  x: number; y: number
  vx: number; vy: number
  life: number; age: number
  color: string
}

interface FireParticle {
  x: number; y: number
  vx: number; vy: number
  life: number; age: number
  /** Size in px at birth. */
  size: number
}

interface FloatText {
  x: number; y: number
  text: string; color: string
  fontSize: number
  age: number; life: number
}

export class BattleScene extends Phaser.Scene {
  private pendingInputs: import('../types').InputEvent[] = []
  private ctx!: CanvasRenderingContext2D
  /** Dynamic touch point layout — mirrors GameStateMachine's internal layout. */
  private _dynamicLayout!: ActiveTouchPointPos[]

  // Visual-only state (not part of game logic)
  private sparks: Spark[] = []
  private fireParticles: FireParticle[] = []
  private floatTexts: FloatText[] = []
  private lastHitTimestamp: number | null = null

  // DOM HUD elements
  private hudLevel!: HTMLElement
  private hudEnemyName!: HTMLElement
  private hudHpFill!: HTMLElement
  private playerHpFill: HTMLElement | null = null
  private playerHitFlash: HTMLElement | null = null
  private xpLabel: HTMLElement | null = null
  private xpFill: HTMLElement | null = null

  // DOM phase overlays
  private levelCompleteOverlay!: HTMLElement
  private levelCompleteText!: HTMLElement
  private victoryOverlay: HTMLElement | null = null
  private gameOverOverlay: HTMLElement | null = null

  // New fight overview / victory toast overlays (task-47)
  private _victoryToast: HTMLElement | null = null
  private _fightOverviewOverlay: HTMLElement | null = null

  // Upgrade picker overlay
  private upgradeOverlay: HTMLElement | null = null
  private upgradeLevelLabel: HTMLElement | null = null
  private upgradeTree: HTMLElement | null = null
  private upgradeCrossContainer: HTMLElement | null = null
  /** Map node id → button element so each frame can update status classes in place. */
  private upgradeNodeEls: Map<UpgradeNodeId, HTMLButtonElement> = new Map()
  /** True while the picker is on-screen so we render the tree once per pendingLevelUp. */
  private _upgradePickerVisible = false
  /** True after the user clicked through fight overview when a level-up was pending. */
  private _showUpgradeAfterFightOverview = false

  // Phase transition timers
  private _phaseTimerMs: number | null = null
  private _lastPhase: string | null = null

  // Player-hit visual tracking
  private _lastPlayerHitTimestamp: number | null = null
  private _hitFlashRemainingMs = 0

  // Last game state (set in update, read in onRender)
  private _lastState?: GameState
  /** Time since the previous game-loop frame, forwarded to the delivery renderer. Unit: ms. */
  private _lastFrameDtMs = 0
  /** Render layer for enemy attack deliveries (orbs + overlays). Delegated to per frame. */
  private _deliveryRenderer = new DeliveryRenderer(createDefaultDeliveryRegistry())

  constructor() {
    super({ key: 'BattleScene' })
  }

  create(): void {
    // Build initial dynamic layout using the default skill config
    let pxCm = PIXELS_PER_CM

    // Measure PX_CM from DOM if possible (like laser-shot does)
    const cmRef = document.getElementById('cmRef')
    if (cmRef) {
      const measured = cmRef.getBoundingClientRect().width
      if (measured > 0) pxCm = measured
    }

    // Generate dynamic layout from default skill config
    const leftSlots = DEFAULT_SKILL_CONFIG
      .filter(s => s.side === 'left')
      .map(s => ({ skillType: s.skillType, side: s.side as 'left', slotIndex: s.slotIndex }))
    const rightSlots = DEFAULT_SKILL_CONFIG
      .filter(s => s.side === 'right')
      .map(s => ({ skillType: s.skillType, side: s.side as 'right', slotIndex: s.slotIndex }))
    this._dynamicLayout = generateTouchPointLayout(leftSlots, rightSlots, GAME_WIDTH, GAME_HEIGHT, pxCm)

    // Sync GameStateMachine layout with the visually rendered circles.
    gameMachine.setTouchPointPositions(this._dynamicLayout)

    // Get canvas 2D context from Phaser's Canvas renderer
    const renderer = this.game.renderer as Phaser.Renderer.Canvas.CanvasRenderer
    this.ctx = renderer.gameContext

    // Wire HUD DOM elements
    this.hudLevel      = document.getElementById('hud-level')!
    this.hudEnemyName  = document.getElementById('hud-enemy-name')!
    this.hudHpFill     = document.getElementById('hud-hp-fill')!
    this.playerHpFill  = document.getElementById('player-hp-fill')
    this.playerHitFlash = document.getElementById('player-hit-flash')
    this.xpLabel        = document.getElementById('xp-label')
    this.xpFill         = document.getElementById('xp-fill')

    // Wire phase overlay DOM elements
    this.levelCompleteOverlay = document.getElementById('level-complete-overlay')!
    this.levelCompleteText    = document.getElementById('level-complete-text')!
    this.victoryOverlay       = document.getElementById('victory-overlay')
    this.gameOverOverlay      = document.getElementById('game-over-overlay')

    // Wire upgrade picker overlay
    this.upgradeOverlay        = document.getElementById('upgrade-overlay')
    this.upgradeLevelLabel     = document.getElementById('upgrade-level-label')
    this.upgradeTree           = document.getElementById('upgrade-tree')
    this.upgradeCrossContainer = document.getElementById('upgrade-cross-nodes')
    this._buildUpgradeTreeDom()

    // Wire fight overview overlay and victory toast (task-47)
    this._victoryToast        = document.getElementById('victory-toast')
    this._fightOverviewOverlay = document.getElementById('fight-overview-overlay')
    document.getElementById('fight-overview-btn')?.addEventListener('click', () => {
      const state = gameMachine.getState()
      if (state.pendingLevelUp) {
        // Show upgrade picker — fight overview slides away, upgrade overlay takes over
        this._showUpgradeAfterFightOverview = true
        if (this._fightOverviewOverlay) this._fightOverviewOverlay.classList.add('hidden')
        this._upgradePickerVisible = false  // force re-render next frame
      } else {
        this._deliveryRenderer.cancelFlying()
        gameMachine.completeFightOverview()
      }
    })

    // Wire START button
    document.getElementById('start-btn')?.addEventListener('click', () => {
      document.getElementById('start-overlay')?.classList.add('hidden')
      gameMachine.startBattle()
      // Request fullscreen — fallback: if browser denies it, game runs normally
      const el = document.documentElement
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          // Fullscreen denied (e.g. headless browser, iOS) — continue without it
        })
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

    // Initialize MaskHitDetector for pixel-perfect hit detection
    this._initMaskDetector()

    // Hook into Phaser's render phase — draw everything ourselves
    this.events.on(Phaser.Scenes.Events.RENDER, this.onRender, this)

    // Release delivery-visual resources (e.g. spritesheet GameObjects) on shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this._deliveryRenderer.destroy({ scene: this, ctx: this.ctx, nowMs: 0, dtMs: 0 })
    })
  }

  update(_time: number, delta: number): void {
    const cappedDelta = Math.min(delta, MAX_DELTA_MS)
    this._lastFrameDtMs = cappedDelta
    const inputs = this.pendingInputs.splice(0)
    const state = gameMachine.update(cappedDelta, inputs)

    // Detect new hit events → spawn visual effects
    if (state.lastHit && state.lastHit.timestamp !== this.lastHitTimestamp) {
      this.lastHitTimestamp = state.lastHit.timestamp
      this._spawnHitEffects(state.lastHit.result, state.lastHit.hitZone, state)
    }

    // Advance sparks
    const dtS = cappedDelta / 1000
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]
      s.age += dtS
      s.x += s.vx * dtS
      s.y += s.vy * dtS
      s.vx *= 0.94
      s.vy *= 0.94
      if (s.age > s.life) this.sparks.splice(i, 1)
    }

    // Advance fire particles (fireball trail)
    for (let i = this.fireParticles.length - 1; i >= 0; i--) {
      const fp = this.fireParticles[i]
      fp.age += dtS
      fp.x += fp.vx * dtS
      fp.y += fp.vy * dtS
      fp.vy -= 30 * dtS // slight upward drift (heat rising)
      if (fp.age > fp.life) this.fireParticles.splice(i, 1)
    }

    // Emit fire particles behind each fireball projectile
    for (const proj of state.activeProjectiles) {
      if (!proj.alive || proj.skillType !== 'fireball') continue
      const px = proj.origin.x + (proj.target.x - proj.origin.x) * proj.progress
      const py = proj.origin.y + (proj.target.y - proj.origin.y) * proj.progress
      // Emit 2 particles per frame (60fps budget)
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * Math.PI * 2
        const spd = 20 + Math.random() * 40
        this.fireParticles.push({
          x: px + (Math.random() - 0.5) * 4,
          y: py + (Math.random() - 0.5) * 4,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.15 + Math.random() * 0.15,
          age: 0,
          size: 3 + Math.random() * 3,
        })
      }
    }

    // Advance float texts
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const f = this.floatTexts[i]
      f.age += dtS
      f.y -= 40 * dtS
      if (f.age > f.life) this.floatTexts.splice(i, 1)
    }

    // Update HUD DOM — level number + HP bar + enemy name (read from game state, no logic in scene)
    if (this.hudLevel) this.hudLevel.textContent = `LEVEL ${state.currentLevel}`
    if (this.hudEnemyName) this.hudEnemyName.textContent = state.enemyName
    if (this.hudHpFill) {
      const fillPct = state.enemyMaxHp > 0 ? (state.enemyHp / state.enemyMaxHp) * 100 : 0
      this.hudHpFill.style.width = `${fillPct}%`
    }
    if (this.playerHpFill) {
      const fillPct = state.player.maxHp > 0 ? (state.player.hp / state.player.maxHp) * 100 : 0
      this.playerHpFill.style.width = `${fillPct}%`
    }
    this._updateXpHud(state.playerLevel, state.playerXp)
    this._updateUpgradePicker(state)

    // Detect new player-hit events → trigger red flash + floating damage number
    if (state.lastPlayerHit && state.lastPlayerHit.timestamp !== this._lastPlayerHitTimestamp) {
      this._lastPlayerHitTimestamp = state.lastPlayerHit.timestamp
      this._spawnPlayerHitEffects(state.lastPlayerHit.damage)
    }

    // Advance / clear flash overlay
    if (this._hitFlashRemainingMs > 0) {
      this._hitFlashRemainingMs -= cappedDelta
      if (this._hitFlashRemainingMs <= 0) {
        this._hitFlashRemainingMs = 0
        if (this.playerHitFlash) this.playerHitFlash.classList.remove('active')
      }
    }

    // Handle phase transitions for level_complete, victory, and game_over
    this._handlePhaseTransitions(state.phase, state.currentLevel, cappedDelta)

    this._lastState = state
  }

  // -----------------------------------------------------------------------
  // MaskHitDetector initialization
  // -----------------------------------------------------------------------

  /**
   * Extracts pixel data from all character mask textures and registers
   * them with a MaskHitDetector instance, then passes it to GameStateMachine.
   * Pre-loads all mask data at scene start — no per-frame texture reads.
   * Iterates over all registered characters generically via CharacterRegistry.
   */
  private _initMaskDetector(): void {
    const detector = new MaskHitDetector()
    let loaded = 0

    const extractMask = (textureKey: string, spriteKey: string, animKey: string, frameIndex: number): void => {
      try {
        if (!this.textures.exists(textureKey)) return
        const frame = this.textures.getFrame(textureKey)
        if (!frame || !frame.source.image) return
        const img = frame.source.image as HTMLImageElement
        const w = frame.realWidth
        const h = frame.realHeight

        // Draw to an offscreen canvas to extract pixel data
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx2 = canvas.getContext('2d')
        if (!ctx2) return
        ctx2.drawImage(img, 0, 0)
        const imageData = ctx2.getImageData(0, 0, w, h)
        detector.loadMaskData(spriteKey, animKey, frameIndex, new Uint8Array(imageData.data.buffer), w, h)
        loaded++
      } catch {
        // Texture extraction failed (e.g. headless test environment) — skip silently
      }
    }

    // Extract masks for all registered characters that have mask data
    for (const manifest of characterRegistry.getAll()) {
      for (const [animKey, anim] of Object.entries(manifest.animations)) {
        if (!anim.hasMasks) continue
        for (let i = 0; i < anim.frameCount; i++) {
          extractMask(`${manifest.spriteKey}_mask_${animKey}_${i}`, manifest.spriteKey, animKey, i)
        }
      }
    }

    if (loaded > 0) {
      gameMachine.setMaskDetector(detector)
    }
  }

  // -----------------------------------------------------------------------
  // Phase transition handler
  // -----------------------------------------------------------------------

  /**
   * Manages phase overlays and timed transitions.
   * Called each frame from update(). No game logic — reads phase from state, drives DOM.
   *
   * fight_overview flow (task-47):
   *   1. Phase entry: hide old overlays, show victory toast, start 1s timer.
   *   2. After 1s: hide toast, show fight_overview overlay with correct button label.
   *   3. Button click fires completeFightOverview() which calls nextLevel() or restartGame().
   */
  private _handlePhaseTransitions(phase: string, currentLevel: number, dtMs: number): void {
    // Detect phase entry — reset timer whenever phase changes
    if (phase !== this._lastPhase) {
      this._lastPhase = phase
      this._phaseTimerMs = null

      if (phase === 'fight_overview') {
        // Hide all old overlays, show the victory toast only (fight overview comes after 1s)
        if (this.levelCompleteOverlay) this.levelCompleteOverlay.classList.add('hidden')
        if (this.victoryOverlay) this.victoryOverlay.classList.add('hidden')
        if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden')
        if (this._fightOverviewOverlay) this._fightOverviewOverlay.classList.add('hidden')
        if (this._victoryToast) this._victoryToast.classList.remove('hidden')
        this._showUpgradeAfterFightOverview = false
        this._phaseTimerMs = 0
      } else if (phase === 'level_complete') {
        // Legacy path — kept for compatibility but fight_overview supersedes this.
        // Show "Level X Complete!" overlay
        if (this.levelCompleteText) {
          this.levelCompleteText.textContent = `LEVEL ${currentLevel} COMPLETE!`
        }
        if (this.levelCompleteOverlay) this.levelCompleteOverlay.classList.remove('hidden')
        if (this.victoryOverlay) this.victoryOverlay.classList.add('hidden')
        if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden')
        this._phaseTimerMs = 0
      } else if (phase === 'victory') {
        // Legacy path — fight_overview supersedes this in the normal flow.
        if (this.levelCompleteOverlay) this.levelCompleteOverlay.classList.add('hidden')
        if (this.victoryOverlay) this.victoryOverlay.classList.remove('hidden')
        if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden')
        this._phaseTimerMs = 0
      } else if (phase === 'game_over') {
        if (this.levelCompleteOverlay) this.levelCompleteOverlay.classList.add('hidden')
        if (this.victoryOverlay) this.victoryOverlay.classList.add('hidden')
        if (this.gameOverOverlay) this.gameOverOverlay.classList.remove('hidden')
        this._phaseTimerMs = 0
      } else if (phase === 'battle') {
        // Hide all overlays when battle starts/resumes
        if (this.levelCompleteOverlay) this.levelCompleteOverlay.classList.add('hidden')
        if (this.victoryOverlay) this.victoryOverlay.classList.add('hidden')
        if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden')
        if (this._victoryToast) this._victoryToast.classList.add('hidden')
        if (this._fightOverviewOverlay) this._fightOverviewOverlay.classList.add('hidden')
      }
    }

    // Advance timer for timed transitions
    if (this._phaseTimerMs !== null) {
      this._phaseTimerMs += dtMs

      if (phase === 'fight_overview' && this._phaseTimerMs >= 1000) {
        this._phaseTimerMs = null
        const state = gameMachine.getState()
        if (this._victoryToast) this._victoryToast.classList.add('hidden')
        if (this._fightOverviewOverlay) {
          const isLastLevel = state.currentLevel >= ENEMY_POOL.length
          const btn = document.getElementById('fight-overview-btn')
          if (btn) {
            if (state.pendingLevelUp) btn.textContent = 'Level Up →'
            else if (isLastLevel) btn.textContent = 'Play again'
            else btn.textContent = 'Next Fight →'
          }
          this._renderFightOverviewContent(state)
          this._fightOverviewOverlay.classList.remove('hidden')
        }
      } else if (phase === 'level_complete' && this._phaseTimerMs >= LEVEL_COMPLETE_DELAY_MS) {
        // Legacy auto-advance (level_complete phase no longer emitted in normal flow).
        if (!gameMachine.getState().pendingLevelUp) {
          this._phaseTimerMs = null
          this._deliveryRenderer.cancelFlying()
          gameMachine.nextLevel()
        }
      } else if (phase === 'game_over' && this._phaseTimerMs >= GAME_OVER_RESTART_DELAY_MS) {
        this._phaseTimerMs = null
        this._deliveryRenderer.cancelFlying()
        gameMachine.restartLevel()
      }
    }
  }

  // -----------------------------------------------------------------------
  // Fight overview overlay content rendering (task-48)
  // -----------------------------------------------------------------------

  /**
   * Renders the fight overview overlay content from fightStatsSnapshot.
   * Generates HTML with stacked bars per skill slot, total damage, and avg idle time.
   * Early-returns if fightStatsSnapshot is null.
   */
  private _renderFightOverviewContent(state: GameState): void {
    const contentEl = document.getElementById('fight-overview-content')
    if (!contentEl) return
    const snap = state.fightStatsSnapshot
    if (!snap) return

    const durationSec = snap.durationMs / 1000
    const fmt1 = (n: number) => n.toFixed(1)

    const totalDmg = snap.left.totalDamage + snap.right.totalDamage
    const leftDps = durationSec > 0 ? snap.left.totalDamage / durationSec : 0
    const rightDps = durationSec > 0 ? snap.right.totalDamage / durationSec : 0
    const totalDps = durationSec > 0 ? totalDmg / durationSec : 0
    const leftPct = totalDmg > 0 ? Math.round(snap.left.totalDamage / totalDmg * 100) : 50
    const rightPct = 100 - leftPct

    const leftColor = this._slotColor({ side: 'left',  skillType: snap.left.skillType })
    const rightColor = this._slotColor({ side: 'right', skillType: snap.right.skillType })

    const renderSkillBar = (stats: SkillFightStats, label: string, dps: number, nameColor: string): string => {
      const { CRIT, HIT, GRAZE, MISS } = stats.hitsByResult
      const total = CRIT + HIT + GRAZE + MISS

      let barHtml: string
      if (total === 0) {
        barHtml = '<div class="fo-bar-seg" style="width:100%;background:#333;"></div>'
      } else {
        const seg = (count: number, color: string): string => {
          if (count === 0) return ''
          const w = (count / total * 100).toFixed(1)
          return `<div class="fo-bar-seg" style="width:${w}%;background:${color};"></div>`
        }
        barHtml = seg(CRIT, '#FFD700') + seg(HIT, '#FF8C00') + seg(GRAZE, '#4A9EFF') + seg(MISS, '#555')
      }

      let avgIdle: string
      if (stats.touchGaps.length >= 2) {
        const sum = stats.touchGaps.reduce((a, b) => a + b, 0)
        avgIdle = (sum / stats.touchGaps.length / 1000).toFixed(1) + 's'
      } else {
        avgIdle = '—'
      }

      return `
<div class="fo-skill">
  <div class="fo-skill-name" style="color:${nameColor}">${label}</div>
  <div class="fo-bar-row">
    <div class="fo-bar">${barHtml}</div>
    <span class="fo-shots">${stats.fireCount} shots</span>
  </div>
  <div class="fo-legend">
    <span class="fo-dot" style="background:#FFD700">crit</span>
    <span class="fo-dot" style="background:#FF8C00">hit</span>
    <span class="fo-dot" style="background:#4A9EFF">graze</span>
    <span class="fo-dot" style="background:#555">miss</span>
  </div>
  <div class="fo-stats">${fmt1(dps)} DPS &nbsp;|&nbsp; ${stats.totalDamage} dmg &nbsp;|&nbsp; idle: ${avgIdle}</div>
</div>`
    }

    const leftLabel = snap.left.skillType.replace(/_/g, ' ').toUpperCase()
    const rightLabel = snap.right.skillType.replace(/_/g, ' ').toUpperCase()

    // XP section — compute progress before and after the kill
    const xpAfter = getXpProgress(state.playerLevel, state.playerXp)
    const xpBefore = state.pendingLevelUp
      ? getXpProgress(state.playerLevel - 1, state.playerXp - 1)
      : getXpProgress(state.playerLevel, state.playerXp - 1)
    const beforePct = Math.round(xpBefore.progress * 100)
    const afterPct = Math.round(xpAfter.progress * 100)
    const levelUpBadge = state.pendingLevelUp
      ? `<div class="fo-level-up-badge">LEVEL UP!</div>`
      : ''
    const xpLabel = xpAfter.isMax ? 'MAX LEVEL' : `${state.playerXp} / ${xpAfter.nextThreshold} XP`

    contentEl.innerHTML = `
<div class="fo-header">
  <span class="fo-title">FIGHT OVERVIEW</span>
  <span class="fo-meta">${state.enemyName} &bull; ${fmt1(durationSec)}s &bull; ${fmt1(totalDps)} DPS</span>
</div>
${renderSkillBar(snap.left, leftLabel, leftDps, leftColor)}
${renderSkillBar(snap.right, rightLabel, rightDps, rightColor)}
<div class="fo-dmg-split-wrap">
  <div class="fo-dmg-split-title">DAMAGE SPLIT</div>
  <div class="fo-dmg-split">
    <div class="fo-dmg-seg" style="width:${leftPct}%;background:${leftColor};"></div>
    <div class="fo-dmg-seg" style="width:${rightPct}%;background:${rightColor};"></div>
  </div>
  <div class="fo-dmg-split-legend">
    <span style="color:${leftColor}">${leftLabel} ${snap.left.totalDamage} (${leftPct}%)</span>
    <span style="color:${rightColor}">${rightLabel} ${snap.right.totalDamage} (${rightPct}%)</span>
  </div>
</div>
<div class="fo-xp-section">
  <div class="fo-xp-row">
    <div class="fo-xp-gained">+1 XP</div>
    <div id="fo-xp-level-num" class="fo-xp-level-num">Lvl ${state.playerLevel}</div>
  </div>
  ${levelUpBadge}
  <div class="fo-xp-track" id="fo-xp-track">
    <div class="fo-xp-base" id="fo-xp-base" style="width:${beforePct}%"></div>
    <div class="fo-xp-gain" id="fo-xp-gain-bar" style="width:0%"></div>
  </div>
  <div class="fo-xp-label">${xpLabel}</div>
</div>`

    this._animateXpBar(state.pendingLevelUp, beforePct, afterPct)
  }

  private _animateXpBar(pendingLevelUp: boolean, beforePct: number, afterPct: number): void {
    if (pendingLevelUp) {
      // Phase 1: green fills from current position to end of level
      requestAnimationFrame(() => {
        const gainBar = document.getElementById('fo-xp-gain-bar')
        if (gainBar) gainBar.style.width = (100 - beforePct) + '%'
      })
      // Phase 2: pop bar + pop level number, then reset and animate into new level
      setTimeout(() => {
        const track = document.getElementById('fo-xp-track')
        const gainBar = document.getElementById('fo-xp-gain-bar')
        const baseBar = document.getElementById('fo-xp-base')
        const levelNum = document.getElementById('fo-xp-level-num')
        if (track) track.classList.add('fo-xp-pop')
        if (levelNum) levelNum.classList.add('fo-lvl-pop')
        setTimeout(() => {
          if (track) track.classList.remove('fo-xp-pop')
          if (levelNum) levelNum.classList.remove('fo-lvl-pop')
          if (gainBar) { gainBar.style.transition = 'none'; gainBar.style.width = '0%' }
          if (baseBar) { baseBar.style.width = '0%' }
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (gainBar) { gainBar.style.transition = 'width 0.6s ease-out'; gainBar.style.width = afterPct + '%' }
            })
          })
        }, 400)
      }, 750)
    } else {
      requestAnimationFrame(() => {
        const gainBar = document.getElementById('fo-xp-gain-bar')
        if (gainBar) gainBar.style.width = (afterPct - beforePct) + '%'
      })
    }
  }

  // -----------------------------------------------------------------------
  // XP HUD + upgrade picker overlay
  // -----------------------------------------------------------------------

  /**
   * Updates the XP bar fill and label below the player HP bar.
   * Reads from getXpProgress so the bar geometry matches the same source of
   * truth used by tests and game logic.
   */
  private _updateXpHud(playerLevel: number, playerXp: number): void {
    if (!this.xpLabel || !this.xpFill) return
    const p = getXpProgress(playerLevel, playerXp)
    if (p.isMax) {
      this.xpLabel.textContent = 'Lvl MAX'
      this.xpFill.style.width = '100%'
      this.xpFill.classList.add('max')
    } else {
      this.xpLabel.textContent = `Lvl ${playerLevel}`
      this.xpFill.style.width = `${Math.round(p.progress * 100)}%`
      this.xpFill.classList.remove('max')
    }
  }

  /**
   * Builds the upgrade tree DOM once at scene create time.
   * Each node becomes a button bound to confirmLevelUpUpgrade(nodeId) — clicks
   * fire only when the node is in the 'available' status class.
   */
  private _buildUpgradeTreeDom(): void {
    if (!this.upgradeTree || !this.upgradeCrossContainer) return
    this.upgradeTree.innerHTML = ''
    this.upgradeCrossContainer.innerHTML = ''
    this.upgradeNodeEls.clear()

    // Build the 4 main columns
    for (const path of UPGRADE_TREE_COLUMNS) {
      const col = document.createElement('div')
      col.className = 'upgrade-col'
      const header = document.createElement('div')
      header.className = 'upgrade-col-header'
      header.textContent = UPGRADE_PATH_TITLES[path]
      col.appendChild(header)
      const nodesInCol = UPGRADE_NODES.filter((n) => n.path === path)
      for (const node of nodesInCol) {
        const btn = this._createUpgradeNodeButton(node.id, node.title, node.description)
        col.appendChild(btn)
      }
      this.upgradeTree.appendChild(col)
    }

    // quick_chain — rendered as a horizontal row below the tree
    const crossWrap = document.createElement('div')
    crossWrap.style.display = 'flex'
    crossWrap.style.gap = '6px'
    const crossNodes = UPGRADE_NODES.filter((n) => n.path === 'quick_chain')
    for (const node of crossNodes) {
      const btn = this._createUpgradeNodeButton(node.id, node.title, node.description)
      btn.style.flex = '1'
      crossWrap.appendChild(btn)
    }
    this.upgradeCrossContainer.appendChild(crossWrap)
  }

  private _createUpgradeNodeButton(nodeId: UpgradeNodeId, title: string, description: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'upgrade-node'
    btn.type = 'button'
    btn.dataset['nodeId'] = nodeId
    btn.innerHTML = `<span class="node-title">${title}</span><span class="node-desc">${description}</span>`
    btn.addEventListener('click', () => this._onUpgradePicked(nodeId))
    this.upgradeNodeEls.set(nodeId, btn)
    return btn
  }

  /**
   * Handles a click on an upgrade node. Re-checks availability from current
   * state — if the node is unavailable (locked / unlocked / no pending pick),
   * the click is a no-op. On success, confirms the upgrade and immediately
   * advances to the next level so play resumes without an extra delay.
   */
  private _onUpgradePicked(nodeId: UpgradeNodeId): void {
    const state = gameMachine.getState()
    if (!state.pendingLevelUp) return
    if (getUpgradeNodeStatus(state.globalUpgrades, nodeId) !== 'available') return
    gameMachine.confirmLevelUpUpgrade(nodeId)
    this._deliveryRenderer.cancelFlying()
    gameMachine.nextLevel()
  }

  /**
   * Show or hide the upgrade picker overlay each frame and refresh node
   * statuses (available / locked / unlocked). Idempotent — when the overlay
   * is already visible, only the status classes are touched.
   */
  private _updateUpgradePicker(state: GameState): void {
    if (!this.upgradeOverlay) return
    // Upgrade picker is gated behind fight overview — don't show until user clicks through
    if (state.phase === 'fight_overview' && !this._showUpgradeAfterFightOverview) return
    const shouldShow = state.pendingLevelUp
    if (shouldShow) {
      if (!this._upgradePickerVisible) {
        if (this.upgradeLevelLabel) this.upgradeLevelLabel.textContent = `LEVEL ${state.playerLevel} REACHED`
        this.upgradeOverlay.classList.remove('hidden')
        this._upgradePickerVisible = true
      }
      this._refreshUpgradeNodeStatuses(state.globalUpgrades)
    } else if (this._upgradePickerVisible) {
      this.upgradeOverlay.classList.add('hidden')
      this._upgradePickerVisible = false
    }
  }

  private _refreshUpgradeNodeStatuses(upgrades: GlobalUpgradeState): void {
    for (const [nodeId, el] of this.upgradeNodeEls) {
      const status = getUpgradeNodeStatus(upgrades, nodeId)
      el.classList.toggle('available', status === 'available')
      el.classList.toggle('locked',    status === 'locked')
      el.classList.toggle('unlocked',  status === 'unlocked')
      el.disabled = status !== 'available'
    }
  }

  /**
   * Triggers the visual response to a player-hit event:
   *   1. Red flash overlay for PLAYER_HIT_FLASH_DURATION_MS
   *   2. Floating damage number above the player HP bar
   */
  private _spawnPlayerHitEffects(damage: number): void {
    if (this.playerHitFlash) this.playerHitFlash.classList.add('active')
    this._hitFlashRemainingMs = PLAYER_HIT_FLASH_DURATION_MS
    this.floatTexts.push({
      x: GAME_WIDTH / 2,
      y: LASER_ORIGIN_Y + 28,
      text: String(damage),
      color: PLAYER_HIT_FLOAT_COLOR,
      fontSize: FLOAT_TEXT_FONT_HIT,
      age: 0,
      life: 0.9,
    })
  }

  // -----------------------------------------------------------------------
  // Visual effects spawning
  // -----------------------------------------------------------------------

  private _spawnHitEffects(result: HitResult, _hitZone: HitZoneName, state: GameState): void {
    const hitPos = state.lastHit?.position
    const ex = hitPos?.x ?? state.enemy.x
    const ey = hitPos?.y ?? state.enemy.y

    const counts: Record<HitResult, number> = { CRIT: 30, HIT: 18, GRAZE: 12, MISS: 14 }
    const speeds: Record<HitResult, number> = { CRIT: 280, HIT: 220, GRAZE: 180, MISS: 220 }
    const color = getHitResultColor(result)

    this._addSparks(ex, ey, color, counts[result], speeds[result])

    if (result !== 'MISS') {
      const fontSizes: Record<string, number> = { CRIT: FLOAT_TEXT_FONT_CRIT, HIT: FLOAT_TEXT_FONT_HIT, GRAZE: FLOAT_TEXT_FONT_GRAZE }
      const baseDamageText = String(state.lastHit?.damage ?? '')
      // Crit hits get '!' suffix to visually signal the critical strike
      const damageText = result === 'CRIT' ? `${baseDamageText}!` : baseDamageText
      this.floatTexts.push({ x: ex, y: ey - 40, text: damageText, color, fontSize: fontSizes[result], age: 0, life: 0.9 })
    }
  }

  private _addSparks(x: number, y: number, color: string, count: number, baseSpeed: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const s = baseSpeed * (0.4 + Math.random() * 1.2)
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, age: 0, color })
    }
  }

  // -----------------------------------------------------------------------
  // Render phase — called by Phaser after its own drawing
  // -----------------------------------------------------------------------

  private onRender(): void {
    if (!this._lastState) return
    const ctx = this.ctx
    const state = this._lastState
    const now = performance.now()

    ctx.save()
    this._drawBackground(ctx)
    this._drawEnemySprite(ctx, state, now)

    // Fire particles (drawn before projectiles so balls render on top)
    this._drawFireParticles(ctx)

    // Projectiles
    for (const proj of state.activeProjectiles) {
      if (!proj.alive) continue
      const px = proj.origin.x + (proj.target.x - proj.origin.x) * proj.progress
      const py = proj.origin.y + (proj.target.y - proj.origin.y) * proj.progress
      this._drawProjectile(ctx, px, py, proj)
    }

    // Incoming enemy attack deliveries (orbs + overlays). The scene simply hands
    // the snapshot to the render layer, which delegates each delivery to its
    // visualKey's DeliveryVisual — no per-visual branching here (EnemyAttacks.md §5).
    this._deliveryRenderer.render(state.activeDeliveries, {
      scene: this,
      ctx,
      nowMs: now,
      dtMs: this._lastFrameDtMs,
    })

    this._drawSparks(ctx)
    this._drawActiveSlots(ctx, state.activeSlots, now)

    // Active lasers + reticles for dynamic slots
    for (const slot of state.activeSlots) {
      if (slot.active) {
        const reticle = computeReticle(
          { rotationPeriodMs: slot.rotationPeriodMs } as import('../types').TouchPoint,
          slot.dragOffsetX,
          state.elapsedMs - slot.touchStartMs,
        )
        const dx = reticle.x - slot.x
        const dy = reticle.y - slot.y
        const len = Math.hypot(dx, dy)
        const dir: [number, number] = len > 1e-4 ? [dx / len, dy / len] : [0, -1]
        this._drawLaser(ctx, slot.x, slot.y, dir, this._slotColor(slot))
        this._drawAimPoint(ctx, reticle.x, reticle.y, this._slotColor(slot), now)
      }
    }

    this._drawStunIndicator(ctx, state, now)
    this._drawFloatTexts(ctx)
    ctx.restore()
  }

  /**
   * Draws the ⚡ STUNNED indicator + remaining-seconds countdown above the
   * enemy. Visible only when the enemy is stunned at the current elapsedMs.
   * Position: above the enemy's torso centre, accounting for head height.
   */
  private _drawStunIndicator(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    const remainingMs = state.enemy.stunnedUntilMs - state.elapsedMs
    if (remainingMs <= 0) return
    const ex = state.enemy.x
    // Position above the head — torso half-height + head diameter + padding
    const headDiameter = ENEMY_HEAD_RADIUS_PX * 2
    const ey = state.enemy.y - ENEMY_TORSO_HEIGHT_PX / 2 - headDiameter - 22
    const pulse = 0.7 + 0.3 * Math.sin(now / 120)
    const seconds = (remainingMs / 1000).toFixed(1)
    ctx.save()
    ctx.globalAlpha = pulse
    ctx.shadowBlur = 16; ctx.shadowColor = '#ffe066'
    ctx.fillStyle = '#ffe066'
    ctx.font = 'bold 22px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`⚡ ${seconds}s`, ex, ey)
    ctx.restore()
  }

  // -----------------------------------------------------------------------
  // Drawing helpers — ported from laser-shot
  // -----------------------------------------------------------------------

  private _drawBackground(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    g.addColorStop(0, '#10003a')
    g.addColorStop(1, '#04000c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    ctx.strokeStyle = 'rgba(120, 60, 200, 0.08)'
    ctx.lineWidth = 1
    const step = PIXELS_PER_CM
    ctx.beginPath()
    for (let x = 0; x <= GAME_WIDTH; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, GAME_HEIGHT) }
    for (let y = 0; y <= GAME_HEIGHT; y += step) { ctx.moveTo(0, y); ctx.lineTo(GAME_WIDTH, y) }
    ctx.stroke()
  }

  // Procedural renderers removed in TASK-55 — all enemies use sprite-based rendering.

  /**
   * Generic sprite renderer — renders the current enemy animation frame from GameState.
   * Uses spriteKey + animKey + frameIndex to look up the Phaser texture.
   * Gets displayWidth and anchor from CharacterRegistry manifest.
   * No per-enemy branching — all sprite-based enemies use the same code path.
   */
  private _drawEnemySprite(ctx: CanvasRenderingContext2D, state: GameState, _now: number): void {
    const spriteKey = state.enemySpriteKey
    const animKey = state.enemyAnimKey
    const frameIndex = state.enemyFrameIndex
    const textureKey = `${spriteKey}_${animKey}_${frameIndex}`

    let textureExists = false
    try {
      textureExists = this.textures.exists(textureKey)
    } catch {
      textureExists = false
    }

    if (!textureExists) return  // no fallback — sprites are loaded generically

    const frame = this.textures.getFrame(textureKey)
    if (!frame?.source.image) return

    const img = frame.source.image as HTMLImageElement
    // Get display width from GameState (EnemyDef), anchor from CharacterRegistry
    const manifestId = state.enemyManifestId
    let drawW = state.enemyDisplayWidth ?? 128
    let anchorX = 0.5
    let anchorY = 0.6
    if (manifestId && characterRegistry.has(manifestId)) {
      const manifest = characterRegistry.get(manifestId)
      if (manifest.anchorX !== undefined) anchorX = manifest.anchorX
      if (manifest.anchorY !== undefined) anchorY = manifest.anchorY
    }
    const drawH = drawW * (frame.realHeight / frame.realWidth)

    const dx = state.enemy.x - drawW * anchorX
    const dy = state.enemy.y - drawH * anchorY

    ctx.save()
    ctx.drawImage(img, dx, dy, drawW, drawH)
    ctx.restore()

    // Mask overlay — same position/size as sprite (debug aid).
    // Gated behind config: when disabled, the overlay is not drawn at all.
    // Hit detection is unaffected — masks still load for the MaskHitDetector.
    if (HIT_ZONE_OVERLAY_ENABLED) {
      const maskKey = `${spriteKey}_mask_${animKey}_${frameIndex}`
      try {
        if (this.textures.exists(maskKey)) {
          const maskFrame = this.textures.getFrame(maskKey)
          if (maskFrame?.source.image) {
            ctx.save()
            ctx.globalAlpha = HIT_ZONE_OVERLAY_OPACITY
            ctx.drawImage(maskFrame.source.image as HTMLImageElement, dx, dy, drawW, drawH)
            ctx.restore()
          }
        }
      } catch { /* mask texture unavailable — skip silently */ }
    }
  }

  private _drawLaser(ctx: CanvasRenderingContext2D, tx: number, ty: number, dir: [number, number], color: string): void {
    const len = Math.hypot(GAME_WIDTH, GAME_HEIGHT) * 1.4
    const ex = tx + dir[0] * len
    const ey = ty + dir[1] * len
    ctx.save()
    ctx.lineCap = 'round'
    // Outer glow
    ctx.shadowBlur = 28; ctx.shadowColor = color
    ctx.strokeStyle = color; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(ex, ey); ctx.stroke()
    // Bright core
    ctx.shadowBlur = 12
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(ex, ey); ctx.stroke()
    // Finger glow
    ctx.shadowBlur = 28; ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(tx, ty, 15, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath(); ctx.arc(tx, ty, 4.5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  private _drawAimPoint(ctx: CanvasRenderingContext2D, ax: number, ay: number, color: string, now: number): void {
    const pulse = 0.7 + 0.3 * Math.sin(now / 100)
    ctx.save()
    // Pulsing ring
    ctx.shadowBlur = 30; ctx.shadowColor = color
    ctx.strokeStyle = color; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(ax, ay, 14 * pulse, 0, Math.PI * 2); ctx.stroke()
    // Inner dot
    ctx.shadowBlur = 20; ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI * 2); ctx.fill()
    // Crosshair
    ctx.shadowBlur = 12; ctx.strokeStyle = color; ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(ax - 18, ay); ctx.lineTo(ax - 8, ay)
    ctx.moveTo(ax + 8,  ay); ctx.lineTo(ax + 18, ay)
    ctx.moveTo(ax, ay - 18); ctx.lineTo(ax, ay - 8)
    ctx.moveTo(ax, ay + 8);  ctx.lineTo(ax, ay + 18)
    ctx.stroke()
    ctx.restore()
  }

  private _drawProjectile(ctx: CanvasRenderingContext2D, px: number, py: number, proj: import('../types').Projectile): void {
    const dx = proj.target.x - proj.origin.x
    const dy = proj.target.y - proj.origin.y
    const dist = Math.hypot(dx, dy)
    const nx = dist > 0 ? dx / dist : 0
    const ny = dist > 0 ? dy / dist : -1

    // Visual scale tracks the gameplay disc — spell_area upgrades grow the
    // effective hit radius (proj.projectileRadius) and we want the rendered
    // orb to match, so players see the upgrade they paid for.
    const radiusScale = proj.projectileRadius / PROJECTILE_BASE_RADIUS_PX

    if (proj.skillType === 'white_shot') {
      // White Shot — small bright white orb with subtle glow
      ctx.save()
      ctx.shadowBlur = 16; ctx.shadowColor = '#ffffff'
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(px, py, 4 * radiusScale, 0, Math.PI * 2); ctx.fill()
      // Trail
      ctx.strokeStyle = 'rgba(200,220,255,0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - nx * 14, py - ny * 14); ctx.stroke()
      // Bright core
      ctx.shadowBlur = 8; ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(px, py, 2 * radiusScale, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      return
    }

    if (proj.skillType === 'fireball') {
      // Fireball — larger glowing orange ball
      ctx.save()
      ctx.shadowBlur = 32; ctx.shadowColor = '#ff6a00'
      ctx.fillStyle = '#ff6a00'
      ctx.beginPath(); ctx.arc(px, py, 9 * radiusScale, 0, Math.PI * 2); ctx.fill()
      // Inner hot core
      ctx.shadowBlur = 18; ctx.fillStyle = '#ffe066'
      ctx.beginPath(); ctx.arc(px, py, 5 * radiusScale, 0, Math.PI * 2); ctx.fill()
      // White hot center
      ctx.shadowBlur = 8; ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(px, py, 2.5 * radiusScale, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      return
    }

    // Default rendering for slow_shot / fast_shot
    // Find the color of the slot that fired this projectile (by origin proximity)
    const slot = this._dynamicLayout.find(s => {
      const ddx = s.x - proj.origin.x, ddy = s.y - proj.origin.y
      return ddx * ddx + ddy * ddy < 100 // within 10px of a touch point
    })
    const color = slot ? this._slotColor(slot) : '#ffffff'

    ctx.save()
    ctx.shadowBlur = 24; ctx.shadowColor = color
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(px, py, 6 * radiusScale, 0, Math.PI * 2); ctx.fill()
    // Trail
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - nx * 22, py - ny * 22); ctx.stroke()
    // Bright core
    ctx.shadowBlur = 10; ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(px, py, 2.5 * radiusScale, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  /**
   * Returns a display color for a dynamic skill slot.
   * white_shot = white, fireball = orange, slow_shot = green/blue, fast_shot = orange/red.
   */
  private _slotColor(slot: { side: 'left' | 'right'; skillType: string }): string {
    if (slot.skillType === 'white_shot') return '#ffffff'
    if (slot.skillType === 'fireball')   return '#ff6a00'
    if (slot.skillType === 'slow_shot')  return slot.side === 'left' ? '#5cff3a' : '#3a8cff'
    if (slot.skillType === 'fast_shot')  return slot.side === 'left' ? '#ff9410' : '#ff2a3c'
    return '#b833ff' // fallback / unknown
  }

  private _drawActiveSlots(ctx: CanvasRenderingContext2D, slots: ActiveSlotState[], now: number): void {
    for (const slot of slots) {
      const isActive = slot.active
      const pulse = 0.85 + 0.15 * Math.sin(now / 380)
      const color = this._slotColor(slot)

      ctx.save()
      // Outer ring
      ctx.shadowBlur = isActive ? 30 : 18
      ctx.shadowColor = color
      ctx.strokeStyle = color
      ctx.globalAlpha = isActive ? 1 : 0.7 * pulse
      ctx.lineWidth = isActive ? 3 : 2
      ctx.beginPath(); ctx.arc(slot.x, slot.y, TOUCHPOINT_RADIUS, 0, Math.PI * 2); ctx.stroke()
      // Translucent fill
      ctx.shadowBlur = 8
      ctx.globalAlpha = isActive ? 0.35 : 0.14
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(slot.x, slot.y, TOUCHPOINT_RADIUS - 3, 0, Math.PI * 2); ctx.fill()
      // Center dot
      ctx.globalAlpha = 1; ctx.shadowBlur = 12; ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(slot.x, slot.y, 3.2, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }

  /**
   * Renders the fireball trail particles.
   * Color interpolates from white-hot center (#ffe066) to orange-red outer (#cc2200).
   */
  private _drawFireParticles(ctx: CanvasRenderingContext2D): void {
    for (const fp of this.fireParticles) {
      const t = fp.age / fp.life                        // 0 = birth, 1 = death
      const alpha = Math.max(0, 1 - t)
      const radius = fp.size * (1 - t * 0.6)           // shrinks as it ages
      // Interpolate color: young = bright yellow, old = dark orange
      const r = Math.round(255)
      const g = Math.round(230 * (1 - t) + 40 * t)
      const b = Math.round(0)
      ctx.save()
      ctx.globalAlpha = alpha * 0.85
      ctx.shadowBlur = 8; ctx.shadowColor = `rgb(${r},${g},${b})`
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.beginPath(); ctx.arc(fp.x, fp.y, radius, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }

  private _drawSparks(ctx: CanvasRenderingContext2D): void {
    for (const s of this.sparks) {
      const a = Math.max(0, 1 - s.age / s.life)
      ctx.save()
      ctx.globalAlpha = a
      ctx.shadowBlur = 12; ctx.shadowColor = s.color; ctx.fillStyle = s.color
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.5 * a + 0.5, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }

  private _drawFloatTexts(ctx: CanvasRenderingContext2D): void {
    for (const f of this.floatTexts) {
      const a = Math.max(0, 1 - f.age / f.life)
      ctx.save()
      ctx.globalAlpha = a
      ctx.shadowBlur = 14; ctx.shadowColor = f.color; ctx.fillStyle = f.color
      ctx.font = `bold ${f.fontSize}px "Courier New", monospace`
      ctx.textAlign = 'center'
      ctx.fillText(f.text, f.x, f.y)
      ctx.restore()
    }
  }
}
