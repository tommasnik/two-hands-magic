import { WHITE_SHOT_ROTATION_PERIOD_MS } from '../../../game/constants'
import type { PlayerBuild } from '../framework/types'

// Fires both skills the moment their crit zone aligns — never wastes a shot.
// shotIntervalMs = WHITE_SHOT_ROTATION_PERIOD_MS: fires at the rate of the fastest skill.
export const powerPlayerBuild: PlayerBuild = {
  name: 'power-player',
  description: 'Waits for crit zone on every shot. Never misses, never grazes.',
  strategy: {
    hitDistribution: { crit: 1.0, hit: 0, graze: 0 },
    shotIntervalMs: WHITE_SHOT_ROTATION_PERIOD_MS,
    timingVarianceMs: 0,
  },
}
