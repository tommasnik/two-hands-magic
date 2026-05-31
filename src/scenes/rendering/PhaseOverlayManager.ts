import {
  LEVEL_COMPLETE_DELAY_MS,
  GAME_OVER_RESTART_DELAY_MS,
  ENEMY_POOL,
  UPGRADE_NODES,
  UPGRADE_PATH_TITLES,
  UPGRADE_TREE_COLUMNS,
} from '../../game/constants'
import { getUpgradeNodeStatus, getXpProgress } from '../../game/upgrades'
import type { UpgradeNodeId, GlobalUpgradeState, SkillFightStats, GlobalSnapshot, FightStatsSnapshot } from '../../types'
import { getSkillColor } from './SkillRenderer'
import type { DeliveryRenderer } from './DeliveryRenderer'

/**
 * Manages all DOM phase overlays and the upgrade picker.
 * Handles: level_complete, fight_overview, victory, game_over, upgrade picker.
 * No canvas drawing — DOM only.
 */
export class PhaseOverlayManager {
  // Phase overlay DOM refs
  private levelCompleteOverlay: HTMLElement | null = null
  private levelCompleteText: HTMLElement | null = null
  private victoryOverlay: HTMLElement | null = null
  private gameOverOverlay: HTMLElement | null = null
  private _victoryToast: HTMLElement | null = null
  private _fightOverviewOverlay: HTMLElement | null = null

  // Upgrade picker DOM refs
  private upgradeOverlay: HTMLElement | null = null
  private upgradeLevelLabel: HTMLElement | null = null
  private upgradeTree: HTMLElement | null = null
  private upgradeCrossContainer: HTMLElement | null = null
  private upgradeNodeEls: Map<UpgradeNodeId, HTMLButtonElement> = new Map()
  private _upgradePickerVisible = false
  private _showUpgradeAfterFightOverview = false

  // Phase timer state
  private _phaseTimerMs: number | null = null
  private _lastPhase: string | null = null

  // Callbacks injected by BattleScene
  onNextLevel: () => void = () => {}
  onRestartLevel: () => void = () => {}
  onConfirmUpgrade: (nodeId: UpgradeNodeId) => void = () => {}
  onFightOverviewContinue: () => void = () => {}

  // Last known snapshot for deferred rendering (fight overview timer)
  private _lastGame: GlobalSnapshot | null = null
  private _lastFightStats: FightStatsSnapshot | null = null
  private _lastEnemyName: string = ''
  private _lastGlobalUpgrades: GlobalUpgradeState | null = null

  constructor(private readonly deliveryRenderer: DeliveryRenderer) {}

  /** Wire DOM refs and event listeners — call once from BattleScene.create(). */
  init(): void {
    this.levelCompleteOverlay  = document.getElementById('level-complete-overlay')
    this.levelCompleteText     = document.getElementById('level-complete-text')
    this.victoryOverlay        = document.getElementById('victory-overlay')
    this.gameOverOverlay       = document.getElementById('game-over-overlay')
    this._victoryToast         = document.getElementById('victory-toast')
    this._fightOverviewOverlay = document.getElementById('fight-overview-overlay')
    this.upgradeOverlay        = document.getElementById('upgrade-overlay')
    this.upgradeLevelLabel     = document.getElementById('upgrade-level-label')
    this.upgradeTree           = document.getElementById('upgrade-tree')
    this.upgradeCrossContainer = document.getElementById('upgrade-cross-nodes')

    this._buildUpgradeTreeDom()

    document.getElementById('fight-overview-btn')?.addEventListener('click', () => {
      if (this._lastGame?.pendingLevelUp) {
        this._showUpgradeAfterFightOverview = true
        if (this._fightOverviewOverlay) this._fightOverviewOverlay.classList.add('hidden')
        this._upgradePickerVisible = false
      } else {
        this.deliveryRenderer.cancelFlying()
        this.onFightOverviewContinue()
      }
    })
  }

  /**
   * Handle phase transitions and advance timers.
   * Must be called each frame from BattleScene.update().
   * @param enemyName - current enemy display name; used in fight overview header.
   * @param globalUpgrades - current upgrade state; used by upgrade picker.
   */
  update(
    game: GlobalSnapshot,
    fightStats: FightStatsSnapshot | null,
    dtMs: number,
    enemyName?: string,
    globalUpgrades?: GlobalUpgradeState,
  ): void {
    this._lastGame = game
    this._lastFightStats = fightStats
    if (enemyName !== undefined) this._lastEnemyName = enemyName
    if (globalUpgrades !== undefined) this._lastGlobalUpgrades = globalUpgrades
    this._handlePhaseTransitions(game.phase, game.currentLevel, dtMs)
    this._updateUpgradePicker(game)
  }

  // -----------------------------------------------------------------------
  // Phase transition logic
  // -----------------------------------------------------------------------

