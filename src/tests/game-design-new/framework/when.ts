import { GameStateMachine } from '../../../game/GameStateMachine'
import type { SkillType } from '../../../types'
import type { PlayerState } from './given'
import type { HitDistribution, HitResult, SimulationResult, FightResult } from './types'

const MAX_FIGHT_DURATION_MS = 60_000
const SKILL_ROTATION: SkillType[] = ['white_shot', 'fireball']

function sampleHit(dist: HitDistribution): HitResult {
  const r = Math.random()
  if (r < dist.crit) return 'CRIT'
  if (r < dist.crit + dist.hit) return 'HIT'
  if (r < dist.crit + dist.hit + dist.graze) return 'GRAZE'
  return 'MISS'
}

function runFight(player: PlayerState): FightResult {
  const gsm = new GameStateMachine()
  gsm.startBattle()

  const { hitDistribution, shotIntervalMs, timingVarianceMs } = player.build.strategy
  let gameTimeMs = 0
  let shotIndex = 0

  while (gameTimeMs < MAX_FIGHT_DURATION_MS) {
    const jitter = (Math.random() * 2 - 1) * timingVarianceMs
    gameTimeMs += Math.max(50, shotIntervalMs + jitter)

    const skill = SKILL_ROTATION[shotIndex % SKILL_ROTATION.length]
    shotIndex++

    gsm._applyHitForTesting(sampleHit(hitDistribution), skill)

    const { phase } = gsm.getState()
    if (phase === 'fight_overview' || phase === 'level_complete' || phase === 'victory') {
      return { won: true, killTimeMs: gameTimeMs }
    }
  }

  return { won: false, killTimeMs: MAX_FIGHT_DURATION_MS }
}

export async function whenFightsEnemyTimes(
  player: PlayerState,
  _enemy: unknown,
  times: number
): Promise<SimulationResult> {
  const fights: FightResult[] = []
  for (let i = 0; i < times; i++) {
    fights.push(runFight(player))
  }
  return { fights, total: times }
}
