// ============================================================
// TeethVisual — procedural overlay delivery visual (GameBoy-style chomp).
// An overlay plays directly at the player: two rows of triangular teeth that
// start wide-open when the delivery spawns and snap shut as progress → 1, with
// a brief recoil flash on connect. No projectile travel — it lives at target.
// ============================================================

import {
  DELIVERY_TEETH_HALF_WIDTH_PX,
  DELIVERY_CONNECT_FLASH_MS,
} from '../../../game/constants'
import type { DeliveryVisual, DeliveryRenderContext, RenderDelivery } from '../DeliveryVisual'

/** Teeth fill color. Unit: CSS color. */
const TEETH_COLOR = '#e8e8d0'
/** Maximum jaw gap (each row offset from the centre line at progress 0). Unit: px. */
const MAX_JAW_GAP_PX = 34
/** Number of teeth per row. */
const TOOTH_COUNT = 5
/** Tooth height. Unit: px. */
const TOOTH_HEIGHT_PX = 22

export class TeethVisual implements DeliveryVisual {
  spawn(): void {
    // Procedural — drawn fresh each frame in update().
  }

  update(d: RenderDelivery, rc: DeliveryRenderContext): void {
    const { ctx } = rc
    // During the connect flash the jaws are shut with a small fading recoil;
    // otherwise the gap closes as the overlay's progress approaches 1.
    let gap: number
    let alpha: number
    if (d.connectAgeMs !== undefined) {
      const t = Math.min(1, d.connectAgeMs / DELIVERY_CONNECT_FLASH_MS)
      gap = -3 * (1 - t) // slight overbite recoil that eases back to closed
      alpha = 1 - t
    } else {
      gap = MAX_JAW_GAP_PX * (1 - d.progress)
      alpha = 1
    }
    this._drawJaws(ctx, d.target.x, d.target.y, gap, alpha)
  }

  onConnect(): void {
    // Closing + recoil handled in update() via connectAgeMs.
  }

  destroy(): void {
    // No resources to release.
  }

  /** Draws upper + lower tooth rows separated by `gap` px, centred at (cx, cy). */
  private _drawJaws(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    gap: number,
    alpha: number,
  ): void {
    const halfW = DELIVERY_TEETH_HALF_WIDTH_PX
    const step = (halfW * 2) / TOOTH_COUNT
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = TEETH_COLOR
    ctx.shadowBlur = 8
    ctx.shadowColor = 'rgba(0,0,0,0.5)'

    // Upper row — teeth point down toward the centre line.
    const upperBase = cy - gap
    ctx.beginPath()
    for (let i = 0; i < TOOTH_COUNT; i++) {
      const x0 = cx - halfW + i * step
      ctx.moveTo(x0, upperBase - TOOTH_HEIGHT_PX)
      ctx.lineTo(x0 + step, upperBase - TOOTH_HEIGHT_PX)
      ctx.lineTo(x0 + step / 2, upperBase)
      ctx.closePath()
    }
    ctx.fill()

    // Lower row — teeth point up toward the centre line.
    const lowerBase = cy + gap
    ctx.beginPath()
    for (let i = 0; i < TOOTH_COUNT; i++) {
      const x0 = cx - halfW + i * step
      ctx.moveTo(x0, lowerBase + TOOTH_HEIGHT_PX)
      ctx.lineTo(x0 + step, lowerBase + TOOTH_HEIGHT_PX)
      ctx.lineTo(x0 + step / 2, lowerBase)
      ctx.closePath()
    }
    ctx.fill()
    ctx.restore()
  }
}
