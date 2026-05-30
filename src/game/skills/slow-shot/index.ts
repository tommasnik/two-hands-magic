// ============================================================
// slow_shot — legacy fixed-damage skill
// ============================================================

import type { SkillModule } from '../types'
import {
  SLOW_SKILL_DAMAGE,
  SLOW_SKILL_ROTATION_PERIOD_MS,
} from '../../constants/skills'
import { PROJECTILE_SPEED_CM, GRAZE_DAMAGE_MULTIPLIER } from '../../constants/combat'
import { SkillRegistry } from '../registry'

export const slowShotModule: SkillModule = {
  type: 'slow_shot',
  damageMin: SLOW_SKILL_DAMAGE,
  damageMax: SLOW_SKILL_DAMAGE,
  grazeMultiplier: GRAZE_DAMAGE_MULTIPLIER,
  projectileSpeedCm: PROJECTILE_SPEED_CM * 0.4,
  castTimePeriodMs: SLOW_SKILL_ROTATION_PERIOD_MS,
  visualKey: 'slow_shot',
}

SkillRegistry.register(slowShotModule)
