import Phaser from 'phaser'
import {
  STONE_GIANT_IDLE_FRAME_COUNT,
  STONE_GIANT_ATTACK_FRAME_COUNT,
} from '../game/constants'

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' })
  }

  preload(): void {
    // Stone Giant sprite frames
    for (let i = 0; i < STONE_GIANT_IDLE_FRAME_COUNT; i++) {
      this.load.image(
        `stone_giant_idle_${i}`,
        `src/assets/characters/stone-giant/frames/idle_${String(i).padStart(2, '0')}.png`,
      )
    }
    for (let i = 0; i < STONE_GIANT_ATTACK_FRAME_COUNT; i++) {
      this.load.image(
        `stone_giant_attack_${i}`,
        `src/assets/characters/stone-giant/frames/attack_${String(i).padStart(2, '0')}.png`,
      )
    }

    // Stone Giant hit zone masks
    for (let i = 0; i < STONE_GIANT_IDLE_FRAME_COUNT; i++) {
      this.load.image(
        `stone_giant_mask_idle_${i}`,
        `src/assets/characters/stone-giant/masks/idle_${String(i).padStart(2, '0')}.png`,
      )
    }
    for (let i = 0; i < STONE_GIANT_ATTACK_FRAME_COUNT; i++) {
      this.load.image(
        `stone_giant_mask_attack_${i}`,
        `src/assets/characters/stone-giant/masks/attack_${String(i).padStart(2, '0')}.png`,
      )
    }
  }

  create(): void {
    this.scene.start('BattleScene')
  }
}
