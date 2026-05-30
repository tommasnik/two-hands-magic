import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP } from '../combat'
import { orcWarriorGraph } from '../../enemyGraphs'

/** Orc Warrior — heavy bruiser with an axe. High HP, punishes slow play. */
export const ENEMY_ORC_WARRIOR: EnemyDef = {
  name: 'Orc Warrior',
  maxHp: 55,
  manifestId: 'orc-warrior',
  spriteKey: 'orc_warrior',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 220,
  behaviorGraph: orcWarriorGraph,
}
