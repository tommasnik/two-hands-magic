import Phaser from 'phaser'
import {
  ENEMY_HEAD_RADIUS_PX,
  ENEMY_TORSO_HEIGHT_PX,
  HIT_ZONE_OVERLAY_ENABLED,
  HIT_ZONE_OVERLAY_OPACITY,
  FLOAT_TEXT_FONT_CRIT,
  FLOAT_TEXT_FONT_HIT,
  FLOAT_TEXT_FONT_GRAZE,
  getHitResultColor,
} from '../../game/constants'
import { characterRegistry } from '../../game/CharacterRegistry'
import type { GameState, HitResult, HitZoneName } from '../../types'

interface Spark {
  x: number; y: number
  vx: number; vy: number
  life: number; age: number
  color: string
}

interface FloatText {
  x: number; y: number
  text: string; color: string
  fontSize: number
  age: number; life: number
}

/**
 * Renders the enemy sprite, stun indicator, hit sparks, and floating damage numbers.
 * Owns visual-only state: sparks and float texts spawned on hit events.
 */
export class EnemyRenderer {
  private sparks: Spark[] = []
  private floatTexts: FloatText[] = []
  private lastHitTimestamp: number | null = null

  /**
   * Advance particle/float-text animations.
   * Must be called each frame before render().
   */
  update(dtS: number, state: GameState): void {
    // Detect new hit events → spawn visual effects
    if (state.lastHit && state.lastHit.timestamp !== this.lastHitTimestamp) {
      this.lastHitTimestamp = state.lastHit.timestamp
      this._spawnHitEffects(state.lastHit.result, state.lastHit.hitZone, state)
    }

    // Advance sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]
      s.age += dtS
      s.x += s.vx * dtS
      s.y += s.vy * dtS
      s.vx *= 0.94
      s.vy *= 0.94
      if (s.age > s.life) this.sparks.splice(i, 1)
    }

    // Advance float texts
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const f = this.floatTexts[i]
      f.age += dtS
      f.y -= 40 * dtS
      if (f.age > f.life) this.floatTexts.splice(i, 1)
    }
  }

  /** Render enemy sprite, hit zone overlay, stun indicator, sparks, and float texts. */
  render(ctx: CanvasRenderingContext2D, textures: Phaser.Textures.TextureManager, state: GameState, now: number): void {
    this._drawEnemySprite(ctx, textures, state)
    this._drawStunIndicator(ctx, state, now)
    this._drawSparks(ctx)
    this._drawFloatTexts(ctx)
  }

  // -----------------------------------------------------------------------
  // Spawn helpers
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
  // Draw helpers
  // -----------------------------------------------------------------------

  /**
   * Generic sprite renderer — renders the current enemy animation frame from GameState.
   * Uses spriteKey + animKey + frameIndex to look up the Phaser texture.
   * No per-enemy branching — all sprite-based enemies use the same code path.
   */
  private _drawEnemySprite(ctx: CanvasRenderingContext2D, textures: Phaser.Textures.TextureManager, state: GameState): void {
    const spriteKey = state.enemySpriteKey
    const animKey = state.enemyAnimKey
    const frameIndex = state.enemyFrameIndex
    const textureKey = `${spriteKey}_${animKey}_${frameIndex}`

    let textureExists = false
    try {
      textureExists = textures.exists(textureKey)
    } catch {
      textureExists = false
    }

    if (!textureExists) return

    const frame = textures.getFrame(textureKey)
    if (!frame?.source.image) return

    const { image } = frame.source
    if (!(image instanceof HTMLImageElement)) return
    const img = image
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

    if (HIT_ZONE_OVERLAY_ENABLED) {
      const maskKey = `${spriteKey}_mask_${animKey}_${frameIndex}`
      try {
        if (textures.exists(maskKey)) {
          const maskFrame = textures.getFrame(maskKey)
          if (maskFrame?.source.image instanceof HTMLImageElement) {
            ctx.save()
            ctx.globalAlpha = HIT_ZONE_OVERLAY_OPACITY
            ctx.drawImage(maskFrame.source.image, dx, dy, drawW, drawH)
            ctx.restore()
          }
        }
      } catch { /* mask texture unavailable — skip silently */ }
    }
  }

  private _drawStunIndicator(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    const remainingMs = state.enemy.stunnedUntilMs - state.elapsedMs
    if (remainingMs <= 0) return
    const ex = state.enemy.x
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
