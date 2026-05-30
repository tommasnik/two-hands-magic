import {
  TOUCHPOINT_RADIUS,
  GAME_WIDTH,
  GAME_HEIGHT,
  FLOAT_TEXT_FONT_HIT,
  PLAYER_HIT_FLASH_DURATION_MS,
  PLAYER_HIT_FLOAT_COLOR,
  LASER_ORIGIN_Y,
} from '../../game/constants'
import { computeReticle } from '../../game/systems/AimSystem'
import { getXpProgress } from '../../game/upgrades'
import { getSkillColor } from './SkillRenderer'
import type { GameState, ActiveSlotState } from '../../types'
import type { ActiveTouchPointPos } from '../../game/entities/touchPoints'
import type { TouchPoint } from '../../types'

interface FloatText {
  x: number; y: number
  text: string; color: string
  fontSize: number
  age: number; life: number
}

/**
 * Manages all HUD rendering:
 *   - DOM elements: level label, enemy name, HP bars, XP bar
 *   - Canvas: touch-point slot rings, laser beams, aim reticles
 *   - Player-hit visual: red flash overlay + floating damage number
 */
export class HUDRenderer {
  // DOM refs wired in init()
  private hudLevel: HTMLElement | null = null
  private hudEnemyName: HTMLElement | null = null
  private hudHpFill: HTMLElement | null = null
  private playerHpFill: HTMLElement | null = null
  private playerHitFlash: HTMLElement | null = null
  private xpLabel: HTMLElement | null = null
  private xpFill: HTMLElement | null = null

  // Player-hit visual state
  private _lastPlayerHitTimestamp: number | null = null
  private _hitFlashRemainingMs = 0

  // Floating damage numbers for player hits
  private floatTexts: FloatText[] = []

  /** Wire DOM refs — call once from BattleScene.create(). */
  init(): void {
    this.hudLevel      = document.getElementById('hud-level')
    this.hudEnemyName  = document.getElementById('hud-enemy-name')
    this.hudHpFill     = document.getElementById('hud-hp-fill')
    this.playerHpFill  = document.getElementById('player-hp-fill')
    this.playerHitFlash = document.getElementById('player-hit-flash')
    this.xpLabel       = document.getElementById('xp-label')
    this.xpFill        = document.getElementById('xp-fill')
  }

  /**
   * Advance player-hit flash timer and float texts.
   * Must be called each frame before render().
   */
  update(dtMs: number, state: GameState): void {
    // Detect new player-hit events → trigger red flash + floating damage number
    if (state.lastPlayerHit && state.lastPlayerHit.timestamp !== this._lastPlayerHitTimestamp) {
      this._lastPlayerHitTimestamp = state.lastPlayerHit.timestamp
      this._spawnPlayerHitEffects(state.lastPlayerHit.damage)
    }

    // Advance / clear flash overlay
    if (this._hitFlashRemainingMs > 0) {
      this._hitFlashRemainingMs -= dtMs
      if (this._hitFlashRemainingMs <= 0) {
        this._hitFlashRemainingMs = 0
        if (this.playerHitFlash) this.playerHitFlash.classList.remove('active')
      }
    }

    // Advance float texts
    const dtS = dtMs / 1000
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const f = this.floatTexts[i]
      f.age += dtS
      f.y -= 40 * dtS
      if (f.age > f.life) this.floatTexts.splice(i, 1)
    }

    // Update DOM HUD — read from state, no game logic
    this._updateDomHud(state)
  }

  /** Draw canvas HUD elements: slot rings, lasers, aim points, float texts. */
  render(ctx: CanvasRenderingContext2D, state: GameState, _dynamicLayout: ActiveTouchPointPos[], now: number): void {
    this._drawActiveSlots(ctx, state.activeSlots, now)

    for (const slot of state.activeSlots) {
      if (slot.active) {
        const reticle = computeReticle(
          { rotationPeriodMs: slot.rotationPeriodMs } as TouchPoint,
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

    this._drawFloatTexts(ctx)
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

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

  private _updateDomHud(state: GameState): void {
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
  }

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

  private _slotColor(slot: { side: 'left' | 'right'; skillType: string }): string {
    return getSkillColor(slot.skillType, slot.side)
  }

  private _drawActiveSlots(ctx: CanvasRenderingContext2D, slots: ActiveSlotState[], now: number): void {
    for (const slot of slots) {
      const isActive = slot.active
      const pulse = 0.85 + 0.15 * Math.sin(now / 380)
      const color = this._slotColor(slot)

      ctx.save()
      ctx.shadowBlur = isActive ? 30 : 18
      ctx.shadowColor = color
      ctx.strokeStyle = color
      ctx.globalAlpha = isActive ? 1 : 0.7 * pulse
      ctx.lineWidth = isActive ? 3 : 2
      ctx.beginPath(); ctx.arc(slot.x, slot.y, TOUCHPOINT_RADIUS, 0, Math.PI * 2); ctx.stroke()
      ctx.shadowBlur = 8
      ctx.globalAlpha = isActive ? 0.35 : 0.14
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(slot.x, slot.y, TOUCHPOINT_RADIUS - 3, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1; ctx.shadowBlur = 12; ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(slot.x, slot.y, 3.2, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }

  private _drawLaser(ctx: CanvasRenderingContext2D, tx: number, ty: number, dir: [number, number], color: string): void {
    const len = Math.hypot(GAME_WIDTH, GAME_HEIGHT) * 1.4
    const ex = tx + dir[0] * len
    const ey = ty + dir[1] * len
    ctx.save()
    ctx.lineCap = 'round'
    ctx.shadowBlur = 28; ctx.shadowColor = color
    ctx.strokeStyle = color; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(ex, ey); ctx.stroke()
    ctx.shadowBlur = 12
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(ex, ey); ctx.stroke()
    ctx.shadowBlur = 28; ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(tx, ty, 15, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath(); ctx.arc(tx, ty, 4.5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  private _drawAimPoint(ctx: CanvasRenderingContext2D, ax: number, ay: number, color: string, now: number): void {
    const pulse = 0.7 + 0.3 * Math.sin(now / 100)
    ctx.save()
    ctx.shadowBlur = 30; ctx.shadowColor = color
    ctx.strokeStyle = color; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(ax, ay, 14 * pulse, 0, Math.PI * 2); ctx.stroke()
    ctx.shadowBlur = 20; ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 12; ctx.strokeStyle = color; ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(ax - 18, ay); ctx.lineTo(ax - 8, ay)
    ctx.moveTo(ax + 8,  ay); ctx.lineTo(ax + 18, ay)
    ctx.moveTo(ax, ay - 18); ctx.lineTo(ax, ay - 8)
    ctx.moveTo(ax, ay + 8);  ctx.lineTo(ax, ay + 18)
    ctx.stroke()
    ctx.restore()
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
