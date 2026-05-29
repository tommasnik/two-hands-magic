import { describe, it } from 'vitest'
import { ENEMY_GOBLIN_SCOUT } from '../../game/constants'
import { givenPlayerWithBuild } from './framework/given'
import { whenFightsEnemyTimes } from './framework/when'
import { thenWinsTimes, exactly } from './framework/then'
import { powerPlayerBuild } from './builds/powerPlayer.build'
import { regularPlayerBuild } from './builds/regularPlayer.build'
import { lamaPlayerBuild } from './builds/lamaPlayer.build'

// First fight = level 1, Goblin Scout (60 HP, default white_shot + fireball loadout).
// Enemies do not yet attack the player, so player HP assertions are omitted.

describe('Goblin Scout — power player (fastest crits)', () => {
  it('always kills the Goblin Scout when critting every shot', async () => {
    const player = givenPlayerWithBuild(powerPlayerBuild, { level: 1 })
    const result = await whenFightsEnemyTimes(player, ENEMY_GOBLIN_SCOUT, 20)
    thenWinsTimes(result, exactly(20))
  })
})

describe('Goblin Scout — regular player (70 % hit / 20 % crit / 10 % miss, 500 ms intervals)', () => {
  it('always kills the Goblin Scout and would stay above 50 % HP (100 runs)', async () => {
    const player = givenPlayerWithBuild(regularPlayerBuild, { level: 1 })
    const result = await whenFightsEnemyTimes(player, ENEMY_GOBLIN_SCOUT, 100)
    thenWinsTimes(result, exactly(100))
    // HP assertion skipped: enemies do not attack yet, so player HP never decreases.
  })
})

describe('Goblin Scout — lama (10 % crit / 30 % hit / 10 % graze / 50 % miss, 1 s intervals)', () => {
  it('even a lama always wins and would stay above 20 % HP (100 runs)', async () => {
    const player = givenPlayerWithBuild(lamaPlayerBuild, { level: 1 })
    const result = await whenFightsEnemyTimes(player, ENEMY_GOBLIN_SCOUT, 100)
    thenWinsTimes(result, exactly(100))
    // HP assertion skipped: enemies do not attack yet, so player HP never decreases.
  })
})
