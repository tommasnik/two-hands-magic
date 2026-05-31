import { describe, it, expect, beforeEach } from 'vitest'
import { EffectsManager } from '../../scenes/effects/EffectsManager'
import { getSkillColor } from '../../scenes/rendering/SkillRenderer'
import type { GameEvent, GameStateResult, FightSnapshot, GlobalSnapshot, ActiveSlotState } from '../../types'
import {
  LIGHTNING_BLAST_DURATION_CRIT_MS,
  LIGHTNING_BLAST_DURATION_HIT_MS,
  LIGHTNING_BLAST_DURATION_GRAZE_MS,
  SKILL_READY_FLASH_MS,
} from '../../game/constants'
// Register all skill modules so SkillRegistry is populated.
import '../../game/skills/index'

// ---------------------------------------------------------------------------
// Minimal GameStateResult stub for EffectsManager.process()
// elapsedMs drives expiry; activeSlots is read for SKILL_READY flashes.
// ---------------------------------------------------------------------------

function fakeState(elapsedMs: number, activeSlots: ActiveSlotState[] = []): GameStateResult {
  return {
    fight: { elapsedMs, activeSlots } as unknown as FightSnapshot,
    game: {} as unknown as GlobalSnapshot,
  }
}

function slot(id: string, skillType: ActiveSlotState['skillType'], side: 'left' | 'right', x: number, y: number): ActiveSlotState {
  return { id, x, y, side, skillType, rotationPeriodMs: 1000, active: false, dragOffsetX: 0, touchStartMs: 0 }
}

// ---------------------------------------------------------------------------
// EffectsManager
// ---------------------------------------------------------------------------

describe('EffectsManager', () => {
  let mgr: EffectsManager

  beforeEach(() => {
    mgr = new EffectsManager()
  })

  it('starts with no active effects', () => {
    expect(mgr.activeEffects).toHaveLength(0)
  })

  it('adds a lightning_discharge effect on ENEMY_HIT lightning_blast CRIT', () => {
    const state = fakeState(100)
    const events: GameEvent[] = [{ type: 'ENEMY_HIT', skillType: 'lightning_blast', result: 'CRIT', position: { x: 200, y: 300 }, damage: 12 }]
    mgr.process(events, state)
    expect(mgr.activeEffects).toHaveLength(1)
    expect(mgr.activeEffects[0].type).toBe('lightning_discharge')
    expect(mgr.activeEffects[0].hitResult).toBe('CRIT')
    expect(mgr.activeEffects[0].durationMs).toBe(LIGHTNING_BLAST_DURATION_CRIT_MS)
    expect(mgr.activeEffects[0].position).toEqual({ x: 200, y: 300 })
  })

  it('uses HIT duration for HIT result', () => {
    const state = fakeState(100)
    const events: GameEvent[] = [{ type: 'ENEMY_HIT', skillType: 'lightning_blast', result: 'HIT', position: null, damage: 10 }]
    mgr.process(events, state)
    expect(mgr.activeEffects[0].durationMs).toBe(LIGHTNING_BLAST_DURATION_HIT_MS)
  })

  it('uses GRAZE duration for GRAZE result', () => {
    const state = fakeState(100)
    const events: GameEvent[] = [{ type: 'ENEMY_HIT', skillType: 'lightning_blast', result: 'GRAZE', position: null, damage: 3 }]
    mgr.process(events, state)
    expect(mgr.activeEffects[0].durationMs).toBe(LIGHTNING_BLAST_DURATION_GRAZE_MS)
  })

  it('does not add effect for MISS (durationByResult MISS = 0)', () => {
    const state = fakeState(100)
    const events: GameEvent[] = [{ type: 'ENEMY_HIT', skillType: 'lightning_blast', result: 'MISS', position: null, damage: 0 }]
    mgr.process(events, state)
    expect(mgr.activeEffects).toHaveLength(0)
  })

  it('AC #5 — two ENEMY_HIT events in the same frame both create active effects', () => {
    const state = fakeState(100)
    const events: GameEvent[] = [
      { type: 'ENEMY_HIT', skillType: 'lightning_blast', result: 'CRIT', position: { x: 200, y: 300 }, damage: 12 },
      { type: 'ENEMY_HIT', skillType: 'lightning_blast', result: 'HIT',  position: { x: 210, y: 310 }, damage: 10 },
    ]
    mgr.process(events, state)
    expect(mgr.activeEffects).toHaveLength(2)
    expect(mgr.activeEffects[0].hitResult).toBe('CRIT')
    expect(mgr.activeEffects[1].hitResult).toBe('HIT')
    // Both effects have unique ids
    expect(mgr.activeEffects[0].id).not.toBe(mgr.activeEffects[1].id)
  })

  it('removes expired effects on the next process() call', () => {
    mgr.process([{ type: 'ENEMY_HIT', skillType: 'lightning_blast', result: 'GRAZE', position: null, damage: 3 }], fakeState(100))
    expect(mgr.activeEffects).toHaveLength(1)

    // Advance past expiry: startMs=100, durationMs=150 → expires at 250. Use 260.
    mgr.process([], fakeState(260))
    expect(mgr.activeEffects).toHaveLength(0)
  })

  it('does not add effect for a skill without hitEffect (slow_shot)', () => {
    const state = fakeState(100)
    const events: GameEvent[] = [{ type: 'ENEMY_HIT', skillType: 'slow_shot', result: 'CRIT', position: null, damage: 15 }]
    mgr.process(events, state)
    expect(mgr.activeEffects).toHaveLength(0)
  })

  it('spawns a skill_ready flash at the touch point on SKILL_READY', () => {
    const state = fakeState(500, [slot('left_0', 'fireball', 'left', 40, 780)])
    mgr.process([{ type: 'SKILL_READY', skillType: 'fireball' }], state)
    expect(mgr.activeEffects).toHaveLength(1)
    const fx = mgr.activeEffects[0]
    expect(fx.type).toBe('skill_ready')
    expect(fx.durationMs).toBe(SKILL_READY_FLASH_MS)
    expect(fx.position).toEqual({ x: 40, y: 780 })
    expect(fx.color).toBe(getSkillColor('fireball', 'left'))
    expect(fx.startMs).toBe(500)
  })

  it('spawns one flash per touch point hosting the ready skill (shared cooldown)', () => {
    const state = fakeState(0, [
      slot('left_0', 'fireball', 'left', 40, 780),
      slot('right_0', 'fireball', 'right', 350, 780),
      slot('left_1', 'white_shot', 'left', 80, 740),
    ])
    mgr.process([{ type: 'SKILL_READY', skillType: 'fireball' }], state)
    expect(mgr.activeEffects).toHaveLength(2)
    expect(mgr.activeEffects.every(e => e.type === 'skill_ready')).toBe(true)
  })

  it('spawns no flash when no touch point hosts the ready skill', () => {
    const state = fakeState(0, [slot('left_0', 'white_shot', 'left', 40, 780)])
    mgr.process([{ type: 'SKILL_READY', skillType: 'fireball' }], state)
    expect(mgr.activeEffects).toHaveLength(0)
  })
})
