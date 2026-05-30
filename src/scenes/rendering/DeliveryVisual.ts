// ============================================================
// DeliveryVisual — render-layer contract for enemy attack deliveries.
// Phaser-side. Lives OUTSIDE BattleScene (EnemyAttacks.md §5).
//
// A DeliveryVisual turns the pure-data ActiveDelivery snapshot (visualKey +
// geometry + progress, produced by DeliverySystem.getActive()) into something
// on-screen. Implementations may be procedural (canvas primitives) or
// spritesheet/Phaser-GameObject based — BattleScene never branches on the kind.
// ============================================================

import type Phaser from 'phaser'
import type { ActiveDelivery } from '../../types'

/**
 * Per-frame render context handed to every DeliveryVisual method.
 * Carries both a Phaser scene (for spritesheet visuals that create GameObjects)
 * and the raw 2D canvas context (for procedural visuals drawn in the scene's
 * manual RENDER pass), so a single contract covers both styles.
 */
export interface DeliveryRenderContext {
  /** Owning scene — spritesheet visuals use this to add/destroy GameObjects. */
  scene: Phaser.Scene
  /** Canvas 2D context of the scene's manual render pass. */
  ctx: CanvasRenderingContext2D
  /** Global animation clock (performance.now()). Unit: ms. */
  nowMs: number
  /** Time since the previous render frame. Unit: ms. */
  dtMs: number
}

/**
 * An ActiveDelivery enriched with render-only timing. The game layer never sees
 * this — it is synthesised by DeliveryRenderer so visuals can keep drawing a
 * brief impact/chomp effect after the delivery has already connected and left
 * the game-state snapshot list.
 */
export interface RenderDelivery extends ActiveDelivery {
  /**
   * ms elapsed since this delivery connected. Present ONLY during the
   * post-connect flash window; undefined while the delivery is still in flight.
   */
  connectAgeMs?: number
}

/**
 * Visual strategy for one visualKey. A single instance is shared across all
 * concurrent deliveries that carry the same visualKey, so any per-delivery
 * resources must be keyed by `delivery.id` internally.
 */
export interface DeliveryVisual {
  /** Called once, the first frame a delivery id is seen. Allocate resources. */
  spawn(d: RenderDelivery, rc: DeliveryRenderContext): void
  /**
   * Called every render frame while the delivery is in flight (progress < 1).
   * Draw the travelling visual. Also called during the post-connect flash with
   * `d.connectAgeMs` set and `d.progress === 1` to draw the lingering impact.
   */
  update(d: RenderDelivery, rc: DeliveryRenderContext): void
  /** Called once at the connect moment (progress reached 1). Fire the 'chomp'/impact. */
  onConnect(d: RenderDelivery, rc: DeliveryRenderContext): void
  /** Release any pooled/allocated resources. Called on scene shutdown. */
  destroy(rc: DeliveryRenderContext): void
}