  private _handlePhaseTransitions(phase: string, currentLevel: number, dtMs: number): void {
    if (phase !== this._lastPhase) {
      this._lastPhase = phase
      this._phaseTimerMs = null

      if (phase === 'fight_overview') {
        if (this.levelCompleteOverlay) this.levelCompleteOverlay.classList.add('hidden')
        if (this.victoryOverlay) this.victoryOverlay.classList.add('hidden')
        if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden')
        if (this._fightOverviewOverlay) this._fightOverviewOverlay.classList.add('hidden')
        if (this._victoryToast) this._victoryToast.classList.remove('hidden')
        this._showUpgradeAfterFightOverview = false
        this._phaseTimerMs = 0
      } else if (phase === 'level_complete') {
        if (this.levelCompleteText) {
          this.levelCompleteText.textContent = `LEVEL ${currentLevel} COMPLETE!`
        }
        if (this.levelCompleteOverlay) this.levelCompleteOverlay.classList.remove('hidden')
        if (this.victoryOverlay) this.victoryOverlay.classList.add('hidden')
        if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden')
        this._phaseTimerMs = 0
      } else if (phase === 'victory') {
        if (this.levelCompleteOverlay) this.levelCompleteOverlay.classList.add('hidden')
        if (this.victoryOverlay) this.victoryOverlay.classList.remove('hidden')
        if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden')
        this._phaseTimerMs = 0
      } else if (phase === 'game_over') {
        if (this.levelCompleteOverlay) this.levelCompleteOverlay.classList.add('hidden')
        if (this.victoryOverlay) this.victoryOverlay.classList.add('hidden')
        if (this.gameOverOverlay) this.gameOverOverlay.classList.remove('hidden')
        this._phaseTimerMs = 0
      } else if (phase === 'battle') {
        if (this.levelCompleteOverlay) this.levelCompleteOverlay.classList.add('hidden')
        if (this.victoryOverlay) this.victoryOverlay.classList.add('hidden')
        if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden')
        if (this._victoryToast) this._victoryToast.classList.add('hidden')
        if (this._fightOverviewOverlay) this._fightOverviewOverlay.classList.add('hidden')
      }
    }

    if (this._phaseTimerMs !== null) {
      this._phaseTimerMs += dtMs

      if (phase === 'fight_overview' && this._phaseTimerMs >= 1000) {
        this._phaseTimerMs = null
        const game = this._lastGame
        if (this._victoryToast) this._victoryToast.classList.add('hidden')
        if (this._fightOverviewOverlay && game) {
          const isLastLevel = game.currentLevel >= ENEMY_POOL.length
          const btn = document.getElementById('fight-overview-btn')
          if (btn) {
            if (game.pendingLevelUp) btn.textContent = 'Level Up →'
            else if (isLastLevel) btn.textContent = 'Play again'
            else btn.textContent = 'Next Fight →'
          }
          this._renderFightOverviewContent(game, this._lastFightStats)
          this._fightOverviewOverlay.classList.remove('hidden')
        }
      } else if (phase === 'level_complete' && this._phaseTimerMs >= LEVEL_COMPLETE_DELAY_MS) {
        if (!this._lastGame?.pendingLevelUp) {
          this._phaseTimerMs = null
          this.deliveryRenderer.cancelFlying()
          this.onNextLevel()
        }
      } else if (phase === 'game_over' && this._phaseTimerMs >= GAME_OVER_RESTART_DELAY_MS) {
        this._phaseTimerMs = null
        this.deliveryRenderer.cancelFlying()
        this.onRestartLevel()
      }
    }
  }

  // -----------------------------------------------------------------------
  // Fight overview overlay content
  // -----------------------------------------------------------------------

