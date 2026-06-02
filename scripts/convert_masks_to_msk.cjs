#!/usr/bin/env node
// One-time / re-runnable migration: convert legacy RGBA mask PNGs into the
// compact ".msk" binary format the game now loads at runtime.
//
// For each public/assets/characters/<id>/masks/<anim>_<NN>.png:
//   - decode the PNG, classify each pixel's color into a zone code,
//   - RLE-encode to <anim>_<NN>.msk,
//   - delete the original .png (unless --keep-png).
//
// Usage:
//   node scripts/convert_masks_to_msk.cjs            # convert all characters
//   node scripts/convert_masks_to_msk.cjs stone-giant
//   node scripts/convert_masks_to_msk.cjs --keep-png

const fs = require('fs')
const path = require('path')
const { classify, decodePNG, encodeMsk } = require('./mask_tools.cjs')

const ROOT = path.resolve(__dirname, '..', 'public', 'assets', 'characters')

function convertMask(pngPath) {
  const buffer = fs.readFileSync(pngPath)
  const { width, height, rgba } = decodePNG(buffer)
  const codes = new Uint8Array(width * height)
  for (let i = 0; i < codes.length; i++) {
    const o = i * 4
    codes[i] = classify(rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3])
  }
  const mskPath = pngPath.replace(/\.png$/, '.msk')
  fs.writeFileSync(mskPath, encodeMsk(codes, width, height))
  return { mskPath, bytesPng: buffer.length, bytesMsk: fs.statSync(mskPath).size }
}

function processCharacter(charId, keepPng) {
  const masksDir = path.join(ROOT, charId, 'masks')
  if (!fs.existsSync(masksDir)) return { count: 0, png: 0, msk: 0 }

  const pngs = fs.readdirSync(masksDir).filter(f => f.endsWith('.png')).sort()
  let png = 0, msk = 0
  for (const file of pngs) {
    const pngPath = path.join(masksDir, file)
    const r = convertMask(pngPath)
    png += r.bytesPng
    msk += r.bytesMsk
    if (!keepPng) fs.unlinkSync(pngPath)
  }
  if (pngs.length > 0) {
    console.log(`  ${charId}: ${pngs.length} masks  ${(png / 1024).toFixed(1)}KB png → ${(msk / 1024).toFixed(1)}KB msk`)
  }
  return { count: pngs.length, png, msk }
}

function main() {
  const args = process.argv.slice(2)
  const keepPng = args.includes('--keep-png')
  const targets = args.filter(a => !a.startsWith('--'))

  const charIds = targets.length > 0
    ? targets
    : fs.readdirSync(ROOT, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()

  let total = 0, totalPng = 0, totalMsk = 0
  for (const id of charIds) {
    const r = processCharacter(id, keepPng)
    total += r.count
    totalPng += r.png
    totalMsk += r.msk
  }
  console.log(`\nTotal: ${total} masks converted — ${(totalPng / 1024).toFixed(1)}KB png → ${(totalMsk / 1024).toFixed(1)}KB msk`)
}

main()
