// ============================================================
// fireball — slow burst skill (high single-hit damage)
// ============================================================

import type { SkillModule } from '../types'
import {
  FIREBALL_SKILL_DAMAGE_MIN,
  FIREBALL_SKILL_DAMAGE_MAX,
  FIREBALL_SPEED_CM,
  FIREBALL_ROTATION_PERIOD_MS,
  NEW_SKILL_GREEN_ZONE_MULTIPLIER,
} from '../../constants/skills'
import { SkillRegistry } from '../registry'

export const fireballModule: SkillModule = {
  type: 'fireball',
  damageMin: FIREBALL_SKILL_DAMAGE_MIN,
  damageMax: FIREBALL_SKILL_DAMAGE_MAX,
  grazeMultiplier: NEW_SKILL_GREEN_ZONE_MULTIPLIER,
  projectileSpeedCm: FIREBALL_SPEED_CM,
  castTimePeriodMs: FIREBALL_ROTATION_PERIOD_MS,
  visualKey: 'fireball',
}

SkillRegistry.register(fireballModule)
