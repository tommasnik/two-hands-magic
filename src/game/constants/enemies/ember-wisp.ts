import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP } from '../combat'
import { emberWispGraph } from '../../enemyGraphs'

/** Ember Wisp — tiny, barely visible. Difficulty from precision, not prediction. */
export const ENEMY_EMBER_WISP: EnemyDef = {
  name: 'Ember Wisp',
  maxHp: 20,
  manifestId: 'ember-wisp',
  spriteKey: 'ember_wisp',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  behaviorGraph: emberWispGraph,
}
