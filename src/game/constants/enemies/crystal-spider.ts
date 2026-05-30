import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP } from '../combat'
import { crystalSpiderGraph } from '../../enemyGraphs'

/** Crystal Spider — disproportionately large crit field; low HP forces crit-focused play. */
export const ENEMY_CRYSTAL_SPIDER: EnemyDef = {
  name: 'Crystal Spider',
  maxHp: 15,
  manifestId: 'crystal-spider',
  spriteKey: 'crystal_spider',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 224,
  behaviorGraph: crystalSpiderGraph,
}
