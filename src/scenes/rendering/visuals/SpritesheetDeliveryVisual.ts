// ============================================================
// SpritesheetDeliveryVisual — worked example proving the DeliveryVisual contract
// supports spritesheet / Phaser-GameObject visuals with ZERO BattleScene changes
// (TASK-60.5 AC #4). Adding this style of visual is purely: write this file +
// register it in the registry under a visualKey.
//
// Unlike the procedural visuals (which draw into the scene's manual canvas pass),
// this creates a real Phaser GameObject in spawn(), repositions it in update(),
// and destroys it on connect / shutdown — Phaser renders it in its own pass.
//
// Because asset loading for delivery spritesheets is out of scope for this task,
// the visual is defensive: if its texture key is not present it no-ops, so it
// stays a safe, registerable example/stub. Swap in a loaded texture + animation
// key and it becomes a fully animated delivery without any scene edits.
// ============================================================

import type Phaser from 'phaser'
import { DELIVERY_CONNECT_FLASH_MS } from '../../../game/constants'
import type { DeliveryVisual, DeliveryRenderContext, RenderDelivery } from '../DeliveryVisual'

export class SpritesheetDeliveryVisual implements DeliveryVisual {
  /** Live sprites keyed by delivery id (one instance is shared across deliveries). */
  private readonly sprites = new Map<string, Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>()

  /**
   * @param textureKey Phaser texture key to render. If absent at runtime the
   *                   visual silently no-ops (acts as a documented stub).
   * @param animKey    Optional animation key to play (when the texture is a
   *                   loaded spritesheet with a registered animation).
   */
  constructor(
    private readonly textureKey: string,
    private readonly animKey?: string,
  ) {}

  spawn(d: RenderDelivery, rc: DeliveryRenderContext): void {
    const { scene } = rc
    if (!scene.textures.exists(this.textureKey)) return
    if (this.animKey) {
      // Use a Sprite when an animation key is provided — Sprite supports play().
      const sprite = scene.add.sprite(d.origin.x, d.origin.y, this.textureKey)
      sprite.setDepth(50)
      sprite.play(this.animKey)
      this.sprites.set(d.id, sprite)
    } else {
      const img = scene.add.image(d.origin.x, d.origin.y, this.textureKey)
      img.setDepth(50)
      this.sprites.set(d.id, img)
    }
  }

  update(d: RenderDelivery, _rc: DeliveryRenderContext): void {
    const img = this.sprites.get(d.id)
    if (!img) return
    if (d.connectAgeMs !== undefined) {
      // Fade out the impact frame over the connect flash window, then release.
      const t = Math.min(1, d.connectAgeMs / DELIVERY_CONNECT_FLASH_MS)
      img.setAlpha(1 - t)
      if (t >= 1) {
        img.destroy()
        this.sprites.delete(d.id)
      }
      return
    }
    img.setPosition(
      d.origin.x + (d.target.x - d.origin.x) * d.progress,
      d.origin.y + (d.target.y - d.origin.y) * d.progress,
    )
  }

  onConnect(d: RenderDelivery): void {
    // Keep the sprite around for the flash; update() fades it. Reposition to the
    // connect point so the impact reads at the player.
    const img = this.sprites.get(d.id)
    if (img) img.setPosition(d.target.x, d.target.y)
  }

  destroy(): void {
    for (const img of this.sprites.values()) img.destroy()
    this.sprites.clear()
  }
}
