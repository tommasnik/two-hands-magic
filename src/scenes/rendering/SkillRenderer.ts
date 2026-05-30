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
   * Draws a single large ice crystal column over the enemy while freeze is active.
   * Three vertical facets + three-part tip give a 3D hexagonal prism appearance.
   */
  drawFrozenOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
    if (state.enemyFrozenUntilMs <= state.elapsedMs) return

    const cx = state.enemy.x
    const displayW = state.enemyDisplayWidth ?? 200
    const totalW = displayW * 0.46
    const totalH = displayW * 0.92
    // Base sits slightly below enemy centre (toward feet)
    const baseY = state.enemy.y + displayW * 0.22

    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.shadowBlur = 24
    ctx.shadowColor = '#88ccff'
    _drawCrystalColumn(ctx, cx, baseY, totalW, totalH)
    ctx.restore()
  }
}

/**
 * Draws a single 3D-looking hexagonal crystal column.
 * Base at (cx, baseY), tip pointing upward.
 *
 * Facet layout (asymmetric — simulates viewing from slight right angle):
 *   Left face  (20% width) — dark, in shadow
 *   Center face(45% width) — medium, front-lit
 *   Right face (35% width) — bright, highlight / reflection
 * Tip mirrors the same three-facet scheme.
 */
function _drawCrystalColumn(
  ctx: CanvasRenderingContext2D,
  cx: number, baseY: number,
  totalW: number, totalH: number,
): void {
  const half = totalW / 2
  // Vertical facet dividers (x coords relative to cx)
  const xL  = cx - half           // left edge
  const xLD = cx - half * 0.60   // left-center divider
  const xRD = cx + half * 0.20   // right-center divider
  const xR  = cx + half           // right edge

  const apex  = baseY - totalH             // crystal tip
  const shldr = baseY - totalH * 0.68     // shoulder (tip-body boundary)
  const mid1  = baseY - totalH * 0.44     // first horizontal facet line
  const mid2  = baseY - totalH * 0.22     // second horizontal facet line

  // ── TIP ──────────────────────────────────────────────────────────────────
  // Left tip facet — dark
  ctx.fillStyle = '#1a5080'
  ctx.beginPath()
  ctx.moveTo(cx, apex); ctx.lineTo(xLD, shldr); ctx.lineTo(xL, shldr)
  ctx.closePath(); ctx.fill()

  // Center tip facet — medium blue
  ctx.fillStyle = '#3377bb'
  ctx.beginPath()
  ctx.moveTo(cx, apex); ctx.lineTo(xLD, shldr); ctx.lineTo(xRD, shldr)
  ctx.closePath(); ctx.fill()

  // Right tip facet — bright (highlight)
  ctx.fillStyle = '#77bbee'
  ctx.beginPath()
  ctx.moveTo(cx, apex); ctx.lineTo(xRD, shldr); ctx.lineTo(xR, shldr)
  ctx.closePath(); ctx.fill()

  // ── BODY ─────────────────────────────────────────────────────────────────
  // Left face — dark (in shadow)
  ctx.fillStyle = '#1a4f7a'
  ctx.beginPath()
  ctx.moveTo(xL, shldr); ctx.lineTo(xLD, shldr)
  ctx.lineTo(xLD, baseY); ctx.lineTo(xL, baseY)
  ctx.closePath(); ctx.fill()

  // Center face — medium blue, split at mid1/mid2 for depth
  ctx.fillStyle = '#2d6fa8'
  ctx.beginPath()
  ctx.moveTo(xLD, shldr); ctx.lineTo(xRD, shldr)
  ctx.lineTo(xRD, mid1);  ctx.lineTo(xLD, mid1)
  ctx.closePath(); ctx.fill()

  ctx.fillStyle = '#2a6399'
  ctx.beginPath()
  ctx.moveTo(xLD, mid1); ctx.lineTo(xRD, mid1)
  ctx.lineTo(xRD, mid2); ctx.lineTo(xLD, mid2)
  ctx.closePath(); ctx.fill()

  ctx.fillStyle = '#245e90'
  ctx.beginPath()
  ctx.moveTo(xLD, mid2); ctx.lineTo(xRD, mid2)
  ctx.lineTo(xRD, baseY); ctx.lineTo(xLD, baseY)
  ctx.closePath(); ctx.fill()

  // Right face — bright, with internal highlight streak
  ctx.fillStyle = '#4d99cc'
  ctx.beginPath()
  ctx.moveTo(xRD, shldr); ctx.lineTo(xR, shldr)
  ctx.lineTo(xR, baseY);  ctx.lineTo(xRD, baseY)
  ctx.closePath(); ctx.fill()

  // Specular streak on right face — simulates a sharp reflection line
  ctx.fillStyle = '#aaddff'
  ctx.globalAlpha = 0.55
  const streakX = xRD + (xR - xRD) * 0.28
  ctx.beginPath()
  ctx.moveTo(cx, apex)
  ctx.lineTo(streakX, shldr)
  ctx.lineTo(streakX, shldr + (baseY - shldr) * 0.55)
  ctx.lineTo(streakX - 3, shldr + (baseY - shldr) * 0.55)
  ctx.closePath(); ctx.fill()
  ctx.globalAlpha = 1

  // ── OUTLINES ─────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#99ddff'
  ctx.lineWidth = 1.2

  // Outer silhouette
  ctx.beginPath()
  ctx.moveTo(cx, apex)
  ctx.lineTo(xR, shldr); ctx.lineTo(xR, baseY)
  ctx.lineTo(xL, baseY); ctx.lineTo(xL, shldr)
  ctx.closePath(); ctx.stroke()

  // Tip facet dividers
  ctx.strokeStyle = '#77bbdd'
  ctx.lineWidth = 0.8
  ctx.beginPath(); ctx.moveTo(cx, apex); ctx.lineTo(xLD, shldr); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, apex); ctx.lineTo(xRD, shldr); ctx.stroke()

  // Vertical facet dividers (body)
  ctx.beginPath(); ctx.moveTo(xLD, shldr); ctx.lineTo(xLD, baseY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(xRD, shldr); ctx.lineTo(xRD, baseY); ctx.stroke()

  // Horizontal facet lines (subtle depth bands)
  ctx.strokeStyle = '#4488aa'
  ctx.lineWidth = 0.6
  ctx.beginPath(); ctx.moveTo(xLD, mid1); ctx.lineTo(xRD, mid1); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(xLD, mid2); ctx.lineTo(xRD, mid2); ctx.stroke()
  // Faint continuation across all faces
  ctx.strokeStyle = '#336688'
  ctx.beginPath(); ctx.moveTo(xL, mid1); ctx.lineTo(xLD, mid1); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(xRD, mid1); ctx.lineTo(xR, mid1); ctx.stroke()
}
