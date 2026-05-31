// ============================================================
// StateBuilder — assembles a serializable GameState snapshot
// from raw GSM fields. No Phaser dependency.
// ============================================================

import type { GameState, ActiveSlotState, HitZoneEntryPx } from '../../types'
import type { ActiveTouchPointPos } from '../entities/touchPoints'
import { scaleHitZoneMap } from './HitZoneSystem'
import {
  ENEMY_TORSO_WIDTH_PX, ENEMY_TORSO_HEIGHT_PX, ENEMY_HEAD_RADIUS_PX, ENEMY_LEG_LENGTH_PX,
} from '../constants'
import type { Enemy } from '../entities/Enemy'
import type { Player } from '../entities/Player'
import type { ProjectileSystem } from './ProjectileSystem'
import type { DeliverySystem } from './DeliverySystem'
import type { CombatSystem } from './CombatSystem'
import type { PhaseManager } from './PhaseManager'
import type { HitResult, HitZoneEntry, GlobalUpgradeState, PlayerHitEvent } from '../../types'
import type { StatusEffect } from '../skills/types'

export interface StateBuilderInput {
  phaseManager: PhaseManager
  combat: CombatSystem
  enemy: Enemy
  player: Player
  projectileSystem: ProjectileSystem
  deliverySystem: DeliverySystem
  layout: ActiveTouchPointPos[]
  slotStates: Record<string, { active: boolean; dragOffsetX: number; touchStartMs: number }>
  elapsedMs: number
  enemyHp: number
  enemyMaxHp: number
  enemyName: string
  enemySpriteKey: string
  enemyManifestId: string | undefined
  enemyHitZoneMap: readonly HitZoneEntry[]
  enemyStunnedUntilMs: number
  lightningDischargeUntilMs: number
  lightningDischargeResult: HitResult | null
  lightningDischargeTarget: { x: number; y: number } | null
  currentLevel: number
  lastPlayerHit: PlayerHitEvent | null
  playerXp: number
  playerLevel: number
  pendingLevelUp: boolean
  globalUpgrades: GlobalUpgradeState
  enemyStatusEffects: StatusEffect[]
}

/**
 * Build the full serializable GameState snapshot from GSM internals.
 * Pure function — all inputs are value types or read-only references.
 */
export function buildGameState(s: StateBuilderInput): GameState {
  // Build activeSlots from layout + slot states.
  const activeSlots: ActiveSlotState[] = s.layout.map(slot => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ts = s.slotStates[slot.id]!
    return {
      id: slot.id,
      x: slot.x,
      y: slot.y,
      side: slot.side,
      skillType: slot.skillType,
      rotationPeriodMs: slot.rotationPeriodMs * s.globalUpgrades.castTimeMultiplier,
      active: ts.active,
      dragOffsetX: ts.dragOffsetX,
      touchStartMs: ts.touchStartMs,
    }
  })

  const leftCount = s.layout.filter(sl => sl.side === 'left').length
  const rightCount = s.layout.filter(sl => sl.side === 'right').length

  // Compute enemy bounding box for hit zone scaling.
  const bboxW = ENEMY_TORSO_WIDTH_PX
  const headDiameter = ENEMY_HEAD_RADIUS_PX * 2
  const bboxH = headDiameter + ENEMY_TORSO_HEIGHT_PX + ENEMY_LEG_LENGTH_PX
  const bboxCentreY = s.enemy.y - ENEMY_TORSO_HEIGHT_PX / 2 - headDiameter + bboxH / 2

  const enemyHitZonesPx: HitZoneEntryPx[] = scaleHitZoneMap(
    s.enemyHitZoneMap,
    s.enemy.x,
    bboxCentreY,
    bboxW,
    bboxH,
  )

  // Derive enemyFrozenUntilMs from active status effects.
  const frozen = s.enemyStatusEffects.find(e => e.kind === 'frozen')
  const enemyFrozenUntilMs = (frozen && frozen.remainingMs > 0)
    ? s.elapsedMs + frozen.remainingMs
    : 0

  return {
    phase: s.phaseManager.currentPhase,
    score: { ...s.combat.score },
    enemy: { x: s.enemy.x, y: s.enemy.y, stunnedUntilMs: s.enemyStunnedUntilMs },
    activeProjectiles: s.projectileSystem.getProjectiles().map((p) => ({ ...p })),
    elapsedMs: s.elapsedMs,
    lastHit: s.combat.lastHit ? { ...s.combat.lastHit } : null,
    activeSlots,
    enemyHp: s.enemyHp,
    enemyMaxHp: s.enemyMaxHp,
    enemyName: s.enemyName,
    enemySpriteKey: s.enemySpriteKey,
    enemyManifestId: s.enemyManifestId,
    enemyDisplayWidth: s.enemy.displayWidth,
    enemyFrozenUntilMs,
    lightningDischargeUntilMs: s.lightningDischargeUntilMs,
    lightningDischargeResult: s.lightningDischargeResult,
    lightningDischargeTarget: s.lightningDischargeTarget ? { ...s.lightningDischargeTarget } : null,
    enemyAnimKey: s.enemy.currentAnimKey,
    enemyFrameIndex: s.enemy.currentFrameIndex,
    currentLevel: s.currentLevel,
    touchPointsPerSide: { left: leftCount, right: rightCount },
    enemyHitZonesPx,
    player: { hp: s.player.hp, maxHp: s.player.maxHp },
    activeDeliveries: s.deliverySystem.getActive(),
    lastPlayerHit: s.lastPlayerHit ? { ...s.lastPlayerHit } : null,
    playerXp: s.playerXp,
    playerLevel: s.playerLevel,
    pendingLevelUp: s.pendingLevelUp,
    globalUpgrades: {
      ...s.globalUpgrades,
      unlockedNodeIds: [...s.globalUpgrades.unlockedNodeIds],
    },
    lastCastBySlot: { ...s.combat.lastCastBySlot },
    fightStats: s.combat.serializeFightStats(s.combat.fightStats),
    fightStatsSnapshot: s.combat.fightStatsSnapshot
      ? s.combat.serializeFightStats(s.combat.fightStatsSnapshot)
      : null,
  }
}
