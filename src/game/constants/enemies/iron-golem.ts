import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP } from '../combat'
import { ironGolemGraph } from '../../enemyGraphs'

/** Iron Golem — massive dark iron construct. Very high HP, punishes misses. */
export const ENEMY_IRON_GOLEM: EnemyDef = {
  name: 'Iron Golem',
  maxHp: 80,
  manifestId: 'iron-golem',
  spriteKey: 'iron_golem',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 240,
  behaviorGraph: ironGolemGraph,
}
