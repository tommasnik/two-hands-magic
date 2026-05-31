// ============================================================
// CommandProcessor — translates InputManager GameCommands into
// projectile fires / lightning hits / slot-state mutations.
// No Phaser dependency.
// ============================================================

import type { ActiveTouchPointPos } from '../entities/touchPoints'
import type { GameCommand } from './InputManager'
import type { ProjectileSystem } from './ProjectileSystem'
import type { CombatSystem } from './CombatSystem'
import { initSkillFightStats } from './CombatSystem'
import type { Enemy } from '../entities/Enemy'
import { computeReticle } from './AimSystem'
import { SkillRegistry } from '../skills/registry'
import type { HitResult, SkillType, GlobalUpgradeState } from '../../types'

export interface CommandProcessorContext {
  layout: ActiveTouchPointPos[]
  slotStates: Record<string, { active: boolean; dragOffsetX: number; touchStartMs: number }>
  lastTouchUpMs: Record<string, number | null>
  /**
   * Per-SkillType cooldown end times (absolute elapsedMs). A skill is on cooldown
   * while its entry > elapsedMs. Mutated in-place: set on a successful cast.
   * Owned by GameStateMachine (same object reference).
   */
  skillCooldownUntil: Partial<Record<SkillType, number>>
  elapsedMs: number
  globalUpgrades: GlobalUpgradeState
  combat: CombatSystem
  projectileSystem: ProjectileSystem
  enemy: Enemy
  applyHit: (
    result: HitResult,
    skillType: SkillType,
    position: { x: number; y: number } | null,
    chainBonus: number,
    projectileRadius: number,
    side: 'left' | 'right',
  ) => void
}

/** True while the given skill is still cooling down at the current elapsed time. */
function isOnCooldown(ctx: CommandProcessorContext, skillType: SkillType): boolean {
  const until = ctx.skillCooldownUntil[skillType]
  return until !== undefined && until > ctx.elapsedMs
}

/**
 * Process a batch of InputCommands:
 *  - 'aim'  → update slot active/drag state, record touchGap
 *  - 'fire' → compute reticle, fire projectile or apply lightning hit
 *
 * Mutates slotStates and lastTouchUpMs in-place (same objects owned by GSM).
 */
export function processCommands(
  commands: GameCommand[],
  ctx: CommandProcessorContext,
): void {
  for (const cmd of commands) {
    // Cooldown gate: a skill that is still cooling down cannot be aimed or fired.
    // The touch point is inert (dimmed in the HUD) until the cooldown expires.
    const cmdSlot = ctx.layout.find((s) => s.id === cmd.touchPointId)
    if (cmdSlot && isOnCooldown(ctx, cmdSlot.skillType)) continue

    if (cmd.type === 'aim') {
      const ts = ctx.slotStates[cmd.touchPointId]
      if (ts) {
        if (!ts.active) {
          const slot = ctx.layout.find((s) => s.id === cmd.touchPointId)
          if (slot) {
            const lastUp = ctx.lastTouchUpMs[cmd.touchPointId]
            if (lastUp !== null && lastUp !== undefined) {
              let touchStats = ctx.combat.fightStats.skills[slot.skillType]
              if (!touchStats) {
                touchStats = initSkillFightStats(slot.skillType)
                ctx.combat.fightStats.skills[slot.skillType] = touchStats
              }
              touchStats.touchGaps.push(ctx.elapsedMs - lastUp)
            }
          }
        }
        if (!ts.active) ts.touchStartMs = ctx.elapsedMs
        ts.active = true
        ts.dragOffsetX = cmd.dragOffsetX
      }
    } else if (cmd.type === 'fire') {
      const ts = ctx.slotStates[cmd.touchPointId]
      if (ts) { ts.active = false; ts.dragOffsetX = 0 }
      const slot = ctx.layout.find((s) => s.id === cmd.touchPointId)
      if (slot && ts) {
        ctx.lastTouchUpMs[cmd.touchPointId] = ctx.elapsedMs
        let fireStats = ctx.combat.fightStats.skills[slot.skillType]
        if (!fireStats) {
          fireStats = initSkillFightStats(slot.skillType)
          ctx.combat.fightStats.skills[slot.skillType] = fireStats
        }
        fireStats.fireCount++
        const touchStartMs = ts.touchStartMs
        const effectivePeriodMs = slot.rotationPeriodMs * ctx.globalUpgrades.castTimeMultiplier
        const reticle = computeReticle(
          { rotationPeriodMs: effectivePeriodMs },
          cmd.dragOffsetX,
          ctx.elapsedMs - touchStartMs,
        )
        const chainBonus = ctx.combat.computeChainBonus(slot.id, ctx.elapsedMs, ctx.globalUpgrades)
        ctx.combat.lastCastBySlot[slot.id] = ctx.elapsedMs
        const skillType = slot.skillType
        // Start the cooldown from this cast (touch-up). Shared per SkillType.
        const cooldownMs = SkillRegistry.get(skillType).cooldownMs
        if (cooldownMs > 0) ctx.skillCooldownUntil[skillType] = ctx.elapsedMs + cooldownMs
        if (skillType === 'lightning_blast') {
          const hitResult = ctx.enemy.getHitResult(
            { x: reticle.x, y: reticle.y },
            ctx.globalUpgrades.critZoneTolerance,
          )
          ctx.applyHit(hitResult, 'lightning_blast', { x: reticle.x, y: reticle.y }, chainBonus, 0, slot.side)
        } else {
          ctx.projectileSystem.fire(
            { x: slot.x, y: slot.y },
            { x: reticle.x, y: reticle.y },
            skillType,
            chainBonus,
            {
              projectileSpeedMultiplier: ctx.globalUpgrades.projectileSpeedMultiplier,
              spellAreaMultiplier: ctx.globalUpgrades.spellAreaMultiplier,
            },
            slot.side,
          )
        }
      }
    }
  }
}
