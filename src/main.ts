import Phaser from 'phaser'
import { LoadingScene } from './scenes/LoadingScene'
import { BattleScene } from './scenes/BattleScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844,
  },
  scene: [LoadingScene, BattleScene],
  input: {
    touch: true,
    mouse: true,
    activePointers: 6,
  },
}

const game = new Phaser.Game(config)

if (import.meta.env.DEV) {
  // Test bridge — exposes game internals for automated testing
  // Tree-shaken in production builds
  import('./tests/helpers/testBridge').then(({ installTestBridge }) => {
    installTestBridge(game)
  })
}

export { game }
