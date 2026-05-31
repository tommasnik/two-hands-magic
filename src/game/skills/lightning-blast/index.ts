// ============================================================
// lightning_blast — instant-hit discharge skill
// ============================================================

import type { SkillModule } from '../types'
import {
  LIGHTNING_BLAST_DAMAGE_MIN,
  LIGHTNING_BLAST_DAMAGE_MAX,
  LIGHTNING_BLAST_ROTATION_PERIOD_MS,
  LIGHTNING_BLAST_DURATION_CRIT_MS,
  LIGHTNING_BLAST_DURATION_HIT_MS,
  LIGHTNING_BLAST_DURATION_GRAZE_MS,
} from '../../constants/skills'
import { PROJECTILE_SPEED_CM, GRAZE_DAMAGE_MULTIPLIER } from '../../constants/combat'
import { SkillRegistry } from '../registry'

/**
 * lightning_blast interaction rules:
 * - frozen enemy + lightning → multi-hit discharge (defined here as data;
 *   InteractionSystem in TASK-64 will execute it).
 */
export const lightningBlastModule: SkillModule = {
  type: 'lightning_blast',
  damageMin: LIGHTNING_BLAST_DAMAGE_MIN,
  damageMax: LIGHTNING_BLAST_DAMAGE_MAX,
  grazeMultiplier: GRAZE_DAMAGE_MULTIPLIER,
  // lightning_blast is instant (no projectile flight) — speed is used only
  // when lightning_blast is fired as a regular projectile fallback.
  // GameStateMachine handles lightning_blast's instant-hit path separately.
  projectileSpeedCm: PROJECTILE_SPEED_CM,
  castTimePeriodMs: LIGHTNING_BLAST_ROTATION_PERIOD_MS,
  visualKey: 'lightning_blast',
  interactions: [
    {
      whenEnemyHas: 'frozen',
      damageMultiplier: 2.0,
      visualKey: 'lightning_frozen_discharge',
    },
  ],
  hitEffect: {
    type: 'lightning_discharge',
    durationByResult: {
      CRIT:  LIGHTNING_BLAST_DURATION_CRIT_MS,
      HIT:   LIGHTNING_BLAST_DURATION_HIT_MS,
      GRAZE: LIGHTNING_BLAST_DURATION_GRAZE_MS,
      MISS:  0,
    },
  },
}

SkillRegistry.register(lightningBlastModule)
