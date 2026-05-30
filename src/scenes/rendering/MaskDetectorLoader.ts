import Phaser from 'phaser'
import { MaskHitDetector } from '../../game/systems/MaskHitDetector'
import { characterRegistry } from '../../game/CharacterRegistry'
import { gameMachine } from '../../game/GameStateMachine'

/**
 * Extracts pixel data from all character mask textures and registers them with
 * a MaskHitDetector instance, then passes it to GameStateMachine.
 * Pre-loads all mask data at scene start — no per-frame texture reads.
 * Iterates over all registered characters generically via CharacterRegistry.
 */
export function initMaskDetector(textures: Phaser.Textures.TextureManager): void {
  const detector = new MaskHitDetector()

  for (const manifest of characterRegistry.getAll()) {
    for (const [animKey, anim] of Object.entries(manifest.animations)) {
      if (!anim.hasMasks) continue
      for (let i = 0; i < anim.frameCount; i++) {
        const textureKey = `${manifest.spriteKey}_mask_${animKey}_${i}`
        try {
          if (!textures.exists(textureKey)) continue
          const frame = textures.getFrame(textureKey)
          if (!frame || !frame.source.image) continue
          const img = frame.source.image as HTMLImageElement
          const canvas = document.createElement('canvas')
          canvas.width = frame.realWidth
          canvas.height = frame.realHeight
          const ctx2 = canvas.getContext('2d')
          if (!ctx2) continue
          ctx2.drawImage(img, 0, 0)
          const imageData = ctx2.getImageData(0, 0, frame.realWidth, frame.realHeight)
          detector.loadMaskData(manifest.spriteKey, animKey, i, new Uint8Array(imageData.data.buffer), frame.realWidth, frame.realHeight)
        } catch {
          // Texture extraction failed (e.g. headless test environment) — skip silently
        }
      }
    }
  }

  // Always register — even when no masks loaded (getZone returns 'none', graceful degradation)
  gameMachine.setMaskDetector(detector)
}
