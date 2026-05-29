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
  ENEMY_TORSO_WIDTH_PX,
  ENEMY_TORSO_HEIGHT_PX,
  ENEMY_ARM_LENGTH_PX,
  ENEMY_LEG_LENGTH_PX,
  ENEMY_LIMB_RADIUS_PX,
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
  LEVELS,
  STONE_GIANT_IDLE_FRAME_COUNT,
  STONE_GIANT_THROW_FRAME_COUNT,
  STONE_GIANT_IDLE_FRAME_MS,
  STONE_GIANT_THROW_FRAME_MS,
  STONE_GIANT_DISPLAY_WIDTH,
} from '../game/constants'
import { computeReticle } from '../game/systems/AimSystem'
import { getUpgradeNodeStatus, getXpProgress } from '../game/upgrades'
import type { GameState, HitResult, HitZoneName, ActiveSlotState, ShapeDescriptor, UpgradeNodeId, GlobalUpgradeState, SkillFightStats } from '../types'

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
  private victoryOverlay!: HTMLElement
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

  // Stone Giant animation state
  private _stoneGiantAnim: 'idle' | 'throw' = 'idle'
  private _stoneGiantFrame = 0
  private _stoneGiantAnimTimer = 0

  // Phase transition timers
  private _phaseTimerMs: number | null = null
  private _lastPhase: string | null = null

  // Player-hit visual tracking
  private _lastPlayerHitTimestamp: number | null = null
  private _hitFlashRemainingMs = 0

  // Last game state (set in update, read in onRender)
  private _lastState?: GameState

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
    this.victoryOverlay       = document.getElementById('victory-overlay')!
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
  }

  update(_time: number, delta: number): void {
    const cappedDelta = Math.min(delta, MAX_DELTA_MS)
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

    // Advance Stone Giant animation if active
    if (state.enemySpriteKey === 'stone_giant') {
      this._updateStoneGiantAnim(cappedDelta, state)
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
   * Extracts pixel data from all Stone Giant mask textures and registers
   * them with a MaskHitDetector instance, then passes it to GameStateMachine.
   * Pre-loads all mask data at scene start — no per-frame texture reads.
   */
  private _initMaskDetector(): void {
    const detector = new MaskHitDetector()
    let loaded = 0

    const extractMask = (textureKey: string, animKey: string, frameIndex: number): void => {
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
        detector.loadMaskData(animKey, frameIndex, new Uint8Array(imageData.data.buffer), w, h)
        loaded++
      } catch {
        // Texture extraction failed (e.g. headless test environment) — skip silently
      }
    }

    // Extract idle masks
    for (let i = 0; i < STONE_GIANT_IDLE_FRAME_COUNT; i++) {
      extractMask(`stone_giant_mask_idle_${i}`, 'idle', i)
    }

    // Extract throw masks
    for (let i = 0; i < STONE_GIANT_THROW_FRAME_COUNT; i++) {
      extractMask(`stone_giant_mask_throw_${i}`, 'throw', i)
    }

    if (loaded > 0) {
      gameMachine.setMaskDetector(detector)
    }
  }

  // -----------------------------------------------------------------------
  // Stone Giant animation logic
  // -----------------------------------------------------------------------

  /**
   * Advances Stone Giant sprite animation state and syncs with GameStateMachine.
   * Called from update() when the current enemy is stone_giant.
   *
   * Idle: cycles frames 0–9 at STONE_GIANT_IDLE_FRAME_MS per frame.
   * Throw: plays frames 0–6 once when triggered by an enemy attack, then returns to idle.
   */
  private _updateStoneGiantAnim(dtMs: number, state: GameState): void {
    // Check if a new enemy missile just spawned — trigger throw animation
    if (state.incomingMissiles.length > 0 && this._stoneGiantAnim === 'idle') {
      this._stoneGiantAnim = 'throw'
      this._stoneGiantFrame = 0
      this._stoneGiantAnimTimer = 0
    }

    this._stoneGiantAnimTimer += dtMs

    if (this._stoneGiantAnim === 'idle') {
      if (this._stoneGiantAnimTimer >= STONE_GIANT_IDLE_FRAME_MS) {
        this._stoneGiantAnimTimer -= STONE_GIANT_IDLE_FRAME_MS
        this._stoneGiantFrame = (this._stoneGiantFrame + 1) % STONE_GIANT_IDLE_FRAME_COUNT
      }
    } else {
      // throw animation
      if (this._stoneGiantAnimTimer >= STONE_GIANT_THROW_FRAME_MS) {
        this._stoneGiantAnimTimer -= STONE_GIANT_THROW_FRAME_MS
        this._stoneGiantFrame++
        if (this._stoneGiantFrame >= STONE_GIANT_THROW_FRAME_COUNT) {
          // Throw animation complete — return to idle
          this._stoneGiantAnim = 'idle'
          this._stoneGiantFrame = 0
          this._stoneGiantAnimTimer = 0
        }
      }
    }

    // Sync animation state with GameStateMachine for mask-based hit detection
    gameMachine.setEnemyAnimState(this._stoneGiantAnim, this._stoneGiantFrame)
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
          const isLastLevel = state.currentLevel >= LEVELS.length
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
          gameMachine.nextLevel()
        }
      } else if (phase === 'game_over' && this._phaseTimerMs >= GAME_OVER_RESTART_DELAY_MS) {
        this._phaseTimerMs = null
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

    // Incoming enemy missiles (orb with glow + trail)
    for (const m of state.incomingMissiles) {
      const mx = m.origin.x + (m.target.x - m.origin.x) * m.progress
      const my = m.origin.y + (m.target.y - m.origin.y) * m.progress
      this._drawIncomingMissile(ctx, mx, my, m.color, now)
    }

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

  /**
   * Dispatches to the correct procedural drawing routine based on the shape descriptor.
   * `now` is performance.now() in ms — used for idle animations.
   */
  private _drawEnemyByShape(
    ctx: CanvasRenderingContext2D,
    enemy: { x: number; y: number },
    shape: ShapeDescriptor,
    now: number,
  ): void {
    switch (shape.type) {
      case 'wisp':      this._drawEnemyWisp(ctx, enemy, shape, now);      break
      case 'blob':      this._drawEnemyBlob(ctx, enemy, shape, now);      break
      case 'spider':    this._drawDetailedSpider(ctx, enemy, shape, now); break
      case 'elemental': this._drawEnemyElemental(ctx, enemy, shape, now); break
      case 'wraith':    this._drawEnemyWraith(ctx, enemy, shape, now);    break
      case 'drake':     this._drawEnemyDrake(ctx, enemy, shape, now);     break
      case 'treant':    this._drawEnemyTreant(ctx, enemy, shape, now);    break
      case 'beast':     this._drawDetailedBeast(ctx, enemy, shape, now);  break
      case 'humanoid':
      default:          this._drawDetailedHumanoid(ctx, enemy, shape, now); break
    }
  }

  private _drawEnemyWisp(
    ctx: CanvasRenderingContext2D,
    enemy: { x: number; y: number },
    shape: ShapeDescriptor,
    now: number,
  ): void {
    const { x: ex, y: ey } = enemy
    const r = ENEMY_HEAD_RADIUS_PX * shape.scale * shape.headScale * 0.9
    const t = now / 1000
    const pulse = 0.78 + 0.22 * Math.sin(t * 3.4)
    const drift = Math.sin(t * 1.9) * 4

    ctx.save()
    // Outer haze
    const hazeG = ctx.createRadialGradient(ex, ey + drift, 0, ex, ey + drift, r * 2.8)
    hazeG.addColorStop(0, 'rgba(255,140,40,0.22)'); hazeG.addColorStop(1, 'rgba(255,100,20,0)')
    ctx.fillStyle = hazeG
    ctx.beginPath(); ctx.arc(ex, ey + drift, r * 2.8, 0, Math.PI * 2); ctx.fill()
    // Orb body
    const orbG = ctx.createRadialGradient(ex - r * 0.3, ey + drift - r * 0.3, r * 0.1, ex, ey + drift, r)
    orbG.addColorStop(0, '#ffdd80'); orbG.addColorStop(0.5, '#ff8820'); orbG.addColorStop(1, '#8a2000')
    ctx.fillStyle = orbG
    ctx.beginPath(); ctx.arc(ex, ey + drift, r * pulse, 0, Math.PI * 2); ctx.fill()
    // Core bright spot
    ctx.fillStyle = 'rgba(255,255,200,0.8)'
    ctx.beginPath(); ctx.arc(ex - r * 0.28, ey + drift - r * 0.28, r * 0.22, 0, Math.PI * 2); ctx.fill()
    // Trailing wisps
    ctx.globalAlpha = 0.35
    for (let i = 0; i < 3; i++) {
      const wa = t * 1.5 + i * Math.PI * 2 / 3
      ctx.fillStyle = '#ff6020'
      ctx.beginPath(); ctx.arc(ex + Math.cos(wa) * r * 0.7, ey + drift + Math.sin(wa) * r * 0.5 + r * 0.6, r * 0.2, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private _drawEnemyBlob(
    ctx: CanvasRenderingContext2D,
    enemy: { x: number; y: number },
    shape: ShapeDescriptor,
    now: number,
  ): void {
    const { x: ex, y: ey } = enemy
    const rW = ENEMY_TORSO_WIDTH_PX * shape.scale * shape.widthRatio * 0.55
    const rH = ENEMY_TORSO_HEIGHT_PX * shape.scale * 0.35
    const t = now / 1000
    const squish = Math.sin(t * 1.8) * 0.07

    ctx.save()
    // Ground shadow
    const shG = ctx.createRadialGradient(ex, ey + rH, 0, ex, ey + rH, rW * 0.85)
    shG.addColorStop(0, 'rgba(0,0,0,0.32)'); shG.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shG
    ctx.beginPath(); ctx.ellipse(ex, ey + rH, rW * 0.85, rW * 0.2, 0, 0, Math.PI * 2); ctx.fill()
    // Body — dark rocky/slimy mass
    const bG = ctx.createRadialGradient(ex - rW * 0.25, ey - rH * 0.3, rW * 0.1, ex, ey, rW)
    bG.addColorStop(0, '#5a5050'); bG.addColorStop(0.5, '#3a2e2e'); bG.addColorStop(1, '#1a1415')
    ctx.fillStyle = bG
    ctx.beginPath(); ctx.ellipse(ex, ey, rW * (1 + squish), rH * (1 - squish * 0.5), 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#2a2020'; ctx.lineWidth = 1.5; ctx.stroke()
    // Texture cracks
    ctx.strokeStyle = 'rgba(80,60,60,0.45)'; ctx.lineWidth = 1; ctx.lineCap = 'round'
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t * 0.1
      ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * rW * 0.25, ey + Math.sin(a) * rH * 0.25)
      ctx.lineTo(ex + Math.cos(a) * rW * 0.62, ey + Math.sin(a) * rH * 0.62); ctx.stroke()
    }
    // Glowing amber core
    const coreR = ENEMY_HEAD_RADIUS_PX * shape.headScale * 0.52
    const coreY = ey - rH * 0.42
    const cG = ctx.createRadialGradient(ex - coreR * 0.3, coreY - coreR * 0.3, coreR * 0.1, ex, coreY, coreR)
    cG.addColorStop(0, '#c08040'); cG.addColorStop(0.6, '#703020'); cG.addColorStop(1, '#200e08')
    ctx.fillStyle = cG
    ctx.beginPath(); ctx.arc(ex, coreY, coreR, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  /**
   * Spider renderer — low body with 8 thin legs radiating outward.
   */
  private _drawDetailedSpider(
    ctx: CanvasRenderingContext2D,
    enemy: { x: number; y: number },
    shape: ShapeDescriptor,
    now: number,
  ): void {
    const { x: ex, y: ey } = enemy
    const bodyR   = ENEMY_TORSO_WIDTH_PX * shape.scale * 0.32
    const abdRX   = bodyR * 1.1 * shape.widthRatio * 0.55
    const abdRY   = abdRX * 1.25
    const legLen  = ENEMY_TORSO_HEIGHT_PX * shape.scale * 0.55
    const legW    = ENEMY_LIMB_RADIUS_PX * shape.scale * 0.7
    const t = now / 1000

    ctx.save()
    // Ground shadow
    const shG = ctx.createRadialGradient(ex, ey + bodyR * 0.8, 0, ex, ey + bodyR * 0.8, bodyR * 1.8)
    shG.addColorStop(0, 'rgba(0,0,0,0.35)'); shG.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shG
    ctx.beginPath(); ctx.ellipse(ex, ey + bodyR * 0.8, bodyR * 1.8, bodyR * 0.3, 0, 0, Math.PI * 2); ctx.fill()

    // 8 legs with knee joints (4 pairs, alternating swing phases)
    ctx.lineCap = 'round'
    const legAngles: [number, number][] = [[-0.72, 0], [-0.92, 0.5], [-1.12, 0.25], [-1.32, 0.75]]
    for (let p = 0; p < 4; p++) {
      const swing = Math.sin(t * 2.6 + p * Math.PI * 0.5) * 0.11
      for (const side of [-1, 1] as const) {
        const baseA = side === -1 ? legAngles[p][0] + swing : -legAngles[p][0] - swing
        const kx = ex + Math.cos(baseA) * bodyR
        const ky = ey + Math.sin(baseA) * bodyR * 0.55
        const knee1A = baseA + side * 0.52
        const knX = kx + Math.cos(knee1A) * legLen * 0.5
        const knY = ky + Math.sin(knee1A) * legLen * 0.44
        const footA = knee1A + side * 0.68
        const fx = knX + Math.cos(footA) * legLen * 0.54
        const fy = knY + Math.sin(footA) * legLen * 0.44
        ctx.strokeStyle = '#2a1e14'; ctx.lineWidth = legW + 2
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(knX, knY); ctx.lineTo(fx, fy); ctx.stroke()
        ctx.strokeStyle = '#5a3e28'; ctx.lineWidth = legW
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(knX, knY); ctx.lineTo(fx, fy); ctx.stroke()
        ctx.fillStyle = '#3a2820'
        ctx.beginPath(); ctx.arc(knX, knY, legW * 0.85, 0, Math.PI * 2); ctx.fill()
      }
    }

    // Abdomen
    const abdX = ex - bodyR * 0.45, abdY = ey + bodyR * 0.25
    const abdG = ctx.createRadialGradient(abdX - abdRX * 0.3, abdY - abdRY * 0.3, abdRX * 0.1, abdX, abdY, abdRX * 1.1)
    abdG.addColorStop(0, '#5a3a22'); abdG.addColorStop(0.55, '#3a2218'); abdG.addColorStop(1, '#1a0e0a')
    ctx.fillStyle = abdG
    ctx.beginPath(); ctx.ellipse(abdX, abdY, abdRX, abdRY, -0.2, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#2a1810'; ctx.lineWidth = 1.5; ctx.stroke()
    // Hourglass pattern on abdomen
    ctx.fillStyle = 'rgba(200,80,20,0.45)'
    ctx.beginPath()
    ctx.moveTo(abdX, abdY - abdRY * 0.35); ctx.bezierCurveTo(abdX + abdRX * 0.28, abdY - abdRY * 0.15, abdX + abdRX * 0.28, abdY + abdRY * 0.15, abdX, abdY + abdRY * 0.35)
    ctx.bezierCurveTo(abdX - abdRX * 0.28, abdY + abdRY * 0.15, abdX - abdRX * 0.28, abdY - abdRY * 0.15, abdX, abdY - abdRY * 0.35)
    ctx.fill()

    // Cephalothorax
    const cG = ctx.createRadialGradient(ex - bodyR * 0.25, ey - bodyR * 0.25, bodyR * 0.1, ex, ey, bodyR)
    cG.addColorStop(0, '#6a4a32'); cG.addColorStop(0.6, '#3e2c1c'); cG.addColorStop(1, '#1e1408')
    ctx.fillStyle = cG
    ctx.beginPath(); ctx.arc(ex, ey, bodyR, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#2a1c0e'; ctx.lineWidth = 1.5; ctx.stroke()

    // 8 eyes (2 rows of 4)
    const eyePos: [number, number][] = [[-0.35,-0.44],[0,-0.52],[0.35,-0.44],[0.15,-0.25],[-0.15,-0.25],[0,-0.15],[0.25,-0.1],[-0.25,-0.1]]
    eyePos.forEach(([ox, oy], i) => {
      const er = bodyR * (i < 4 ? 0.09 : 0.065)
      const eyeX = ex + ox * bodyR, eyeY = ey + oy * bodyR
      const eG = ctx.createRadialGradient(eyeX - er * 0.3, eyeY - er * 0.3, 0, eyeX, eyeY, er)
      eG.addColorStop(0, i < 4 ? '#ff9020' : '#cc6010'); eG.addColorStop(1, i < 4 ? '#8a2000' : '#501000')
      ctx.fillStyle = eG; ctx.beginPath(); ctx.arc(eyeX, eyeY, er, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,240,180,0.55)'
      ctx.beginPath(); ctx.arc(eyeX - er * 0.25, eyeY - er * 0.25, er * 0.3, 0, Math.PI * 2); ctx.fill()
    })

    // Chelicerae (fangs)
    const fangSwing = Math.sin(t * 2.8) * 0.14
    ctx.strokeStyle = '#1a1008'; ctx.lineWidth = legW + 1.5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(ex - bodyR * 0.2, ey + bodyR * 0.32); ctx.lineTo(ex - bodyR * 0.38 - fangSwing * bodyR, ey + bodyR * 0.72); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ex + bodyR * 0.2, ey + bodyR * 0.32); ctx.lineTo(ex + bodyR * 0.38 + fangSwing * bodyR, ey + bodyR * 0.72); ctx.stroke()
    ctx.strokeStyle = '#4a3020'; ctx.lineWidth = legW * 0.55
    ctx.beginPath(); ctx.moveTo(ex - bodyR * 0.2, ey + bodyR * 0.32); ctx.lineTo(ex - bodyR * 0.38 - fangSwing * bodyR, ey + bodyR * 0.72); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ex + bodyR * 0.2, ey + bodyR * 0.32); ctx.lineTo(ex + bodyR * 0.38 + fangSwing * bodyR, ey + bodyR * 0.72); ctx.stroke()
    ctx.fillStyle = '#c8a050'
    ctx.beginPath(); ctx.arc(ex - bodyR * 0.38 - fangSwing * bodyR, ey + bodyR * 0.72, legW * 0.8, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(ex + bodyR * 0.38 + fangSwing * bodyR, ey + bodyR * 0.72, legW * 0.8, 0, Math.PI * 2); ctx.fill()

    ctx.restore()
  }

  private _drawEnemyElemental(
    ctx: CanvasRenderingContext2D,
    enemy: { x: number; y: number },
    shape: ShapeDescriptor,
    now: number,
  ): void {
    const { x: ex, y: ey } = enemy
    const h = ENEMY_TORSO_HEIGHT_PX * shape.scale * 1.1
    const w = ENEMY_TORSO_WIDTH_PX * shape.scale * shape.widthRatio * 0.45
    const crownR = ENEMY_HEAD_RADIUS_PX * shape.headScale
    const t = now / 1000
    const pulse = 0.8 + 0.2 * Math.sin(t * 2.8)

    ctx.save()
    // Ground shadow
    const shG = ctx.createRadialGradient(ex, ey + h * 0.5, 0, ex, ey + h * 0.5, w * 1.2)
    shG.addColorStop(0, 'rgba(0,0,0,0.3)'); shG.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shG; ctx.beginPath(); ctx.ellipse(ex, ey + h * 0.5, w * 1.2, w * 0.25, 0, 0, Math.PI * 2); ctx.fill()
    // Pillar body — ice blue
    const bG = ctx.createLinearGradient(ex - w, ey - h * 0.5, ex + w, ey + h * 0.5)
    bG.addColorStop(0, '#a8d8f0'); bG.addColorStop(0.4, '#5098c8'); bG.addColorStop(1, '#1a3858')
    ctx.fillStyle = bG
    ctx.beginPath()
    ctx.moveTo(ex - w * 0.6, ey + h * 0.5); ctx.lineTo(ex + w * 0.6, ey + h * 0.5)
    ctx.lineTo(ex + w * 0.35, ey - h * 0.5); ctx.lineTo(ex - w * 0.35, ey - h * 0.5); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#7ac0e8'; ctx.lineWidth = 1.5; ctx.stroke()
    // Shards
    ctx.strokeStyle = 'rgba(180,220,240,0.4)'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath(); ctx.moveTo(ex + i * w * 0.6, ey + h * 0.2); ctx.lineTo(ex + i * w * 1.4, ey + h * 0.35); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(ex + i * w * 0.5, ey - h * 0.15); ctx.lineTo(ex + i * w * 1.2, ey - h * 0.05); ctx.stroke()
    }
    // Crown (ice crystal tip)
    const crownY = ey - h * 0.5 - crownR * 0.8
    const cG = ctx.createRadialGradient(ex - crownR * 0.3, crownY - crownR * 0.3, crownR * 0.1, ex, crownY, crownR)
    cG.addColorStop(0, '#e0f4ff'); cG.addColorStop(0.5, '#80c8f0'); cG.addColorStop(1, '#2060a0')
    ctx.fillStyle = cG
    ctx.beginPath(); ctx.moveTo(ex, crownY - crownR * pulse); ctx.lineTo(ex + crownR * 0.7, crownY + crownR * 0.5); ctx.lineTo(ex - crownR * 0.7, crownY + crownR * 0.5); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#a8deff'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.restore()
  }

  private _drawEnemyWraith(
    ctx: CanvasRenderingContext2D,
    enemy: { x: number; y: number },
    shape: ShapeDescriptor,
    now: number,
  ): void {
    const { x: ex, y: ey } = enemy
    const rW = ENEMY_TORSO_WIDTH_PX * shape.scale * shape.widthRatio * 0.5
    const rH = ENEMY_TORSO_HEIGHT_PX * shape.scale * 0.7
    const coreR = ENEMY_HEAD_RADIUS_PX * shape.headScale * 0.45
    const t = now / 1000
    const drift = Math.sin(t * 1.4) * 5

    ctx.save()
    // Outer misty form — dark blue/grey
    ctx.globalAlpha = 0.18
    ctx.fillStyle = '#4060a0'
    ctx.beginPath(); ctx.ellipse(ex, ey + drift, rW, rH, 0, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 0.45
    ctx.strokeStyle = '#6080b0'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.ellipse(ex, ey + drift, rW, rH, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = 1
    // Wispy tendrils
    ctx.strokeStyle = 'rgba(100,130,200,0.3)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + t * 0.3
      ctx.beginPath(); ctx.moveTo(ex, ey + drift)
      ctx.lineTo(ex + Math.cos(a) * rW * 1.25, ey + drift + Math.sin(a) * rH * 1.4); ctx.stroke()
    }
    // Void core — dark indigo
    const coreY = ey + drift - rH * 0.15
    const cG = ctx.createRadialGradient(ex - coreR * 0.3, coreY - coreR * 0.3, coreR * 0.1, ex, coreY, coreR)
    cG.addColorStop(0, '#6040a0'); cG.addColorStop(0.6, '#281840'); cG.addColorStop(1, '#0a0818')
    ctx.fillStyle = cG; ctx.beginPath(); ctx.arc(ex, coreY, coreR, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#5040a0'; ctx.lineWidth = 2; ctx.stroke()
    // Eye gleam
    const eyePulse = 0.7 + 0.3 * Math.sin(t * 3.2)
    ctx.fillStyle = `rgba(140,80,255,${eyePulse})`
    ctx.beginPath(); ctx.arc(ex - coreR * 0.28, coreY - coreR * 0.08, coreR * 0.18, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(ex + coreR * 0.28, coreY - coreR * 0.08, coreR * 0.18, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  /**
   * Drake renderer — wide reptilian body with forward-thrust neck and head.
   */
  private _drawEnemyDrake(
    ctx: CanvasRenderingContext2D,
    enemy: { x: number; y: number },
    shape: ShapeDescriptor,
    now: number,
  ): void {
    const { x: ex, y: ey } = enemy
    const bW = ENEMY_TORSO_WIDTH_PX * shape.scale * shape.widthRatio * 0.55
    const bH = ENEMY_TORSO_HEIGHT_PX * shape.scale * 0.4
    const headR = ENEMY_HEAD_RADIUS_PX * shape.headScale
    const limbR = ENEMY_LIMB_RADIUS_PX * shape.scale
    const t = now / 1000
    const breathe = Math.sin(t * 1.6) * 0.04
    const headBob = Math.sin(t * 1.6) * 2.5
    const tailSwing = Math.sin(t * 1.2) * 0.18
    const headX = ex + bW * 0.45
    const headY = ey - bH * 0.8 + headBob

    ctx.save()
    // Ground shadow
    const shG = ctx.createRadialGradient(ex, ey + bH, 0, ex, ey + bH, bW * 1.1)
    shG.addColorStop(0, 'rgba(0,0,0,0.35)'); shG.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shG
    ctx.beginPath(); ctx.ellipse(ex, ey + bH, bW * 1.1, bW * 0.22, 0, 0, Math.PI * 2); ctx.fill()

    // Tail (animated sway)
    const tailTipX = ex - bW * 1.25 + Math.sin(tailSwing) * bW * 0.3
    const tailTipY = ey + bH * 0.7 + Math.cos(tailSwing) * bH * 0.2
    ctx.strokeStyle = '#3a2818'; ctx.lineWidth = limbR * 1.8; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(ex - bW * 0.45, ey + bH * 0.1); ctx.quadraticCurveTo(ex - bW * 0.9, ey + bH * 0.5, tailTipX, tailTipY); ctx.stroke()
    ctx.strokeStyle = '#6a4028'; ctx.lineWidth = limbR * 1.1
    ctx.beginPath(); ctx.moveTo(ex - bW * 0.45, ey + bH * 0.1); ctx.quadraticCurveTo(ex - bW * 0.9, ey + bH * 0.5, tailTipX, tailTipY); ctx.stroke()

    // Legs (2 pairs with slight walk cycle)
    ctx.lineCap = 'round'
    for (let p = 0; p < 2; p++) {
      const legSwing = Math.sin(t * 2.2 + p * Math.PI) * 0.06
      for (const side of [-1, 1] as const) {
        const lx = ex + side * bW * (0.28 + p * 0.3)
        const ly = ey + bH * 0.3
        const fx = lx + side * bW * 0.15 + legSwing * bW
        const fy = ly + bH * 1.1
        ctx.strokeStyle = '#2a1c10'; ctx.lineWidth = limbR + 2
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(fx, fy); ctx.stroke()
        ctx.strokeStyle = '#6a4828'; ctx.lineWidth = limbR
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(fx, fy); ctx.stroke()
      }
    }

    // Body
    const bG = ctx.createRadialGradient(ex - bW * 0.2, ey - bH * 0.2, bW * 0.1, ex, ey, bW * 1.1)
    bG.addColorStop(0, '#7a5038'); bG.addColorStop(0.5, '#4a2c18'); bG.addColorStop(1, '#1e1008')
    ctx.fillStyle = bG
    ctx.beginPath(); ctx.ellipse(ex - bW * 0.05, ey, bW * (1 + breathe), bH * (1 - breathe * 0.5), 0, 0, Math.PI * 2); ctx.fill()
    // Scale texture lines
    ctx.strokeStyle = 'rgba(90,55,30,0.4)'; ctx.lineWidth = 1; ctx.lineCap = 'round'
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI
      ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * bW * 0.25, ey + Math.sin(a) * bH * 0.25)
      ctx.lineTo(ex + Math.cos(a) * bW * 0.7, ey + Math.sin(a) * bH * 0.7); ctx.stroke()
    }

    // Neck
    ctx.strokeStyle = '#4a2c18'; ctx.lineWidth = headR * 0.75; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(ex + bW * 0.22, ey - bH * 0.38); ctx.lineTo(headX, headY + headR * 0.8); ctx.stroke()
    ctx.strokeStyle = '#6a4028'; ctx.lineWidth = headR * 0.45
    ctx.beginPath(); ctx.moveTo(ex + bW * 0.22, ey - bH * 0.38); ctx.lineTo(headX, headY + headR * 0.8); ctx.stroke()

    // Head
    const hG = ctx.createRadialGradient(headX - headR * 0.3, headY - headR * 0.3, headR * 0.1, headX, headY, headR)
    hG.addColorStop(0, '#8a5038'); hG.addColorStop(0.55, '#4a2818'); hG.addColorStop(1, '#1e0e08')
    ctx.fillStyle = hG
    ctx.beginPath(); ctx.arc(headX, headY, headR, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#6a3820'; ctx.lineWidth = 1.5; ctx.stroke()
    // Snout
    ctx.fillStyle = '#5a3018'
    ctx.beginPath(); ctx.ellipse(headX + headR * 0.55, headY + headR * 0.1, headR * 0.38, headR * 0.22, 0.15, 0, Math.PI * 2); ctx.fill()
    // Eye
    const eyeG = ctx.createRadialGradient(headX + headR * 0.28, headY - headR * 0.18, 0, headX + headR * 0.28, headY - headR * 0.18, headR * 0.16)
    eyeG.addColorStop(0, '#ffcc40'); eyeG.addColorStop(1, '#a05010')
    ctx.fillStyle = eyeG
    ctx.beginPath(); ctx.arc(headX + headR * 0.28, headY - headR * 0.18, headR * 0.14, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.beginPath(); ctx.arc(headX + headR * 0.3, headY - headR * 0.17, headR * 0.06, 0, Math.PI * 2); ctx.fill()

    ctx.restore()
  }

  private _drawEnemyTreant(
    ctx: CanvasRenderingContext2D,
    enemy: { x: number; y: number },
    shape: ShapeDescriptor,
    now: number,
  ): void {
    const { x: ex, y: ey } = enemy
    const trunkW = ENEMY_TORSO_WIDTH_PX * shape.scale * 0.55
    const trunkH = ENEMY_TORSO_HEIGHT_PX * shape.scale * 0.9
    const heartR = ENEMY_HEAD_RADIUS_PX * shape.headScale
    const t = now / 1000
    const sway = Math.sin(t * 0.8) * 0.06
    const heartPulse = 0.82 + 0.18 * Math.sin(t * 2.2)

    ctx.save()
    // Ground shadow
    const shG = ctx.createRadialGradient(ex, ey + trunkH * 0.5, 0, ex, ey + trunkH * 0.5, trunkW * 1.3)
    shG.addColorStop(0, 'rgba(0,0,0,0.38)'); shG.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shG
    ctx.beginPath(); ctx.ellipse(ex, ey + trunkH * 0.5, trunkW * 1.3, trunkW * 0.22, 0, 0, Math.PI * 2); ctx.fill()

    // Roots at base
    ctx.lineCap = 'round'
    for (let i = 0; i < 5; i++) {
      const ra = (i / 5) * Math.PI + Math.PI * 0.1
      const rootLen = trunkW * (0.7 + 0.3 * (i % 2))
      const rs = i % 2 === 0 ? sway : -sway * 0.5
      ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 5 - i * 0.6
      ctx.beginPath()
      ctx.moveTo(ex + Math.cos(ra) * trunkW * 0.35, ey + trunkH * 0.45)
      ctx.quadraticCurveTo(
        ex + Math.cos(ra) * rootLen * 0.6 + rs * trunkW,
        ey + trunkH * 0.5 + rootLen * 0.2,
        ex + Math.cos(ra) * rootLen,
        ey + trunkH * 0.52 + rootLen * 0.18,
      )
      ctx.stroke()
    }

    // Branches (animated sway)
    const branchAngles = [-0.45, -0.72, -1.1, -1.48, -1.75]
    for (let i = 0; i < 5; i++) {
      const ba = branchAngles[i] + sway * (i % 2 === 0 ? 1 : -0.7)
      const bLen = trunkW * (0.9 + 0.5 * (i % 2)) + i * trunkW * 0.08
      const bx1 = ex + Math.cos(ba) * trunkW * 0.45
      const by1 = ey + Math.sin(ba) * trunkH * 0.35 - trunkH * 0.05 * i
      const bx2 = bx1 + Math.cos(ba) * bLen
      const by2 = by1 + Math.sin(ba) * bLen * 0.55
      ctx.strokeStyle = '#1e1206'; ctx.lineWidth = 5 - i * 0.7; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.quadraticCurveTo((bx1 + bx2) / 2 + sway * 8, (by1 + by2) / 2, bx2, by2); ctx.stroke()
      ctx.strokeStyle = '#4a3018'; ctx.lineWidth = 3 - i * 0.4
      ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.quadraticCurveTo((bx1 + bx2) / 2 + sway * 8, (by1 + by2) / 2, bx2, by2); ctx.stroke()
      // Leaf cluster
      ctx.fillStyle = `rgba(${30 + i * 8},${55 + i * 5},${15 + i * 3},0.72)`
      ctx.beginPath(); ctx.arc(bx2, by2, trunkW * (0.25 + 0.06 * (i % 2)), 0, Math.PI * 2); ctx.fill()
    }

    // Trunk
    const tG = ctx.createLinearGradient(ex - trunkW * 0.6, ey, ex + trunkW * 0.6, ey)
    tG.addColorStop(0, '#1e1206'); tG.addColorStop(0.3, '#4a3018'); tG.addColorStop(0.7, '#3a2410'); tG.addColorStop(1, '#150e04')
    ctx.fillStyle = tG
    ctx.beginPath()
    ctx.moveTo(ex - trunkW * 0.6, ey + trunkH * 0.5)
    ctx.lineTo(ex + trunkW * 0.6, ey + trunkH * 0.5)
    ctx.lineTo(ex + trunkW * 0.38, ey - trunkH * 0.4)
    ctx.lineTo(ex - trunkW * 0.38, ey - trunkH * 0.4)
    ctx.closePath(); ctx.fill()
    // Bark texture
    ctx.strokeStyle = 'rgba(20,12,4,0.5)'; ctx.lineWidth = 2; ctx.lineCap = 'butt'
    for (let i = 0; i < 4; i++) {
      const lx = ex - trunkW * 0.25 + i * trunkW * 0.15
      ctx.beginPath(); ctx.moveTo(lx, ey - trunkH * 0.35); ctx.lineTo(lx + trunkW * 0.05, ey + trunkH * 0.45); ctx.stroke()
    }

    // Heart node (pulses)
    const heartY = ey - trunkH * 0.3
    const cG = ctx.createRadialGradient(ex - heartR * 0.3, heartY - heartR * 0.3, heartR * 0.1, ex, heartY, heartR)
    cG.addColorStop(0, '#80e050'); cG.addColorStop(0.5, '#308030'); cG.addColorStop(1, '#0a2008')
    ctx.fillStyle = cG
    ctx.beginPath(); ctx.arc(ex, heartY, heartR * heartPulse, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#50c030'; ctx.lineWidth = 1.8; ctx.stroke()
    // Vein lines from heart
    ctx.strokeStyle = 'rgba(80,200,48,0.3)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'
    for (let i = 0; i < 4; i++) {
      const va = (i / 4) * Math.PI * 2 + t * 0.4
      ctx.beginPath(); ctx.moveTo(ex + Math.cos(va) * heartR, heartY + Math.sin(va) * heartR)
      ctx.lineTo(ex + Math.cos(va) * trunkW * 0.35, heartY + Math.sin(va) * trunkH * 0.25); ctx.stroke()
    }

    ctx.restore()
  }

  private _drawDetailedBeast(
    ctx: CanvasRenderingContext2D,
    enemy: { x: number; y: number },
    shape: ShapeDescriptor,
    now: number,
  ): void {
    const { x: ex, y: ey } = enemy
    const bW = ENEMY_TORSO_WIDTH_PX * shape.scale * shape.widthRatio * 0.48
    const bH = ENEMY_TORSO_HEIGHT_PX * shape.scale * 0.3
    const headR = ENEMY_HEAD_RADIUS_PX * shape.headScale * 0.72
    const limbR = ENEMY_LIMB_RADIUS_PX * shape.scale
    const t = now / 1000
    const breathe = Math.sin(t * 1.4) * 0.05
    const headBob = Math.sin(t * 1.4) * 2
    const headX = ex + bW * 0.72
    const headY = ey - bH * 0.45 + headBob

    ctx.save()
    // Ground shadow
    const shG = ctx.createRadialGradient(ex, ey + bH, 0, ex, ey + bH, bW * 1.2)
    shG.addColorStop(0, 'rgba(0,0,0,0.38)'); shG.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shG
    ctx.beginPath(); ctx.ellipse(ex, ey + bH, bW * 1.2, bW * 0.2, 0, 0, Math.PI * 2); ctx.fill()

    // Tail
    const tailSwing = Math.sin(t * 1.8) * 0.15
    ctx.strokeStyle = '#3a2810'; ctx.lineWidth = limbR * 1.4; ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(ex - bW * 0.6, ey - bH * 0.1)
    ctx.quadraticCurveTo(ex - bW * 1.0, ey - bH * 0.5 + tailSwing * bH * 3, ex - bW * 1.2, ey - bH * 0.8 + tailSwing * bH * 4)
    ctx.stroke()
    ctx.strokeStyle = '#6a4820'; ctx.lineWidth = limbR * 0.7
    ctx.beginPath()
    ctx.moveTo(ex - bW * 0.6, ey - bH * 0.1)
    ctx.quadraticCurveTo(ex - bW * 1.0, ey - bH * 0.5 + tailSwing * bH * 3, ex - bW * 1.2, ey - bH * 0.8 + tailSwing * bH * 4)
    ctx.stroke()

    // 4 legs with walk cycle
    ctx.lineCap = 'round'
    for (let p = 0; p < 2; p++) {
      const swing = Math.sin(t * 2.5 + p * Math.PI) * 0.08
      for (const side of [-1, 1] as const) {
        const lx = ex + side * bW * (0.35 + p * 0.25)
        const ly = ey + bH * 0.38
        const fx = lx + swing * bW * side
        const fy = ly + bH * 1.15
        ctx.strokeStyle = '#221408'; ctx.lineWidth = limbR + 2
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(fx, fy); ctx.stroke()
        ctx.strokeStyle = '#5a3818'; ctx.lineWidth = limbR
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(fx, fy); ctx.stroke()
      }
    }

    // Body
    const bG = ctx.createRadialGradient(ex - bW * 0.2, ey - bH * 0.2, bW * 0.1, ex, ey, bW * 1.1)
    bG.addColorStop(0, '#8a5a38'); bG.addColorStop(0.5, '#4e3020'); bG.addColorStop(1, '#1e1208')
    ctx.fillStyle = bG
    ctx.beginPath(); ctx.ellipse(ex - bW * 0.05, ey, bW * (1 + breathe), bH * (1 - breathe * 0.5), 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 1.5; ctx.stroke()
    // Fur texture
    ctx.strokeStyle = 'rgba(100,65,35,0.3)'; ctx.lineWidth = 1; ctx.lineCap = 'round'
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * bW * 0.3, ey + Math.sin(a) * bH * 0.3)
      ctx.lineTo(ex + Math.cos(a) * bW * 0.72, ey + Math.sin(a) * bH * 0.72); ctx.stroke()
    }

    // Neck
    ctx.strokeStyle = '#4a2c14'; ctx.lineWidth = headR * 0.65; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(ex + bW * 0.35, ey - bH * 0.3); ctx.lineTo(headX - headR * 0.4, headY + headR * 0.5); ctx.stroke()

    // Head
    const hG = ctx.createRadialGradient(headX - headR * 0.3, headY - headR * 0.3, headR * 0.1, headX, headY, headR)
    hG.addColorStop(0, '#9a6040'); hG.addColorStop(0.55, '#543018'); hG.addColorStop(1, '#200e06')
    ctx.fillStyle = hG
    ctx.beginPath(); ctx.arc(headX, headY, headR, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#4a2810'; ctx.lineWidth = 1.5; ctx.stroke()
    // Muzzle
    ctx.fillStyle = '#6a3820'
    ctx.beginPath(); ctx.ellipse(headX + headR * 0.42, headY + headR * 0.15, headR * 0.42, headR * 0.28, 0.1, 0, Math.PI * 2); ctx.fill()
    // Ear
    ctx.fillStyle = '#3a2010'
    ctx.beginPath(); ctx.moveTo(headX - headR * 0.3, headY - headR * 0.6); ctx.lineTo(headX - headR * 0.55, headY - headR * 1.05); ctx.lineTo(headX, headY - headR * 0.75); ctx.closePath(); ctx.fill()
    // Eye
    const eyeG = ctx.createRadialGradient(headX + headR * 0.2, headY - headR * 0.2, 0, headX + headR * 0.2, headY - headR * 0.2, headR * 0.18)
    eyeG.addColorStop(0, '#ffa020'); eyeG.addColorStop(1, '#802808')
    ctx.fillStyle = eyeG
    ctx.beginPath(); ctx.arc(headX + headR * 0.2, headY - headR * 0.2, headR * 0.16, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#0a0400'
    ctx.beginPath(); ctx.arc(headX + headR * 0.22, headY - headR * 0.19, headR * 0.07, 0, Math.PI * 2); ctx.fill()

    ctx.restore()
  }

  private _drawDetailedHumanoid(
    ctx: CanvasRenderingContext2D,
    enemy: { x: number; y: number },
    shape: ShapeDescriptor,
    now: number,
  ): void {
    const { x: ex, y: ey } = enemy
    const sc  = shape.scale
    const hsc = shape.headScale
    const wr  = shape.widthRatio

    const headR   = ENEMY_HEAD_RADIUS_PX * sc * hsc
    const torsoW  = ENEMY_TORSO_WIDTH_PX * sc * wr
    const torsoH  = ENEMY_TORSO_HEIGHT_PX * sc
    const torsoHW = torsoW / 2
    const torsoHH = torsoH / 2
    const neckY   = ey - torsoHH
    const headCY  = neckY - headR
    const shoulderY = neckY + 0.25 * PIXELS_PER_CM * sc
    const hipY    = ey + torsoHH
    const limbR   = ENEMY_LIMB_RADIUS_PX * sc
    const armLen  = ENEMY_ARM_LENGTH_PX * sc
    const legLen  = ENEMY_LEG_LENGTH_PX * sc

    const t = now / 1000
    const breathe  = Math.sin(t * 1.3) * 0.03
    const armSwing = Math.sin(t * 1.3) * 0.08
    const headSway = Math.sin(t * 0.9) * 1.8

    ctx.save()
    // Ground shadow
    const shG = ctx.createRadialGradient(ex, hipY + legLen * 0.9, 0, ex, hipY + legLen * 0.9, torsoW * 0.9)
    shG.addColorStop(0, 'rgba(0,0,0,0.35)'); shG.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = shG
    ctx.beginPath(); ctx.ellipse(ex, hipY + legLen * 0.92, torsoW * 0.9, torsoW * 0.18, 0, 0, Math.PI * 2); ctx.fill()

    // Legs
    ctx.lineCap = 'round'
    const legSwingL = Math.sin(t * 1.3) * 0.06
    for (const side of [-1, 1] as const) {
      const ls = side === -1 ? legSwingL : -legSwingL
      const lx1 = ex + side * torsoHW * 0.5; const ly1 = hipY
      const lx2 = lx1 + side * torsoHW * 0.3 + ls * torsoW; const ly2 = hipY + legLen
      ctx.strokeStyle = '#1a1008'; ctx.lineWidth = limbR * 2 + 2
      ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2); ctx.stroke()
      ctx.strokeStyle = '#5a3820'; ctx.lineWidth = limbR * 2
      ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2); ctx.stroke()
      // Boot
      ctx.fillStyle = '#2a1a0c'
      ctx.beginPath(); ctx.ellipse(lx2, ly2, limbR * 1.6, limbR * 0.8, 0.1, 0, Math.PI * 2); ctx.fill()
    }

    // Torso
    const tG = ctx.createLinearGradient(ex - torsoHW, ey, ex + torsoHW, ey)
    tG.addColorStop(0, '#2e1e0e'); tG.addColorStop(0.4, '#5e3a20'); tG.addColorStop(0.7, '#4a2e16'); tG.addColorStop(1, '#1e1208')
    ctx.fillStyle = tG
    ctx.beginPath()
    ctx.moveTo(ex - torsoHW, ey - torsoHH); ctx.lineTo(ex + torsoHW, ey - torsoHH)
    ctx.lineTo(ex + torsoHW * (1 + breathe), ey + torsoHH); ctx.lineTo(ex - torsoHW * (1 + breathe), ey + torsoHH)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 1.5; ctx.stroke()
    // Chest detail
    ctx.strokeStyle = 'rgba(90,55,25,0.45)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(ex, ey - torsoHH * 0.85); ctx.lineTo(ex, ey + torsoHH * 0.7); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ex - torsoHW * 0.6, ey - torsoHH * 0.2); ctx.lineTo(ex + torsoHW * 0.6, ey - torsoHH * 0.2); ctx.stroke()

    // Arms
    for (const side of [-1, 1] as const) {
      const as = side === -1 ? armSwing : -armSwing
      const ax1 = ex + side * torsoHW; const ay1 = shoulderY
      const ax2 = ax1 + side * armLen * 0.55 + as * armLen; const ay2 = ay1 + armLen * 0.85
      ctx.strokeStyle = '#1a1008'; ctx.lineWidth = limbR * 2 + 2; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke()
      ctx.strokeStyle = '#5a3820'; ctx.lineWidth = limbR * 2
      ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke()
      // Hand
      ctx.fillStyle = '#4a2c16'
      ctx.beginPath(); ctx.arc(ax2, ay2, limbR * 1.3, 0, Math.PI * 2); ctx.fill()
    }

    // Neck
    ctx.fillStyle = '#4a2c16'
    ctx.beginPath(); ctx.rect(ex - headR * 0.35, neckY, headR * 0.7, headR * 0.5); ctx.fill()

    // Head
    const hG = ctx.createRadialGradient(ex - headR * 0.25 + headSway, headCY - headR * 0.25, headR * 0.1, ex + headSway, headCY, headR)
    hG.addColorStop(0, '#9a6040'); hG.addColorStop(0.55, '#5a3020'); hG.addColorStop(1, '#200e06')
    ctx.fillStyle = hG
    ctx.beginPath(); ctx.arc(ex + headSway, headCY, headR, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#3a1e0c'; ctx.lineWidth = 1.5; ctx.stroke()
    // Eyes
    for (const side of [-1, 1] as const) {
      const eyeX = ex + headSway + side * headR * 0.32; const eyeY = headCY - headR * 0.1
      const eG = ctx.createRadialGradient(eyeX - headR * 0.05, eyeY - headR * 0.05, 0, eyeX, eyeY, headR * 0.15)
      eG.addColorStop(0, '#ff8820'); eG.addColorStop(1, '#a03008')
      ctx.fillStyle = eG; ctx.beginPath(); ctx.arc(eyeX, eyeY, headR * 0.14, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#080402'; ctx.beginPath(); ctx.arc(eyeX, eyeY, headR * 0.06, 0, Math.PI * 2); ctx.fill()
    }

    ctx.restore()
  }

  private _drawEnemySprite(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    const spriteKey = state.enemySpriteKey

    if (spriteKey === 'stone_giant') {
      this._drawStoneGiantSprite(ctx, state)
      return
    }

    let textureExists = false

    try {
      textureExists = this.textures.exists(spriteKey)
    } catch {
      textureExists = false
    }

    if (textureExists) {
      const frame = this.textures.getFrame(spriteKey)
      if (frame && frame.source.image) {
        const img = frame.source.image as HTMLImageElement
        const drawW = ENEMY_TORSO_WIDTH_PX * 2.5
        const drawH = drawW * (frame.realHeight / frame.realWidth)
        ctx.save()
        ctx.drawImage(img, state.enemy.x - drawW / 2, state.enemy.y - drawH * 0.6, drawW, drawH)
        ctx.restore()
        return
      }
    }

    this._drawEnemyByShape(ctx, state.enemy, state.enemyShape, now)
  }

  /**
   * Renders the Stone Giant using its current animation frame.
   * Each frame is a separate Phaser texture (stone_giant_idle_N / stone_giant_throw_N).
   * Falls back to procedural rendering if the frame texture is not available.
   */
  private _drawStoneGiantSprite(ctx: CanvasRenderingContext2D, state: GameState): void {
    const animKey = this._stoneGiantAnim
    const frameIdx = this._stoneGiantFrame
    const textureKey = `stone_giant_${animKey}_${frameIdx}`

    try {
      if (!this.textures.exists(textureKey)) {
        this._drawEnemyByShape(ctx, state.enemy, state.enemyShape, performance.now())
        return
      }
    } catch {
      this._drawEnemyByShape(ctx, state.enemy, state.enemyShape, performance.now())
      return
    }

    const frame = this.textures.getFrame(textureKey)
    if (!frame || !frame.source.image) {
      this._drawEnemyByShape(ctx, state.enemy, state.enemyShape, performance.now())
      return
    }

    const img = frame.source.image as HTMLImageElement
    const drawW = STONE_GIANT_DISPLAY_WIDTH
    const drawH = drawW * (frame.realHeight / frame.realWidth)
    const dx = state.enemy.x - drawW / 2
    const dy = state.enemy.y - drawH * 0.6
    ctx.save()
    ctx.drawImage(img, dx, dy, drawW, drawH)
    ctx.restore()

    // Mask overlay — same position/size as sprite, 20% opacity
    const maskKey = `stone_giant_mask_${animKey}_${frameIdx}`
    try {
      if (this.textures.exists(maskKey)) {
        const maskFrame = this.textures.getFrame(maskKey)
        if (maskFrame?.source.image) {
          ctx.save()
          ctx.globalAlpha = 0.2
          ctx.drawImage(maskFrame.source.image as HTMLImageElement, dx, dy, drawW, drawH)
          ctx.restore()
        }
      }
    } catch { /* mask texture unavailable — skip silently */ }
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

  /**
   * Draws a pulsing incoming-enemy missile at (px, py) with the given color.
   * Pulse is driven by the global animation clock to keep all orbs in sync.
   */
  private _drawIncomingMissile(ctx: CanvasRenderingContext2D, px: number, py: number, color: string, now: number): void {
    const pulse = 0.85 + Math.sin(now / 80) * 0.15
    ctx.save()
    // Outer halo
    ctx.shadowBlur = 28; ctx.shadowColor = color
    ctx.globalAlpha = 0.35
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(px, py, 11 * pulse, 0, Math.PI * 2); ctx.fill()
    // Core
    ctx.globalAlpha = 1
    ctx.shadowBlur = 14
    ctx.beginPath(); ctx.arc(px, py, 6 * pulse, 0, Math.PI * 2); ctx.fill()
    // Hot centre
    ctx.shadowBlur = 6; ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill()
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
