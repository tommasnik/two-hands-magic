import type { PlayerBuild } from '../framework/types'

// Aims for the main body zone, occasionally crits, rarely misses.
// Fires every 500 ms — deliberate but not hesitant.
export const regularPlayerBuild: PlayerBuild = {
  name: 'regular-player',
  description: 'Targets main hit zone, lands crits occasionally, fires every ~500 ms.',
  strategy: {
    hitDistribution: { crit: 0.20, hit: 0.70, graze: 0 },
    shotIntervalMs: 500,
    timingVarianceMs: 100,
  },
}
