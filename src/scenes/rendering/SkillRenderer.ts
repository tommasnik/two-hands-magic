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
 * Renders all skill-specific projectile visuals and overlays (frozen, discharge, …).
 * Owns fire particle state for fireball trail animation.
 * Phaser-free — uses Canvas 2D API only.
 */
export class SkillRenderer {
  private fireParticles: FireParticle[] = []

  update(dtS: number, activeProjectiles: Projectile[]): void {
    // Advance existing particles
    for (let i = this.fireParticles.length - 1; i >= 0; i--) {
      const fp = this.fireParticles[i]
      fp.age += dtS
      fp.x += fp.vx * dtS
      fp.y += fp.vy * dtS
      fp.vy -= 30 * dtS
      if (fp.age > fp.life) this.fireParticles.splice(i, 1)
    }

    // Emit fire particles behind each fireball
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
      // Diamond (rotated square) shard flying in direction of travel
      const angle = Math.atan2(dy, dx)
      const half = 8 * radiusScale
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(angle)
      ctx.shadowBlur = 18; ctx.shadowColor = '#aaddff'
      ctx.fillStyle = '#aaddff'
      ctx.beginPath()
      ctx.moveTo(0, -half)
      ctx.lineTo(half * 0.6, 0)
      ctx.lineTo(0, half)
      ctx.lineTo(-half * 0.6, 0)
      ctx.closePath()
      ctx.fill()
      // Bright core glint
      ctx.shadowBlur = 6; ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(0, -half * 0.4)
      ctx.lineTo(half * 0.25, 0)
      ctx.lineTo(0, half * 0.4)
      ctx.lineTo(-half * 0.25, 0)
      ctx.closePath()
      ctx.fill()
      // Ice trail
      ctx.rotate(-angle)
      ctx.translate(-px, -py)
      ctx.strokeStyle = 'rgba(170,221,255,0.4)'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - nx * 16, py - ny * 16); ctx.stroke()
      ctx.restore()
      return
    }

    // Default: slow_shot / fast_shot
    const slot = dynamicLayout.find(s => {
      const ddx = s.x - proj.origin.x, ddy = s.y - proj.origin.y
      return ddx * ddx + ddy * ddy < 100
    })
    const color = slot ? _slotColor(slot) : '#ffffff'

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
   * Draws the ice crystal frozen overlay over the enemy while freeze is active.
   * 6-spike burst centered on the enemy, #88CCFF fill / #FFFFFF stroke, 50% alpha.
   */
  drawFrozenOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
    if (state.enemyFrozenUntilMs <= state.elapsedMs) return

    const cx = state.enemy.x
    const cy = state.enemy.y
    const displayW = state.enemyDisplayWidth ?? 128
    const outerR = displayW * 0.48
    const innerR = outerR * 0.22
    const spikes = 6

    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#88CCFF'
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1.5
    ctx.shadowBlur = 12
    ctx.shadowColor = '#aaddff'

    ctx.beginPath()
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR
      const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}

function _slotColor(slot: { side: 'left' | 'right'; skillType: string }): string {
  if (slot.skillType === 'white_shot') return '#ffffff'
  if (slot.skillType === 'fireball')   return '#ff6a00'
  if (slot.skillType === 'slow_shot')  return slot.side === 'left' ? '#5cff3a' : '#3a8cff'
  if (slot.skillType === 'fast_shot')  return slot.side === 'left' ? '#ff9410' : '#ff2a3c'
  if (slot.skillType === 'ice_crystal') return '#aaddff'
  return '#b833ff'
}