  private _renderFightOverviewContent(game: GlobalSnapshot, snap: FightStatsSnapshot | null): void {
    const contentEl = document.getElementById('fight-overview-content')
    if (!contentEl) return
    if (!snap) return

    const durationSec = snap.durationMs / 1000
    const fmt1 = (n: number) => n.toFixed(1)

    const totalDmg = snap.left.totalDamage + snap.right.totalDamage
    const leftDps = durationSec > 0 ? snap.left.totalDamage / durationSec : 0
    const rightDps = durationSec > 0 ? snap.right.totalDamage / durationSec : 0
    const totalDps = durationSec > 0 ? totalDmg / durationSec : 0
    const leftPct = totalDmg > 0 ? Math.round(snap.left.totalDamage / totalDmg * 100) : 50
    const rightPct = 100 - leftPct

    const leftColor = getSkillColor(snap.left.skillType, 'left')
    const rightColor = getSkillColor(snap.right.skillType, 'right')

    const renderSkillBar = (stats: SkillFightStats, label: string, dps: number, nameColor: string): string => {
      const { CRIT, HIT, GRAZE, MISS } = stats.hitsByResult
      const total = CRIT + HIT + GRAZE + MISS

      let barHtml: string
      if (total === 0) {
        barHtml = '<div class="fo-bar-seg" style="width:100%;background:#333;"></div>'
      } else {
        const seg = (count: number, color: string): string => {
          if (count === 0) return ''
          const w = (count / total * 100).toFixed(1)
          return `<div class="fo-bar-seg" style="width:${w}%;background:${color};"></div>`
        }
        barHtml = seg(CRIT, '#FFD700') + seg(HIT, '#FF8C00') + seg(GRAZE, '#4A9EFF') + seg(MISS, '#555')
      }

      let avgIdle: string
      if (stats.touchGaps.length >= 2) {
        const sum = stats.touchGaps.reduce((a, b) => a + b, 0)
        avgIdle = (sum / stats.touchGaps.length / 1000).toFixed(1) + 's'
      } else {
        avgIdle = '—'
      }

      return `
<div class="fo-skill">
  <div class="fo-skill-name" style="color:${nameColor}">${label}</div>
  <div class="fo-bar-row">
    <div class="fo-bar">${barHtml}</div>
    <span class="fo-shots">${stats.fireCount} shots</span>
  </div>
  <div class="fo-legend">
    <span class="fo-dot" style="background:#FFD700">crit</span>
    <span class="fo-dot" style="background:#FF8C00">hit</span>
    <span class="fo-dot" style="background:#4A9EFF">graze</span>
    <span class="fo-dot" style="background:#555">miss</span>
  </div>
  <div class="fo-stats">${fmt1(dps)} DPS &nbsp;|&nbsp; ${stats.totalDamage} dmg &nbsp;|&nbsp; idle: ${avgIdle}</div>
</div>`
    }

    const leftLabel = snap.left.skillType.replace(/_/g, ' ').toUpperCase()
    const rightLabel = snap.right.skillType.replace(/_/g, ' ').toUpperCase()

    const xpAfter = getXpProgress(game.playerLevel, game.playerXp)
    const xpBefore = game.pendingLevelUp
      ? getXpProgress(game.playerLevel - 1, game.playerXp - 1)
      : getXpProgress(game.playerLevel, game.playerXp - 1)
    const beforePct = Math.round(xpBefore.progress * 100)
    const afterPct = Math.round(xpAfter.progress * 100)
    const levelUpBadge = game.pendingLevelUp
      ? `<div class="fo-level-up-badge">LEVEL UP!</div>`
      : ''
    const xpLabel = xpAfter.isMax ? 'MAX LEVEL' : `${game.playerXp} / ${xpAfter.nextThreshold} XP`

    contentEl.innerHTML = `
<div class="fo-header">
  <span class="fo-title">FIGHT OVERVIEW</span>
  <span class="fo-meta">${this._lastEnemyName} &bull; ${fmt1(durationSec)}s &bull; ${fmt1(totalDps)} DPS</span>
</div>
${renderSkillBar(snap.left, leftLabel, leftDps, leftColor)}
${renderSkillBar(snap.right, rightLabel, rightDps, rightColor)}
<div class="fo-dmg-split-wrap">
  <div class="fo-dmg-split-title">DAMAGE SPLIT</div>
  <div class="fo-dmg-split">
    <div class="fo-dmg-seg" style="width:${leftPct}%;background:${leftColor};"></div>
    <div class="fo-dmg-seg" style="width:${rightPct}%;background:${rightColor};"></div>
  </div>
  <div class="fo-dmg-split-legend">
    <span style="color:${leftColor}">${leftLabel} ${snap.left.totalDamage} (${leftPct}%)</span>
    <span style="color:${rightColor}">${rightLabel} ${snap.right.totalDamage} (${rightPct}%)</span>
  </div>
</div>
<div class="fo-xp-section">
  <div class="fo-xp-row">
    <div class="fo-xp-gained">+1 XP</div>
    <div id="fo-xp-level-num" class="fo-xp-level-num">Lvl ${game.playerLevel}</div>
  </div>
  ${levelUpBadge}
  <div class="fo-xp-track" id="fo-xp-track">
    <div class="fo-xp-base" id="fo-xp-base" style="width:${beforePct}%"></div>
    <div class="fo-xp-gain" id="fo-xp-gain-bar" style="width:0%"></div>
  </div>
  <div class="fo-xp-label">${xpLabel}</div>
</div>`

    this._animateXpBar(game.pendingLevelUp, beforePct, afterPct)
  }

