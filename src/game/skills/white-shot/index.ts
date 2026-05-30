// ============================================================
// white_shot — rapid low-damage skill (quick DPS)
// ============================================================

import type { SkillModule } from '../types'
import {
  WHITE_SHOT_SKILL_DAMAGE_MIN,
  WHITE_SHOT_SKILL_DAMAGE_MAX,
  WHITE_SHOT_ROTATION_PERIOD_MS,
  NEW_SKILL_GREEN_ZONE_MULTIPLIER,
} from '../../constants/skills'
import { PROJECTILE_SPEED_CM } from '../../constants/combat'
import { SkillRegistry } from '../registry'

export const whiteShotModule: SkillModule = {
  type: 'white_shot',
  damageMin: WHITE_SHOT_SKILL_DAMAGE_MIN,
  damageMax: WHITE_SHOT_SKILL_DAMAGE_MAX,
  grazeMultiplier: NEW_SKILL_GREEN_ZONE_MULTIPLIER,
  projectileSpeedCm: PROJECTILE_SPEED_CM,
  castTimePeriodMs: WHITE_SHOT_ROTATION_PERIOD_MS,
  visualKey: 'white_shot',
}

SkillRegistry.register(whiteShotModule)
