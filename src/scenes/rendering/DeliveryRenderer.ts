// ============================================================
// DeliveryRenderer — drives DeliveryVisual lifecycles from the per-frame
// ActiveDelivery snapshot. This is where the spawn/connect/destroy bookkeeping
// lives so BattleScene only has to call render() once per frame and never
// branches per visual (EnemyAttacks.md §5, TASK-60.5 AC #5).
//
// Per frame it diffs the live delivery ids against the previous frame:
//   - new id            → visual.spawn() then visual.update()
//   - surviving id      → visual.update()
//   - id that vanished  → connect: visual.onConnect() + brief post-connect flash
//                         (call cancelFlying() before a battle/level reset to
//                          suppress spurious flashes on cleared mid-flight deliveries)
// ============================================================

import type { ActiveDelivery } from '../../types'
import { DELIVERY_CONNECT_FLASH_MS } from '../../game/constants'
import type { DeliveryRenderContext, RenderDelivery } from './DeliveryVisual'
import type { DeliveryVisualRegistry } from './DeliveryVisualRegistry'

/** A delivery that has connected and is playing its lingering impact flash. */
interface ConnectFlash {
  snapshot: ActiveDelivery
  ageMs: number
}

export class DeliveryRenderer {
  /** Last-seen snapshot per live delivery id (in flight). */
  private readonly live = new Map<string, ActiveDelivery>()
  /** Active post-connect flashes, keyed by delivery id. */
  private readonly flashes = new Map<string, ConnectFlash>()

  constructor(private readonly registry: DeliveryVisualRegistry) {}

  /**
   * Render this frame's deliveries. `deliveries` is the pure game snapshot from
   * GameState.activeDeliveries; `rc` carries the scene, canvas ctx and timing.
   */
  render(deliveries: readonly ActiveDelivery[], rc: DeliveryRenderContext): void {
    const seen = new Set<string>()

    // 1. In-flight deliveries: spawn newcomers, update everyone.
    for (const d of deliveries) {
      const visual = this.registry.get(d.visualKey)
      seen.add(d.id)
      if (!visual) {
        this.live.set(d.id, d)
        continue
      }
      if (!this.live.has(d.id)) visual.spawn(d as RenderDelivery, rc)
      this.live.set(d.id, d)
      visual.update(d as RenderDelivery, rc)
    }

    // 2. Deliveries that disappeared since last frame → connect + flash.
    // Call cancelFlying() before any level/battle reset so this path is only
    // reached for deliveries that genuinely completed (not ones cleared mid-flight).
    for (const [id, snapshot] of this.live) {
      if (seen.has(id)) continue
      this.live.delete(id)
      const visual = this.registry.get(snapshot.visualKey)
      if (visual) visual.onConnect({ ...snapshot, progress: 1 } as RenderDelivery, rc)
      this.flashes.set(id, { snapshot: { ...snapshot, progress: 1 }, ageMs: 0 })
    }

    // 3. Advance + draw post-connect flashes.
    for (const [id, flash] of this.flashes) {
      flash.ageMs += rc.dtMs
      if (flash.ageMs >= DELIVERY_CONNECT_FLASH_MS) {
        // One final update at full age so visuals can self-clean, then forget it.
        const visual = this.registry.get(flash.snapshot.visualKey)
        if (visual) {
          visual.update(
            { ...flash.snapshot, connectAgeMs: DELIVERY_CONNECT_FLASH_MS } as RenderDelivery,
            rc,
          )
        }
        this.flashes.delete(id)
        continue
      }
      const visual = this.registry.get(flash.snapshot.visualKey)
      if (visual) {
        visual.update({ ...flash.snapshot, connectAgeMs: flash.ageMs } as RenderDelivery, rc)
      }
    }
  }

  /**
   * Silently drop all in-flight deliveries without triggering onConnect.
   * Call this immediately before any level/battle reset (restartLevel, nextLevel,
   * restartGame) so that deliveries cleared by DeliverySystem.reset() do not
   * produce spurious impact flashes on the incoming enemy.
   */
  cancelFlying(): void {
    this.live.clear()
  }

  /** Tear down every registered visual and forget all tracked state. */
  destroy(rc: DeliveryRenderContext): void {
    for (const visual of this.registry.all()) visual.destroy(rc)
    this.live.clear()
    this.flashes.clear()
  }
}
