import Phaser from 'phaser'
import { characterRegistry } from '../game/CharacterRegistry'
import type { CharacterManifest } from '../game/CharacterRegistry'
import { gameMachine } from '../game/GameStateMachine'
import { ENEMY_POOL } from '../game/constants'
import { maskDetector, preloadCharacterAssets, finishPreloadCharacter } from './rendering/characterAssets'

// Static manifest imports — Vite resolves JSON imports at build time
import stoneGiantManifest from '../assets/characters/stone-giant/manifest.json'
import plagueRatManifest from '../assets/characters/plague-rat/manifest.json'
import iceGiantManifest from '../assets/characters/ice-giant/manifest.json'
import crystalSpiderManifest from '../assets/characters/crystal-spider/manifest.json'
import emberWispManifest from '../assets/characters/ember-wisp/manifest.json'
import ironGolemManifest from '../assets/characters/iron-golem/manifest.json'
import mirrorKnightManifest from '../assets/characters/mirror-knight/manifest.json'
import ancientTreantManifest from '../assets/characters/ancient-treant/manifest.json'
import goblinScoutManifest from '../assets/characters/goblin-scout/manifest.json'
import orcWarriorManifest from '../assets/characters/orc-warrior/manifest.json'
import insectSwarmManifest from '../assets/characters/insect-swarm/manifest.json'
import barnSpiderManifest from '../assets/characters/barn-spider/manifest.json'
import wolfManifest from '../assets/characters/wolf/manifest.json'
import wildBoarManifest from '../assets/characters/wild-boar/manifest.json'
import banditManifest from '../assets/characters/bandit/manifest.json'

/** All character manifests to register and load. */
const ALL_MANIFESTS: CharacterManifest[] = [
  stoneGiantManifest,
  plagueRatManifest,
  iceGiantManifest,
  crystalSpiderManifest,
  emberWispManifest,
  ironGolemManifest,
  mirrorKnightManifest,
  ancientTreantManifest,
  goblinScoutManifest,
  orcWarriorManifest,
  insectSwarmManifest,
  barnSpiderManifest,
  wolfManifest,
  wildBoarManifest,
  banditManifest,
]

export class LoadingScene extends Phaser.Scene {
  private _fill: HTMLElement | null = null
  private _label: HTMLElement | null = null
  /** Manifest id of the first enemy, preloaded here; the rest stream in during battle. */
  private _firstId: string | undefined
  /** Mask references for the first enemy, decoded in create() once loading completes. */
  private _firstMaskRefs: ReturnType<typeof preloadCharacterAssets> = []

  constructor() {
    super({ key: 'LoadingScene' })
  }

  preload(): void {
    this._fill = document.getElementById('loading-fill')
    this._label = document.getElementById('loading-label')

    this.load.on('progress', (value: number) => {
      if (this._fill) this._fill.style.width = `${value * 100}%`
      if (this._label) this._label.textContent = `Loading… ${Math.round(value * 100)} %`
    })

    // Register all manifests into the global CharacterRegistry
    for (const manifest of ALL_MANIFESTS) {
      if (!characterRegistry.has(manifest.id)) {
        characterRegistry.register(manifest)
      }
    }

    // Share the mask detector with the game before the first level loads.
    gameMachine.setMaskDetector(maskDetector)

    // Only the first enemy blocks the loading screen — the remaining campaign
    // characters stream in during the first battle (BattleScene background load).
    const firstId = ENEMY_POOL[0].manifestId
    if (firstId !== undefined && characterRegistry.has(firstId)) {
      this._firstId = firstId
      this._firstMaskRefs = preloadCharacterAssets(this, firstId)
    }
  }

  create(): void {
    if (this._firstId !== undefined) {
      finishPreloadCharacter(this, this._firstId, this._firstMaskRefs)
    }
    document.getElementById('loading-screen')?.classList.add('hidden')
    this.scene.start('BattleScene')
  }
}
