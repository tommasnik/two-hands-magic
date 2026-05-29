import type { Page } from '@playwright/test'
import type { GameState, InputEvent, HitResult, SkillType, UpgradeNodeId } from '../../types'
import type { ActiveTouchPointPos } from '../../game/entities/touchPoints'

/**
 * Typed wrapper around window.__game test bridge calls.
 * Use in Playwright E2E tests instead of raw page.evaluate().
 *
 * @example
 * const api = gameApi(page)
 * const state = await api.getState()
 * await api.injectInput({ pointerId: 0, action: 'down', x: 50, y: 800, timestamp: Date.now() })
 * await api.advanceTime(500)
 */
export function gameApi(page: Page) {
  return {
    /** Returns the current serialized GameState snapshot. */
    getState: (): Promise<GameState> =>
      page.evaluate(() => (window as unknown as Record<string, { getState: () => GameState }>)['__game'].getState()),

    /** Queues a raw InputEvent to be processed on the next game update. */
    injectInput: (event: InputEvent): Promise<void> =>
      page.evaluate(
        (ev) => (window as unknown as Record<string, { injectInput: (e: InputEvent) => void }>)['__game'].injectInput(ev),
        event,
      ),

    /** Advances the game loop deterministically by the given number of milliseconds. */
    advanceTime: (ms: number): Promise<void> =>
      page.evaluate(
        (n) => (window as unknown as Record<string, { advanceTime: (ms: number) => void }>)['__game'].advanceTime(n),
        ms,
      ),

    /** Programmatically starts the battle (equivalent to clicking the START button). */
    startBattle: (): Promise<void> =>
      page.evaluate(
        () => (window as unknown as Record<string, { startBattle: () => void }>)['__game'].startBattle(),
      ),

    /** Directly applies a hit result to the state machine. For testing HP/damage mechanics only. */
    applyHit: (result: HitResult, skillType: SkillType): Promise<void> =>
      page.evaluate(
        ([r, s]) =>
          (
            window as unknown as Record<
              string,
              { applyHit: (result: HitResult, skillType: SkillType) => void }
            >
          )['__game'].applyHit(r as HitResult, s as SkillType),
        [result, skillType] as [HitResult, SkillType],
      ),

    /** Advances to the next level. Only works when phase === 'level_complete'. */
    nextLevel: (): Promise<void> =>
      page.evaluate(
        () => (window as unknown as Record<string, { nextLevel: () => void }>)['__game'].nextLevel(),
      ),

    /** Restarts game from level 1. Only works when phase === 'victory'. */
    restartGame: (): Promise<void> =>
      page.evaluate(
        () => (window as unknown as Record<string, { restartGame: () => void }>)['__game'].restartGame(),
      ),

    /** Restarts the current level after a game over. Only works when phase === 'game_over'. */
    restartLevel: (): Promise<void> =>
      page.evaluate(
        () => (window as unknown as Record<string, { restartLevel: () => void }>)['__game'].restartLevel(),
      ),

    /**
     * Confirms the pending upgrade pick on the level-up screen.
     * Required before nextLevel() can advance the run when pendingLevelUp is true.
     */
    confirmLevelUpUpgrade: (nodeId?: UpgradeNodeId): Promise<void> =>
      page.evaluate(
        (id) =>
          (
            window as unknown as Record<
              string,
              { confirmLevelUpUpgrade: (nodeId?: UpgradeNodeId) => void }
            >
          )['__game'].confirmLevelUpUpgrade(id),
        nodeId,
      ),

    /** Returns the current rendered touch point positions (circle centres on screen). */
    getTouchPointPositions: (): Promise<ActiveTouchPointPos[]> =>
      page.evaluate(
        () =>
          (
            window as unknown as Record<
              string,
              { getTouchPointPositions: () => ActiveTouchPointPos[] }
            >
          )['__game'].getTouchPointPositions(),
      ),

    /** Complete the fight overview screen — advances to next level or restarts game. */
    completeFightOverview: (): Promise<void> =>
      page.evaluate(
        () => (window as unknown as Record<string, { completeFightOverview: () => void }>)['__game'].completeFightOverview(),
      ),
  }
}
