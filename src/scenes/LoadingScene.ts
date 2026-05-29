import Phaser from 'phaser'
import {
  STONE_GIANT_IDLE_FRAME_COUNT,
  STONE_GIANT_THROW_FRAME_COUNT,
} from '../game/constants'

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' })
  }

  preload(): void {
    // Stone Giant sprite frames — individual textures per animation frame
    for (let i = 0; i < STONE_GIANT_IDLE_FRAME_COUNT; i++) {
      this.load.image(
        `stone_giant_idle_${i}`,
        `src/assets/stone-giant/frames/idle_${String(i).padStart(2, '0')}.png`,
      )
    }
    for (let i = 0; i < STONE_GIANT_THROW_FRAME_COUNT; i++) {
      this.load.image(
        `stone_giant_throw_${i}`,
        `src/assets/stone-giant/frames/throw_${String(i).padStart(2, '0')}.png`,
      )
    }

    // Stone Giant hit zone masks — loaded as textures so we can extract pixel data
    for (let i = 0; i < STONE_GIANT_IDLE_FRAME_COUNT; i++) {
      this.load.image(
        `stone_giant_mask_idle_${i}`,
        `src/assets/stone-giant/masks/mask_idle_${String(i).padStart(2, '0')}.png`,
      )
    }
    for (let i = 0; i < STONE_GIANT_THROW_FRAME_COUNT; i++) {
      this.load.image(
        `stone_giant_mask_throw_${i}`,
        `src/assets/stone-giant/masks/mask_throw_${String(i).padStart(2, '0')}.png`,
      )
    }
  }

  create(): void {
    this.scene.start('BattleScene')
  }
}
