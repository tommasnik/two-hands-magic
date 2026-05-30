import type Phaser from 'phaser'
import { gameMachine } from '../../game/GameStateMachine'
import { MAX_DELTA_MS } from '../../game/constants'
import type { InputEvent, HitResult, SkillType, UpgradeNodeId, BehaviorGraph } from '../../types'

/**
 * Installed only in DEV builds. Exposes game internals for autonomous agent testing
 * via Playwright's page.evaluate(). Never included in production.
 *
 * Usage in Playwright:
 *   const state = await page.evaluate(() => window.__game.getState())
 *   await page.evaluate((ev) => window.__game.injectInput(ev), inputEvent)
 *   await page.evaluate((ms) => window.__game.advanceTime(ms), 500)
 */
export function installTestBridge(_game: Phaser.Game): void {
  if (!import.meta.env.DEV) return

  ;(window as unknown as Record<string, unknown>)['__game'] = {
    getState: () => gameMachine.getState(),

    /** Returns the current rendered touch point positions (same as used for nearest-point lookup). */
    getTouchPointPositions: () => gameMachine.getTouchPointPositions(),

    injectInput: (event: InputEvent) => {
      gameMachine.queueInput(event)
    },

    advanceTime: (ms: number) => {
      let remaining = ms
      while (remaining > 0) {
        const step = Math.min(remaining, MAX_DELTA_MS)
        gameMachine.update(step, [])
        remaining -= step
      }
    },

    startBattle: () => {
      gameMachine.startBattle()
    },

    /** Apply a hit directly to the state machine. For testing HP/damage mechanics only. */
    applyHit: (result: HitResult, skillType: SkillType) => {
      gameMachine._applyHitForTesting(result, skillType)
    },

    /** Trigger a lightning_blast discharge visual for manual testing. */
    fireLightningBlast: (result: HitResult) => {
      gameMachine._fireLightningBlastForTesting(result)
    },

    /** Advance to the next level. Only works when phase === 'level_complete'. */
    nextLevel: () => {
      gameMachine.nextLevel()
    },

    /** Restart game from level 1. Only works when phase === 'victory'. */
    restartGame: () => {
      gameMachine.restartGame()
    },

    /** Restart the current level after game over. Only works when phase === 'game_over'. */
    restartLevel: () => {
      gameMachine.restartLevel()
    },

    /** Confirm the upgrade pick on the level-up screen. Releases pendingLevelUp gate. */
    confirmLevelUpUpgrade: (nodeId?: UpgradeNodeId) => {
      gameMachine.confirmLevelUpUpgrade(nodeId)
    },

    /** Complete the fight overview screen — advances to next level or restarts game. */
    completeFightOverview: () => {
      gameMachine.completeFightOverview()
    },

    /**
     * Install a behaviour graph on the active enemy so it starts attacking.
     * ENEMY_POOL entries do not carry graphs until TASK-60.6, so smoke tests use
     * this to spawn deliveries (orbs / overlays) and exercise the render layer.
     */
    installBehaviorGraph: (graph: BehaviorGraph) => {
      gameMachine._initBehaviorGraphForTesting(graph)
    },
  }
}
