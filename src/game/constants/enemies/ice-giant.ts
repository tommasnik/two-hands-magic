import type { EnemyDef } from '../../../types'
import { DEFAULT_HIT_ZONE_MAP } from '../combat'
import { iceGiantGraph } from '../../enemyGraphs'

/**
 * Ice Giant — sprite-based enemy. Two attack phases (windup + throw), no idle yet.
 * Uses first attack animation frame as idle placeholder until idle animation is created.
 */
export const ENEMY_ICE_GIANT: EnemyDef = {
  name: 'Ice Giant',
  maxHp: 65,
  manifestId: 'ice-giant',
  spriteKey: 'ice_giant',
  hitZoneMap: DEFAULT_HIT_ZONE_MAP,
  behavior: { pattern: 'static', speed: 0 },
  displayWidth: 248,
  behaviorGraph: iceGiantGraph,
}
