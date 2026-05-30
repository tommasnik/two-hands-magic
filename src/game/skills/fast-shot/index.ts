// ============================================================
// fast_shot — legacy fixed-damage skill
// ============================================================

import type { SkillModule } from '../types'
import {
  FAST_SKILL_DAMAGE,
  FAST_SKILL_ROTATION_PERIOD_MS,
} from '../../constants/skills'
import { PROJECTILE_SPEED_CM, GRAZE_DAMAGE_MULTIPLIER } from '../../constants/combat'
import { SkillRegistry } from '../registry'

export const fastShotModule: SkillModule = {
  type: 'fast_shot',
  damageMin: FAST_SKILL_DAMAGE,
  damageMax: FAST_SKILL_DAMAGE,
  grazeMultiplier: GRAZE_DAMAGE_MULTIPLIER,
  projectileSpeedCm: PROJECTILE_SPEED_CM,
  castTimePeriodMs: FAST_SKILL_ROTATION_PERIOD_MS,
  visualKey: 'fast_shot',
}

SkillRegistry.register(fastShotModule)
