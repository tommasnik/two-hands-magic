import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP } from '../combat'
import { mirrorKnightGraph } from '../../enemyGraphs'

/** Mirror Knight — armoured duelist with sword and shield. Tanky mid-campaign wall. */
export const ENEMY_MIRROR_KNIGHT: EnemyDef = {
  name: 'Mirror Knight',
  maxHp: 60,
  manifestId: 'mirror-knight',
  spriteKey: 'mirror_knight',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 160,
  behaviorGraph: mirrorKnightGraph,
}
