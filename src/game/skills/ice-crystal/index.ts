// ============================================================
// ice_crystal — freeze skill (telegraphed slow projectile)
// ============================================================

import type { SkillModule, EnemyStateSlice, StatusApplier } from '../types'
import type { HitResult } from '../../../types'
import {
  ICE_CRYSTAL_DAMAGE_MIN,
  ICE_CRYSTAL_DAMAGE_MAX,
  ICE_CRYSTAL_SPEED_CM,
  ICE_CRYSTAL_ROTATION_PERIOD_MS,
  ICE_CRYSTAL_FREEZE_CRIT_MS,
  ICE_CRYSTAL_FREEZE_HIT_MS,
} from '../../constants/skills'
import { GRAZE_DAMAGE_MULTIPLIER } from '../../constants/combat'
import { SkillRegistry } from '../registry'

/**
 * ice_crystal onHit — applies freeze status on CRIT or HIT.
 * GRAZE does not freeze.
 * The applyStatus callback is a no-op in TASK-63; TASK-64 wires it to
 * StatusEffectSystem.apply() so the enemy actually freezes.
 */
function onHit(enemy: EnemyStateSlice, hit: HitResult, applyStatus: StatusApplier): void {
  if (enemy.hp <= 0) return
  if (hit === 'CRIT') {
    applyStatus({ kind: 'frozen', remainingMs: ICE_CRYSTAL_FREEZE_CRIT_MS })
  } else if (hit === 'HIT') {
    applyStatus({ kind: 'frozen', remainingMs: ICE_CRYSTAL_FREEZE_HIT_MS })
  }
  // GRAZE and MISS: no freeze
}

export const iceCrystalModule: SkillModule = {
  type: 'ice_crystal',
  damageMin: ICE_CRYSTAL_DAMAGE_MIN,
  damageMax: ICE_CRYSTAL_DAMAGE_MAX,
  grazeMultiplier: GRAZE_DAMAGE_MULTIPLIER,
  projectileSpeedCm: ICE_CRYSTAL_SPEED_CM,
  castTimePeriodMs: ICE_CRYSTAL_ROTATION_PERIOD_MS,
  visualKey: 'ice_crystal',
  onHit,
  interactions: [
    {
      whenEnemyHas: 'burning',
      visualKey: 'steam_burst',
    },
  ],
}

SkillRegistry.register(iceCrystalModule)
