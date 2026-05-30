import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP } from '../combat'
import { ancientTreantGraph } from '../../enemyGraphs'

/** Ancient Treant — highest HP enemy. Endurance fight against a massive tree. */
export const ENEMY_ANCIENT_TREANT: EnemyDef = {
  name: 'Ancient Treant',
  maxHp: 90,
  manifestId: 'ancient-treant',
  spriteKey: 'ancient_treant',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  behaviorGraph: ancientTreantGraph,
}
