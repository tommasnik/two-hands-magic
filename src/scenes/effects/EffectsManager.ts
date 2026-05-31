// ============================================================
// EffectsManager — renderer-layer owner of ephemeral visual effects.
//
// Consumes GameEvent[] from GSM.update() and translates them into
// ActiveEffect entries. Lives entirely in the scene/Phaser layer —
// game state (FightState, FightSnapshot) is effect-free.
// ============================================================

import type { GameEvent, GameStateResult, HitResult, SkillEffectType } from '../../types'
import { SkillRegistry } from '../../game/skills/registry'

export interface ActiveEffect {
  /** Unique monotonic id — used by SkillRenderer to key per-effect visual state. */
  id: number
  type: SkillEffectType
  /** Absolute elapsedMs when the effect was created. */
  startMs: number
  /** How long the effect lasts. Unit: ms. */
  durationMs: number
  /** Screen-space position of the hit, or null for instant/positional skills. */
  position: { x: number; y: number } | null
  hitResult: HitResult
}

export class EffectsManager {
  private _activeEffects: ActiveEffect[] = []
  private _nextId = 0

  /**
   * Call once per frame — after GSM.update() and GSM.getState().
   * Prunes expired effects and materialises new ActiveEffects from events.
   */
  process(events: GameEvent[], state: GameStateResult): void {
    const elapsedMs = state.fight.elapsedMs

    // Remove effects whose window has passed.
    this._activeEffects = this._activeEffects.filter(e => elapsedMs < e.startMs + e.durationMs)

    // Add one ActiveEffect per ENEMY_HIT event that has a hitEffect descriptor.
    for (const event of events) {
      if (event.type !== 'ENEMY_HIT') continue
      const module = SkillRegistry.has(event.skillType) ? SkillRegistry.get(event.skillType) : undefined
      if (!module?.hitEffect) continue
      const durationMs = module.hitEffect.durationByResult[event.result]
      if (durationMs <= 0) continue
      this._activeEffects.push({
        id: this._nextId++,
        type: module.hitEffect.type,
        startMs: elapsedMs,
        durationMs,
        position: event.position,
        hitResult: event.result,
      })
    }
  }

  get activeEffects(): readonly ActiveEffect[] {
    return this._activeEffects
  }
}
