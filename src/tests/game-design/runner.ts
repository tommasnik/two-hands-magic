// ============================================================
// Game Design Test Framework — runner
// Executes a GameDesignSpec against an isolated GameStateMachine.
// ============================================================

import { GameStateMachine } from '../../game/GameStateMachine'
import { MAX_DELTA_MS } from '../../game/constants'
import type { GameDesignSpec, Action, Assertion } from './types'
import type { GameState, GameStateResult } from '../../types'

export interface RunResult {
  profileName: 'powerUser' | 'casualPlayer'
  metrics: Record<string, unknown>
  passed: boolean
  failures: string[]
}

/**
 * NOTE — _applyHitForTesting bypasses hitboxes.
 *
 * Game design tests that call `machine._applyHitForTesting()` directly inject a
 * hit result (CRIT / HIT / GRAZE / MISS) without firing a projectile or checking
 * any hit geometry.  This means those tests validate **damage math, HP drain, and
 * phase transitions** but they do NOT test:
 *   - whether a projectile actually reaches the enemy,
 *   - whether the shot trajectory intersects the correct hit zone, or
 *   - anything related to AimSystem / ProjectileSystem geometry.
 *
 * Geometry correctness is covered separately by unit tests in
 * `src/tests/unit/` (Enemy, ProjectileSystem, AimSystem).
 *
 * Use the action-sequence path (injectInput + wait) in runner profiles whenever
 * you need an end-to-end test that exercises the full projectile pipeline.
 */

/**
 * Execute a single action sequence against a GameStateMachine and return
 * the metrics accumulated during the run.
 *
 * Uses a fresh GameStateMachine instance — never touches the module singleton.
 */
