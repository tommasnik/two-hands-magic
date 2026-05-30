// ============================================================
// OrbVisual — procedural flying-orb delivery visual.
// Replaces the legacy inline `_drawIncomingMissile` rendering that used to live
// in BattleScene. A pulsing glowing orb travels origin → target along the
// delivery's progress, then bursts on connect.
// ============================================================

import { DELIVERY_ORB_RADIUS_PX, DELIVERY_CONNECT_FLASH_MS } from '../../../game/constants'
import type { DeliveryVisual, DeliveryRenderContext, RenderDelivery } from '../DeliveryVisual'

/** Default orb tint. Unit: CSS color. */
const ORB_COLOR = '#ff5544'

export class OrbVisual implements DeliveryVisual {
  constructor(private readonly color: string = ORB_COLOR) {}

  spawn(): void {
    // Procedural — no allocated resources; drawn fresh each frame in update().
  }

  update(d: RenderDelivery, rc: DeliveryRenderContext): void {
    const { ctx, nowMs } = rc
    if (d.connectAgeMs !== undefined) {
      this._drawBurst(ctx, d.target.x, d.target.y, d.connectAgeMs)
      return
    }
    const px = d.origin.x + (d.target.x - d.origin.x) * d.progress
    const py = d.origin.y + (d.target.y - d.origin.y) * d.progress
    this._drawOrb(ctx, px, py, nowMs)
  }

  onConnect(): void {
    // Burst is drawn from update() via connectAgeMs; nothing one-shot needed.
  }

  destroy(): void {
    // No resources to release.
  }

  /** Pulsing glowing orb (ported from BattleScene._drawIncomingMissile). */
  private _drawOrb(ctx: CanvasRenderingContext2D, px: number, py: number, now: number): void {
    const pulse = 0.85 + Math.sin(now / 80) * 0.15
    const r = DELIVERY_ORB_RADIUS_PX
    ctx.save()
    // Outer halo
    ctx.shadowBlur = 28; ctx.shadowColor = this.color
    ctx.globalAlpha = 0.35
    ctx.fillStyle = this.color
    ctx.beginPath(); ctx.arc(px, py, r * pulse, 0, Math.PI * 2); ctx.fill()
    // Core
    ctx.globalAlpha = 1
    ctx.shadowBlur = 14
    ctx.beginPath(); ctx.arc(px, py, (r * 0.55) * pulse, 0, Math.PI * 2); ctx.fill()
    // Hot centre
    ctx.shadowBlur = 6; ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(px, py, r * 0.18, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  /** Expanding fading ring at the impact point during the post-connect window. */
  private _drawBurst(ctx: CanvasRenderingContext2D, px: number, py: number, ageMs: number): void {
    const t = Math.min(1, ageMs / DELIVERY_CONNECT_FLASH_MS)
    const radius = DELIVERY_ORB_RADIUS_PX * (1 + t * 2.2)
    ctx.save()
    ctx.globalAlpha = (1 - t) * 0.8
    ctx.lineWidth = 3
    ctx.shadowBlur = 18; ctx.shadowColor = this.color
    ctx.strokeStyle = this.color
    ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  }
}
