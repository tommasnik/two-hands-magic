// ============================================================
// DeliveryVisualRegistry — maps a delivery's visualKey → DeliveryVisual instance.
// The single point that knows which visual draws which key. Adding a new visual
// is one new file in visuals/ + one register() call here; BattleScene is untouched
// (EnemyAttacks.md §5, TASK-60.5 AC #6).
// ============================================================

import type { DeliveryVisual } from './DeliveryVisual'
import { OrbVisual } from './visuals/OrbVisual'
import { TeethVisual } from './visuals/TeethVisual'

export class DeliveryVisualRegistry {
  private readonly map = new Map<string, DeliveryVisual>()

  /** Register (or override) the visual used for a visualKey. */
  register(visualKey: string, visual: DeliveryVisual): this {
    this.map.set(visualKey, visual)
    return this
  }

  /** Look up the visual for a visualKey, or undefined if none is registered. */
  get(visualKey: string): DeliveryVisual | undefined {
    return this.map.get(visualKey)
  }

  /** All registered visuals (used for scene-shutdown teardown). */
  all(): DeliveryVisual[] {
    return [...this.map.values()]
  }
}

/**
 * Default registry wiring the visualKeys used by the enemy attack graphs.
 * `orb` and `teeth` are the two built-in procedural visuals; richer visuals
 * (e.g. SpritesheetDeliveryVisual) register the same way under their own key.
 */
export function createDefaultDeliveryRegistry(): DeliveryVisualRegistry {
  return new DeliveryVisualRegistry()
    .register('orb', new OrbVisual())
    .register('teeth', new TeethVisual())
}