async function runProfile(
  profileName: 'powerUser' | 'casualPlayer',
  actions: Action[],
  assertions: Assertion[],
): Promise<RunResult> {
  // Isolated instance — not the module-level gameMachine singleton.
  const machine = new GameStateMachine()
  machine.startBattle()

  // Tracked metrics
  const metrics: Record<string, unknown> = {
    timeToFirstCrit: null,
    timeToFirstHit: null,
    atLeastOneHit: false,
    totalEncounterTime: 0,
    // Count-based metrics — collected across the full action sequence
    totalShots: 0,       // number of fire commands dispatched
    totalHits: 0,        // crits + hits + grazes (any shot that dealt damage)
    hitsToKill: 0,       // how many damaging hits were required to kill the enemy
    damageDealt: 0,      // total HP removed from the enemy
  }

  let prevCrits = 0
  let prevHits = 0
  let prevGrazes = 0
  let prevProjectileCount = 0
  let prevEnemyHp = -1   // will be set on the first update call

  /**
   * Update per-step metrics from a freshly returned GameStateResult.
   */
  function collectStateMetrics(result: GameStateResult): void {
    const state: GameState = { ...result.fight, ...result.game }
    // Initialise prevEnemyHp on the very first call
    if (prevEnemyHp === -1) prevEnemyHp = state.enemyHp

    // Time to first crit / hit (compare against previous counters before updating them)
    if (metrics.timeToFirstCrit === null && state.score.crits > prevCrits) {
      metrics.timeToFirstCrit = state.elapsedMs
    }
    if (metrics.timeToFirstHit === null && state.score.hits > prevHits) {
      metrics.timeToFirstHit = state.elapsedMs
    }

    if (state.score.crits > 0 || state.score.hits > 0) {
      metrics.atLeastOneHit = true
    }

    // Count total hits (crits + hits + grazes — any shot that connected)
    // Must be read before updating prevCrits/prevHits/prevGrazes
    const prevTotalHits = prevCrits + prevHits + prevGrazes
    const newTotalHits = state.score.crits + state.score.hits + state.score.grazes
    if (newTotalHits > prevTotalHits) {
      metrics.totalHits = newTotalHits
    }

    // Update previous counters
    prevCrits = state.score.crits
    prevHits = state.score.hits
    prevGrazes = state.score.grazes

    // Track shots fired: count new projectiles that appeared since the last step.
    // A projectile is added to activeProjectiles on the same frame the fire command fires.
    const currentProjectileCount = state.activeProjectiles.length
    if (currentProjectileCount > prevProjectileCount) {
      metrics.totalShots = (metrics.totalShots as number) + (currentProjectileCount - prevProjectileCount)
    }
    prevProjectileCount = currentProjectileCount

    // Track HP damage dealt (cumulative)
    if (prevEnemyHp > state.enemyHp) {
      metrics.damageDealt = (metrics.damageDealt as number) + (prevEnemyHp - state.enemyHp)
      prevEnemyHp = state.enemyHp
    }

    // Track hitsToKill: snapshot totalHits at the moment the enemy's HP first reaches 0
    if (state.enemyHp <= 0 && (metrics.hitsToKill as number) === 0 && (metrics.totalHits as number) > 0) {
      metrics.hitsToKill = metrics.totalHits
    }
  }

  /**
   * Advance the machine by `ms` milliseconds in MAX_DELTA_MS steps,
   * recording metric changes after each step.
   */
  function advanceTime(ms: number): void {
    let remaining = ms
    while (remaining > 0) {
      const step = Math.min(remaining, MAX_DELTA_MS)
      machine.update(step, [])
      remaining -= step
      collectStateMetrics(machine.getState())
    }
  }

  // Execute the action sequence
  for (const action of actions) {
    if (action.type === 'injectInput') {
      machine.queueInput(action.payload)
      // Process immediately on the next micro-step so the command is applied
      machine.update(1, [])
      collectStateMetrics(machine.getState())
    } else if (action.type === 'wait') {
      advanceTime(action.payload.ms)
    }
  }

  // Record total encounter time from the final machine state
  const { fight: finalFight } = machine.getState()
  metrics.totalEncounterTime = finalFight.elapsedMs

  // Evaluate assertions
  const failures: string[] = []
  for (const assertion of assertions) {
    const raw = metrics[assertion.metric]
    const metricValue = raw as number | boolean | null | undefined

    if (assertion.value !== undefined) {
      if (metricValue !== assertion.value) {
        failures.push(
          `${assertion.metric}: expected value ${JSON.stringify(assertion.value)}, got ${JSON.stringify(metricValue)}`,
        )
      }
    }

    if (assertion.maxMs !== undefined) {
      if (typeof metricValue !== 'number' || metricValue > assertion.maxMs) {
        failures.push(
          `${assertion.metric}: expected <= ${assertion.maxMs}ms, got ${JSON.stringify(metricValue)}`,
        )
      }
    }

    if (assertion.minMs !== undefined) {
      if (typeof metricValue !== 'number' || metricValue < assertion.minMs) {
        failures.push(
          `${assertion.metric}: expected >= ${assertion.minMs}ms, got ${JSON.stringify(metricValue)}`,
        )
      }
    }

    if (assertion.minValue !== undefined) {
      if (typeof metricValue !== 'number' || metricValue < assertion.minValue) {
        failures.push(
          `${assertion.metric}: expected count >= ${assertion.minValue}, got ${JSON.stringify(metricValue)}`,
        )
      }
    }

    if (assertion.maxValue !== undefined) {
      if (typeof metricValue !== 'number' || metricValue > assertion.maxValue) {
        failures.push(
          `${assertion.metric}: expected count <= ${assertion.maxValue}, got ${JSON.stringify(metricValue)}`,
        )
      }
    }
  }

  return {
    profileName,
    metrics,
    passed: failures.length === 0,
    failures,
  }
}

/**
 * Run a complete GameDesignSpec — executes both power user and casual player profiles.
 * Returns an array of two RunResults (power user first, casual player second).
 */
export async function runSpec(spec: GameDesignSpec): Promise<RunResult[]> {
  const powerResult = await runProfile(
    'powerUser',
    spec.powerUser.actions,
    spec.powerUser.assertions,
  )

  const casualResult = await runProfile(
    'casualPlayer',
    spec.casualPlayer.actions,
    spec.casualPlayer.assertions,
  )

  return [powerResult, casualResult]
}
