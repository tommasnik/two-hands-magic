import Phaser from 'phaser'
import { characterRegistry } from '../game/CharacterRegistry'
import type { CharacterManifest } from '../game/CharacterRegistry'

// Static manifest imports — Vite resolves JSON imports at build time
import stoneGiantManifest from '../assets/characters/stone-giant/manifest.json'
import plagueRatManifest from '../assets/characters/plague-rat/manifest.json'
import iceGiantManifest from '../assets/characters/ice-giant/manifest.json'
import crystalSpiderManifest from '../assets/characters/crystal-spider/manifest.json'
import emberWispManifest from '../assets/characters/ember-wisp/manifest.json'
import ironGolemManifest from '../assets/characters/iron-golem/manifest.json'
import mirrorKnightManifest from '../assets/characters/mirror-knight/manifest.json'
import ancientTreantManifest from '../assets/characters/ancient-treant/manifest.json'

/** All character manifests to register and load. */
const ALL_MANIFESTS: CharacterManifest[] = [
  stoneGiantManifest as CharacterManifest,
  plagueRatManifest as CharacterManifest,
  iceGiantManifest as CharacterManifest,
  crystalSpiderManifest as CharacterManifest,
  emberWispManifest as CharacterManifest,
  ironGolemManifest as CharacterManifest,
  mirrorKnightManifest as CharacterManifest,
  ancientTreantManifest as CharacterManifest,
]

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' })
  }

  preload(): void {
    // Register all manifests into the global CharacterRegistry
    for (const manifest of ALL_MANIFESTS) {
      if (!characterRegistry.has(manifest.id)) {
        characterRegistry.register(manifest)
      }
    }

    // Generically load all frames and masks for every registered character
    for (const manifest of characterRegistry.getAll()) {
      const { id, spriteKey, animations } = manifest

      for (const [animKey, anim] of Object.entries(animations)) {
        // Load sprite frames
        for (let i = 0; i < anim.frameCount; i++) {
          const paddedIndex = String(i).padStart(2, '0')
          this.load.image(
            `${spriteKey}_${animKey}_${i}`,
            `src/assets/characters/${id}/frames/${animKey}_${paddedIndex}.png`,
          )
        }

        // Load hit-zone masks (only if masks exist for this animation)
        if (anim.hasMasks) {
          for (let i = 0; i < anim.frameCount; i++) {
            const paddedIndex = String(i).padStart(2, '0')
            this.load.image(
              `${spriteKey}_mask_${animKey}_${i}`,
              `src/assets/characters/${id}/masks/${animKey}_${paddedIndex}.png`,
            )
          }
        }
      }
    }
  }

  create(): void {
    this.scene.start('BattleScene')
  }
}
