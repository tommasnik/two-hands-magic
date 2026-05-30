import { PROJECTILE_BASE_RADIUS_PX } from '../../game/constants'
import type { Projectile, GameState } from '../../types'
import type { ActiveTouchPointPos } from '../../game/entities/touchPoints'

interface FireParticle {
  x: number; y: number
  vx: number; vy: number
  life: number; age: number
  size: number
}

/**
 * Single source of truth for skill display colors.
 * Used by slot rings, lasers, projectile trails, and fight overview.
 */
export function getSkillColor(skillType: string, side: 'left' | 'right'): string {
  switch (skillType) {
    case 'white_shot':    return '#ffffff'
    case 'fireball':      return '#ff6a00'
    case 'slow_shot':     return side === 'left' ? '#5cff3a' : '#3a8cff'
    case 'fast_shot':     return side === 'left' ? '#ff9410' : '#ff2a3c'
    case 'ice_crystal':   return '#88ccff'
    case 'lightning_blast': return '#ffe066'
    default:              return '#b833ff'
  }
}

/**
 * Renders all skill-specific projectile visuals and overlays (frozen, discharge, …).
 * Owns fire particle state for fireball trail animation.
 * Phaser-free — uses Canvas 2D API only.
 */
export class SkillRenderer {
  private fireParticles: FireParticle[] = []

