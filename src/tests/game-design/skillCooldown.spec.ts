// ============================================================
// Game Design Spec — Skill Cooldowns
//
// Cooldown gates how often a skill can be cast (measured from touch-up).
// It is shared per SkillType (the same skill on both hands shares one timer).
//
//   white_shot     : WHITE_SHOT_COOLDOWN_MS      (0 — spammable rapid-fire)
//   lightning_blast: LIGHTNING_BLAST_COOLDOWN_MS  (short — instant hit)
//   fireball       : FIREBALL_COOLDOWN_MS         (medium — heavy burst)
//   ice_crystal    : ICE_CRYSTAL_COOLDOWN_MS      (= max freeze duration)
//
// Difficulty intent verified here:
//   - Power user: cannot exceed one cast per cooldown window (burst is capped).
//   - Casual player: a zero-cooldown skill is never gated — every cast lands.
//   - Edge case: ice_crystal recharges exactly as its longest freeze ends, so a
//     perfect player can chain freezes back-to-back but never overlap them.
//
// Every number is derived from constants — no hardcoded values in assertions.
// ============================================================

import { describe, it, expect } from 'vitest'
import { GameStateMachine } from '../../game/GameStateMachine'
import { SkillRegistry } from '../../game/skills/registry'
import '../../game/skills/index'
import {
  MAX_DELTA_MS,
  WHITE_SHOT_COOLDOWN_MS,
  FIREBALL_COOLDOWN_MS,
  LIGHTNING_BLAST_COOLDOWN_MS,
  ICE_CRYSTAL_COOLDOWN_MS,
  ICE_CRYSTAL_FREEZE_CRIT_MS,
  ICE_CRYSTAL_FREEZE_HIT_MS,
} from '../../game/constants'
import type { SkillType } from '../../types'

function getFlat(machine: GameStateMachine) {
  const { fight, game } = machine.getState()
  return { ...fight, ...game }
}

function fireCount(machine: GameStateMachine, skillType: SkillType): number {
  return getFlat(machine).fightStats.skills[skillType]?.fireCount ?? 0
}

/** Fire the skill on the given slot (touch-down then touch-up, 1 ms each). */
function fireSkill(machine: GameStateMachine, slotId: string): void {
  const p = machine.getTouchPointPositions().find(s => s.id === slotId)
  if (!p) throw new Error(`no slot ${slotId}`)
  const x = Math.round(p.x), y = Math.round(p.y)
  machine.queueInput({ pointerId: 0, action: 'down', x, y, timestamp: 0 })
  machine.update(1, [])
  machine.queueInput({ pointerId: 0, action: 'up', x, y, timestamp: 0 })
  machine.update(1, [])
}

/** Advance the clock by ~ms (capped per tick). */
function wait(machine: GameStateMachine, ms: number): void {
  let remaining = ms
  while (remaining > 0) {
    const step = Math.min(remaining, MAX_DELTA_MS)
    machine.update(step, [])
    remaining -= step
  }
}

// ============================================================
// Cooldown values match the design intent
// ============================================================

describe('Skill cooldowns — design values', () => {
  it('each skill module exposes its configured cooldown', () => {
    expect(SkillRegistry.get('white_shot').cooldownMs).toBe(WHITE_SHOT_COOLDOWN_MS)
    expect(SkillRegistry.get('fireball').cooldownMs).toBe(FIREBALL_COOLDOWN_MS)
    expect(SkillRegistry.get('lightning_blast').cooldownMs).toBe(LIGHTNING_BLAST_COOLDOWN_MS)
    expect(SkillRegistry.get('ice_crystal').cooldownMs).toBe(ICE_CRYSTAL_COOLDOWN_MS)
  })

  it('white_shot is the only spammable skill (zero cooldown)', () => {
    expect(WHITE_SHOT_COOLDOWN_MS).toBe(0)
    expect(LIGHTNING_BLAST_COOLDOWN_MS).toBeGreaterThan(WHITE_SHOT_COOLDOWN_MS)
    expect(FIREBALL_COOLDOWN_MS).toBeGreaterThan(WHITE_SHOT_COOLDOWN_MS)
    expect(ICE_CRYSTAL_COOLDOWN_MS).toBeGreaterThan(WHITE_SHOT_COOLDOWN_MS)
  })

  it('ice_crystal recharges exactly as its longest freeze ends', () => {
    // Re-freeze becomes available the instant the strongest (CRIT) freeze could expire.
    expect(ICE_CRYSTAL_COOLDOWN_MS).toBe(ICE_CRYSTAL_FREEZE_CRIT_MS)
    expect(ICE_CRYSTAL_FREEZE_CRIT_MS).toBeGreaterThanOrEqual(ICE_CRYSTAL_FREEZE_HIT_MS)
  })
})

// ============================================================
// Power user — burst is capped at one cast per cooldown window
// ============================================================

describe('Skill cooldowns — power user', () => {
  it('cannot fire fireball more than once within a single cooldown window', () => {
    const machine = new GameStateMachine([
      { skillType: 'fireball', side: 'left', slotIndex: 0 },
      { skillType: 'white_shot', side: 'right', slotIndex: 0 },
    ])
    machine.startBattle()

    fireSkill(machine, 'left_0') // cast 1 — starts the cooldown
    // Hammer the button repeatedly, staying well inside FIREBALL_COOLDOWN_MS.
    const attempts = 4
    for (let i = 0; i < attempts; i++) {
      wait(machine, FIREBALL_COOLDOWN_MS / (attempts * 2))
      fireSkill(machine, 'left_0')
    }
    expect(fireCount(machine, 'fireball')).toBe(1)
  })

  it('firing once per cooldown lets fireball cast exactly N times across N windows', () => {
    const machine = new GameStateMachine([
      { skillType: 'fireball', side: 'left', slotIndex: 0 },
      { skillType: 'white_shot', side: 'right', slotIndex: 0 },
    ])
    machine.startBattle()

    const windows = 3
    for (let i = 0; i < windows; i++) {
      fireSkill(machine, 'left_0')
      wait(machine, FIREBALL_COOLDOWN_MS + MAX_DELTA_MS) // let the cooldown elapse
    }
    expect(fireCount(machine, 'fireball')).toBe(windows)
  })

  it('shares the cooldown across both hands holding the same skill', () => {
    const machine = new GameStateMachine([
      { skillType: 'fireball', side: 'left', slotIndex: 0 },
      { skillType: 'fireball', side: 'right', slotIndex: 0 },
    ])
    machine.startBattle()

    fireSkill(machine, 'left_0')
    wait(machine, FIREBALL_COOLDOWN_MS / 4)
    fireSkill(machine, 'right_0') // blocked by the shared timer
    expect(fireCount(machine, 'fireball')).toBe(1)
  })
})

// ============================================================
// Casual player — a zero-cooldown skill is never gated
// ============================================================

describe('Skill cooldowns — casual player', () => {
  it('white_shot registers every rapid cast (no cooldown gate)', () => {
    const machine = new GameStateMachine([
      { skillType: 'white_shot', side: 'left', slotIndex: 0 },
      { skillType: 'fireball', side: 'right', slotIndex: 0 },
    ])
    machine.startBattle()

    const casts = 5
    for (let i = 0; i < casts; i++) {
      fireSkill(machine, 'left_0')
      wait(machine, MAX_DELTA_MS)
    }
    expect(fireCount(machine, 'white_shot')).toBe(casts)
  })
})
