// ============================================================
// EffectsManager — renderer-layer owner of ephemeral visual effects.
//
// Consumes GameEvent[] from GSM.update() and translates them into
// ActiveEffect entries. Lives entirely in the scene/Phaser layer —
// game state (FightState, FightSnapshot) is effect-free.
// ============================================================

import type { GameEvent, GameStateResult, HitResult, SkillEffectType } from '../../types'
import { SkillRegistry } from '../../game/skills/registry'
import { SKILL_READY_FLASH_MS, LIGHTNING_ARC_VISUAL_DURATION_MS } from '../../game/constants'
import { getSkillColor } from '../rendering/SkillRenderer'

export interface ActiveEffect {
  /** Unique monotonic id — used by SkillRenderer to key per-effect visual state. */
  id: number
  type: SkillEffectType
  /** Absolute elapsedMs when the effect was created. */
  startMs: number
  /** How long the effect lasts. Unit: ms. */
  durationMs: number
  /** Screen-space position of the hit / touch point, or null for instant skills. */
  position: { x: number; y: number } | null
  /** Hit result for hit-driven effects. Absent for non-hit effects (e.g. skill_ready). */
  hitResult?: HitResult
  /** CSS colour for effects that render in the skill's colour (e.g. skill_ready ring). */
  color?: string
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

    for (const event of events) {
      if (event.type === 'ENEMY_HIT') {
        // One ActiveEffect per ENEMY_HIT that has a hitEffect descriptor.
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
      } else if (event.type === 'DOT_TICK' && event.kind === 'lightning_arc') {
        this._activeEffects.push({
          id: this._nextId++,
          type: 'lightning_arc',
          startMs: elapsedMs,
          durationMs: LIGHTNING_ARC_VISUAL_DURATION_MS,
          position: event.position,
        })
      } else if (event.type === 'SKILL_READY') {
        // Spawn a ready flash on every touch point that hosts this skill.
        // (Cooldown is shared per SkillType, so both hands flash together.)
        for (const slot of state.fight.activeSlots) {
          if (slot.skillType !== event.skillType) continue
          this._activeEffects.push({
            id: this._nextId++,
            type: 'skill_ready',
            startMs: elapsedMs,
            durationMs: SKILL_READY_FLASH_MS,
            position: { x: slot.x, y: slot.y },
            color: getSkillColor(slot.skillType, slot.side),
          })
        }
      }
    }
  }

  get activeEffects(): readonly ActiveEffect[] {
    return this._activeEffects
  }
}