  update(dtS: number, activeProjectiles: Projectile[]): void {
    for (let i = this.fireParticles.length - 1; i >= 0; i--) {
      const fp = this.fireParticles[i]
      fp.age += dtS
      fp.x += fp.vx * dtS
      fp.y += fp.vy * dtS
      fp.vy -= 30 * dtS
      if (fp.age > fp.life) this.fireParticles.splice(i, 1)
    }

    for (const proj of activeProjectiles) {
      if (!proj.alive || proj.skillType !== 'fireball') continue
      const px = proj.origin.x + (proj.target.x - proj.origin.x) * proj.progress
      const py = proj.origin.y + (proj.target.y - proj.origin.y) * proj.progress
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * Math.PI * 2
        const spd = 20 + Math.random() * 40
        this.fireParticles.push({
          x: px + (Math.random() - 0.5) * 4,
          y: py + (Math.random() - 0.5) * 4,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.15 + Math.random() * 0.15,
          age: 0,
          size: 3 + Math.random() * 3,
        })
      }
    }
  }

  drawFireParticles(ctx: CanvasRenderingContext2D): void {
    for (const fp of this.fireParticles) {
      const t = fp.age / fp.life
      const alpha = Math.max(0, 1 - t)
      const radius = fp.size * (1 - t * 0.6)
      const g = Math.round(230 * (1 - t) + 40 * t)
      ctx.save()
      ctx.globalAlpha = alpha * 0.85
      ctx.shadowBlur = 8; ctx.shadowColor = `rgb(255,${g},0)`
      ctx.fillStyle = `rgb(255,${g},0)`
      ctx.beginPath(); ctx.arc(fp.x, fp.y, radius, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }

  drawProjectile(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    proj: Projectile,
    dynamicLayout: ActiveTouchPointPos[],
  ): void {
    const dx = proj.target.x - proj.origin.x
    const dy = proj.target.y - proj.origin.y
    const dist = Math.hypot(dx, dy)
    const nx = dist > 0 ? dx / dist : 0
    const ny = dist > 0 ? dy / dist : -1
    const radiusScale = proj.projectileRadius / PROJECTILE_BASE_RADIUS_PX

    if (proj.skillType === 'white_shot') {
      ctx.save()
      ctx.shadowBlur = 16; ctx.shadowColor = '#ffffff'
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(px, py, 4 * radiusScale, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = 'rgba(200,220,255,0.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - nx * 14, py - ny * 14); ctx.stroke()
      ctx.shadowBlur = 8; ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(px, py, 2 * radiusScale, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      return
    }

    if (proj.skillType === 'fireball') {
      ctx.save()
      ctx.shadowBlur = 32; ctx.shadowColor = '#ff6a00'
      ctx.fillStyle = '#ff6a00'
      ctx.beginPath(); ctx.arc(px, py, 9 * radiusScale, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 18; ctx.fillStyle = '#ffe066'
      ctx.beginPath(); ctx.arc(px, py, 5 * radiusScale, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 8; ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(px, py, 2.5 * radiusScale, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      return
    }

    if (proj.skillType === 'ice_crystal') {
      // Crystal shard: elongated hexagonal shape (like a cut gem/prism) flying tip-first
      const angle = Math.atan2(dy, dx)
      const len = 14 * radiusScale  // length along travel axis
      const wid = 5 * radiusScale   // half-width perpendicular

      // Ice trail (drawn first, behind the shard)
      ctx.save()
      ctx.strokeStyle = 'rgba(136,204,255,0.35)'
      ctx.lineWidth = wid * 1.6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px - nx * len * 2.2, py - ny * len * 2.2)
      ctx.stroke()
      ctx.restore()

      // Shard body: pointy hexagonal prism shape, tip toward target
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(angle)
      ctx.shadowBlur = 20; ctx.shadowColor = '#88ccff'
      // Body fill
      ctx.fillStyle = '#5bb8ff'
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(len, 0)           // front tip
      ctx.lineTo(len * 0.3, -wid) // right front shoulder
      ctx.lineTo(-len * 0.6, -wid * 0.7) // right rear
      ctx.lineTo(-len, 0)          // rear tip
      ctx.lineTo(-len * 0.6, wid * 0.7)  // left rear
      ctx.lineTo(len * 0.3, wid)  // left front shoulder
      ctx.closePath()
      ctx.fill()
      // Bright facet highlight (top face of crystal)
      ctx.fillStyle = '#ccecff'
      ctx.shadowBlur = 0
      ctx.beginPath()
      ctx.moveTo(len, 0)
      ctx.lineTo(len * 0.3, -wid)
      ctx.lineTo(-len * 0.6, -wid * 0.7)
      ctx.lineTo(-len * 0.15, 0)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      return
    }

    // Default: slow_shot / fast_shot
    const slot = dynamicLayout.find(s => {
      const ddx = s.x - proj.origin.x, ddy = s.y - proj.origin.y
      return ddx * ddx + ddy * ddy < 100
    })
    const color = slot ? getSkillColor(slot.skillType, slot.side) : '#ffffff'

    ctx.save()
    ctx.shadowBlur = 24; ctx.shadowColor = color
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(px, py, 6 * radiusScale, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - nx * 22, py - ny * 22); ctx.stroke()
    ctx.shadowBlur = 10; ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(px, py, 2.5 * radiusScale, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  /**
   * Draws an ice crystal cluster over the enemy while freeze is active.
   * Crystal columns grow upward from the enemy's base — like a gem cluster.
   */
  drawFrozenOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
    if (state.enemyFrozenUntilMs <= state.elapsedMs) return

    const cx = state.enemy.x
    const cy = state.enemy.y
    const displayW = state.enemyDisplayWidth ?? 200
    const s = displayW / 200  // scale factor

    // Crystal columns: [offsetX, offsetY-from-center, halfWidth, height, tiltAngle]
    // Positioned at the lower half of the enemy, growing upward
    const columns: Array<[number, number, number, number, number]> = [
      [  0,    displayW * 0.12,  13 * s,  90 * s,   0     ],  // center — tallest
      [ -displayW * 0.18, displayW * 0.18,  9 * s,  65 * s,  -0.18 ],  // left-inner
      [  displayW * 0.18, displayW * 0.18,  9 * s,  65 * s,   0.18 ],  // right-inner
      [ -displayW * 0.35, displayW * 0.24,  6 * s,  42 * s,  -0.38 ],  // left-outer
      [  displayW * 0.35, displayW * 0.24,  6 * s,  42 * s,   0.38 ],  // right-outer
    ]

    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.shadowBlur = 16
    ctx.shadowColor = '#88ccff'

    for (const [ox, oy, hw, h, tilt] of columns) {
      const bx = cx + ox   // base x
      const by = cy + oy   // base y (lower part of enemy)
      _drawCrystalColumn(ctx, bx, by, hw, h, tilt)
    }
    ctx.restore()
  }
}

/**
 * Draws a single crystal column with base at (bx, by), pointing upward with optional tilt.
 * Shape: hexagonal prism with a faceted pointed tip (like the blue crystal in the reference).
 */
function _drawCrystalColumn(
  ctx: CanvasRenderingContext2D,
  bx: number, by: number,
  halfW: number, height: number,
  tilt: number,
): void {
  ctx.save()
  ctx.translate(bx, by)
  ctx.rotate(tilt)

  const tipY = -height
  const shoulderY = tipY + height * 0.28  // where tip meets the body
  const bodyTopY = tipY + height * 0.28
  const sw = halfW * 0.75   // body half-width at shoulder

  // Main body fill (deep blue)
  ctx.fillStyle = '#3388cc'
  ctx.beginPath()
  ctx.moveTo(0, tipY)            // apex
  ctx.lineTo(sw, shoulderY)      // right shoulder
  ctx.lineTo(halfW, bodyTopY + height * 0.08)
  ctx.lineTo(halfW, 0)           // right base
  ctx.lineTo(-halfW, 0)          // left base
  ctx.lineTo(-halfW, bodyTopY + height * 0.08)
  ctx.lineTo(-sw, shoulderY)     // left shoulder
  ctx.closePath()
  ctx.fill()

  // Left facet — lighter blue
  ctx.fillStyle = '#66aadd'
  ctx.beginPath()
  ctx.moveTo(0, tipY)
  ctx.lineTo(-sw, shoulderY)
  ctx.lineTo(-halfW, bodyTopY + height * 0.08)
  ctx.lineTo(-halfW, 0)
  ctx.lineTo(0, 0)
  ctx.closePath()
  ctx.fill()

  // Right facet highlight — bright (reflection)
  ctx.fillStyle = '#aaddff'
  ctx.globalAlpha = 0.7
  ctx.beginPath()
  ctx.moveTo(0, tipY)
  ctx.lineTo(sw, shoulderY)
  ctx.lineTo(halfW * 0.5, bodyTopY + height * 0.25)
  ctx.lineTo(halfW * 0.1, bodyTopY + height * 0.25)
  ctx.closePath()
  ctx.fill()

  // Outline
  ctx.globalAlpha = 0.8
  ctx.strokeStyle = '#cceeff'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, tipY)
  ctx.lineTo(sw, shoulderY)
  ctx.lineTo(halfW, bodyTopY + height * 0.08)
  ctx.lineTo(halfW, 0)
  ctx.lineTo(-halfW, 0)
  ctx.lineTo(-halfW, bodyTopY + height * 0.08)
  ctx.lineTo(-sw, shoulderY)
  ctx.closePath()
  ctx.stroke()

  ctx.restore()
}
