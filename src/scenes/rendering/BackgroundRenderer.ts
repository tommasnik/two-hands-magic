import { GAME_WIDTH, GAME_HEIGHT, PIXELS_PER_CM } from '../../game/constants'

/**
 * Renders the static background gradient + grid.
 * No game-state dependency — called once per frame before all other renderers.
 */
export class BackgroundRenderer {
  render(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    g.addColorStop(0, '#10003a')
    g.addColorStop(1, '#04000c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    ctx.strokeStyle = 'rgba(120, 60, 200, 0.08)'
    ctx.lineWidth = 1
    const step = PIXELS_PER_CM
    ctx.beginPath()
    for (let x = 0; x <= GAME_WIDTH; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, GAME_HEIGHT) }
    for (let y = 0; y <= GAME_HEIGHT; y += step) { ctx.moveTo(0, y); ctx.lineTo(GAME_WIDTH, y) }
    ctx.stroke()
  }
}
