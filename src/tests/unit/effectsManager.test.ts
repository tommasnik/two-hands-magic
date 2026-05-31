import { describe, it, expect, beforeEach } from 'vitest'
import { EffectsManager } from '../../scenes/effects/EffectsManager'
import type { GameEvent, GameStateResult, FightSnapshot, GlobalSnapshot } from '../../types'
import {
  LIGHTNING_BLAST_DURATION_CRIT_MS,
  LIGHTNING_BLAST_DURATION_HIT_MS,
  LIGHTNING_BLAST_DURATION_GRAZE_MS,
} from '../../game/constants'
// Register all skill modules so SkillRegistry is populated.
import '../../game/skills/index'

// ---------------------------------------------------------------------------
// Minimal GameStateResult stub for EffectsManager.process()
// Only elapsedMs is used by the manager — everything else can be stubbed.
// ---------------------------------------------------------------------------

function fakeState(elapsedMs: number): GameStateResult {
  return {
    fight: { elapsedMs } as unknown as FightSnapshot,
    game: {} as unknown as GlobalSnapshot,
  }
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
})