  private _animateXpBar(pendingLevelUp: boolean, beforePct: number, afterPct: number): void {
    if (pendingLevelUp) {
      requestAnimationFrame(() => {
        const gainBar = document.getElementById('fo-xp-gain-bar')
        if (gainBar) gainBar.style.width = (100 - beforePct) + '%'
      })
      setTimeout(() => {
        const track = document.getElementById('fo-xp-track')
        const gainBar = document.getElementById('fo-xp-gain-bar')
        const baseBar = document.getElementById('fo-xp-base')
        const levelNum = document.getElementById('fo-xp-level-num')
        if (track) track.classList.add('fo-xp-pop')
        if (levelNum) levelNum.classList.add('fo-lvl-pop')
        setTimeout(() => {
          if (track) track.classList.remove('fo-xp-pop')
          if (levelNum) levelNum.classList.remove('fo-lvl-pop')
          if (gainBar) { gainBar.style.transition = 'none'; gainBar.style.width = '0%' }
          if (baseBar) { baseBar.style.width = '0%' }
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (gainBar) { gainBar.style.transition = 'width 0.6s ease-out'; gainBar.style.width = afterPct + '%' }
            })
          })
        }, 400)
      }, 750)
    } else {
      requestAnimationFrame(() => {
        const gainBar = document.getElementById('fo-xp-gain-bar')
        if (gainBar) gainBar.style.width = (afterPct - beforePct) + '%'
      })
    }
  }

  // -----------------------------------------------------------------------
  // Upgrade picker
  // -----------------------------------------------------------------------

  private _buildUpgradeTreeDom(): void {
    if (!this.upgradeTree || !this.upgradeCrossContainer) return
    this.upgradeTree.innerHTML = ''
    this.upgradeCrossContainer.innerHTML = ''
    this.upgradeNodeEls.clear()

    for (const path of UPGRADE_TREE_COLUMNS) {
      const col = document.createElement('div')
      col.className = 'upgrade-col'
      const header = document.createElement('div')
      header.className = 'upgrade-col-header'
      header.textContent = UPGRADE_PATH_TITLES[path]
      col.appendChild(header)
      const nodesInCol = UPGRADE_NODES.filter((n) => n.path === path)
      for (const node of nodesInCol) {
        const btn = this._createUpgradeNodeButton(node.id, node.title, node.description)
        col.appendChild(btn)
      }
      this.upgradeTree.appendChild(col)
    }

    const crossWrap = document.createElement('div')
    crossWrap.style.display = 'flex'
    crossWrap.style.gap = '6px'
    const crossNodes = UPGRADE_NODES.filter((n) => n.path === 'quick_chain')
    for (const node of crossNodes) {
      const btn = this._createUpgradeNodeButton(node.id, node.title, node.description)
      btn.style.flex = '1'
      crossWrap.appendChild(btn)
    }
    this.upgradeCrossContainer.appendChild(crossWrap)
  }

  private _createUpgradeNodeButton(nodeId: UpgradeNodeId, title: string, description: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'upgrade-node'
    btn.type = 'button'
    btn.dataset['nodeId'] = nodeId
    btn.innerHTML = `<span class="node-title">${title}</span><span class="node-desc">${description}</span>`
    btn.addEventListener('click', () => this._onUpgradePicked(nodeId))
    this.upgradeNodeEls.set(nodeId, btn)
    return btn
  }

  private _onUpgradePicked(nodeId: UpgradeNodeId): void {
    if (!this._lastGame?.pendingLevelUp) return
    if (!this._lastGlobalUpgrades) return
    if (getUpgradeNodeStatus(this._lastGlobalUpgrades, nodeId) !== 'available') return
    this.onConfirmUpgrade(nodeId)
    this.deliveryRenderer.cancelFlying()
    this.onNextLevel()
  }

  private _updateUpgradePicker(game: GlobalSnapshot): void {
    if (!this.upgradeOverlay) return
    if (game.phase === 'fight_overview' && !this._showUpgradeAfterFightOverview) return
    const shouldShow = game.pendingLevelUp
    if (shouldShow) {
      if (!this._upgradePickerVisible) {
        if (this.upgradeLevelLabel) this.upgradeLevelLabel.textContent = `LEVEL ${game.playerLevel} REACHED`
        this.upgradeOverlay.classList.remove('hidden')
        this._upgradePickerVisible = true
      }
      if (this._lastGlobalUpgrades) {
        this._refreshUpgradeNodeStatuses(this._lastGlobalUpgrades)
      }
    } else if (this._upgradePickerVisible) {
      this.upgradeOverlay.classList.add('hidden')
      this._upgradePickerVisible = false
    }
  }

  private _refreshUpgradeNodeStatuses(upgrades: GlobalUpgradeState): void {
    for (const [nodeId, el] of this.upgradeNodeEls) {
      const status = getUpgradeNodeStatus(upgrades, nodeId)
      el.classList.toggle('available', status === 'available')
      el.classList.toggle('locked',    status === 'locked')
      el.classList.toggle('unlocked',  status === 'unlocked')
      el.disabled = status !== 'available'
    }
  }
}
