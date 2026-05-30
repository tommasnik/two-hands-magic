import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP } from '../combat'
import { plagueRatGraph } from '../../enemyGraphs'

/** Plague Rat — extremely small. Accuracy is the true obstacle. Holds position (no lateral movement). */
export const ENEMY_PLAGUE_RAT: EnemyDef = {
  name: 'Plague Rat',
  maxHp: 13,
  manifestId: 'plague-rat',
  spriteKey: 'plague_rat',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 180,
  behaviorGraph: plagueRatGraph,
}
