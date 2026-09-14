/**
 * Runtime CompleteShelf cover atlas + document patches.
 * Disk HTML stays byte-exact; the iframe loads a blob copy with Acharya photos.
 */

const SLOT_W = 512
const SLOT_H = 768

/** Seven CompleteShelf volumes → Acharya bright product shots (no *-forest cutouts). */
export const COVER_IMAGE_MAP = [
  { bookId: 'codex', title: 'Traditional Maize', file: 'closeup-bright.jpg' },
  { bookId: 'claude-code', title: 'Corn Puff Pipes', file: 'closeup-bright.jpg' },
  { bookId: 'cursor', title: 'Handmade Batch', file: 'basket-bright.jpg' },
  { bookId: 'antigravity', title: 'Light & Crisp', file: 'closeup-bright.jpg' },
  { bookId: 'figma', title: 'Snack Bags', file: 'basket-bright.jpg' },
  { bookId: 'framer', title: 'Party Packs', file: 'basket-bright.jpg' },
  { bookId: 'xcode', title: 'Bulk Order', file: 'bulk-bright.jpg' },
] as const

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${src}`))
    img.src = src
  })
}

/** Draw image to cover a 2:3 slot with center-crop (object-fit: cover). */
function drawCoverSlot(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const ir = img.naturalWidth / img.naturalHeight
  const tr = dw / dh
  let sx = 0
  let sy = 0
  let sw = img.naturalWidth
  let sh = img.naturalHeight
  if (ir > tr) {
    sw = img.naturalHeight * tr
    sx = (img.naturalWidth - sw) / 2
  } else {
    sh = img.naturalWidth / tr
    sy = (img.naturalHeight - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)

  // Soft edge shade matching CompleteShelf atlas treatment
  const edge = ctx.createLinearGradient(dx, dy, dx + dw, dy)
  edge.addColorStop(0, 'rgba(0,0,0,0.14)')
  edge.addColorStop(0.055, 'rgba(255,255,255,0.02)')
  edge.addColorStop(0.93, 'rgba(255,255,255,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.1)')
  ctx.fillStyle = edge
  ctx.fillRect(dx, dy, dw, dh)
}

export async function buildCoverAtlasDataUrl(baseUrl: string): Promise<string> {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const images = await Promise.all(
    COVER_IMAGE_MAP.map((slot) => loadImage(`${base}product/${slot.file}`)),
  )

  const canvas = document.createElement('canvas')
  canvas.width = SLOT_W * COVER_IMAGE_MAP.length
  canvas.height = SLOT_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')

  images.forEach((img, i) => {
    drawCoverSlot(ctx, img, i * SLOT_W, 0, SLOT_W, SLOT_H)
  })

  // JPEG keeps the blob HTML smaller than PNG; Image() accepts it.
  return canvas.toDataURL('image/jpeg', 0.9)
}

function patchShelfHtml(html: string, atlasDataUrl: string): string {
  const atlasRe = /const COVER_ATLAS_DATA = "data:image\/[a-zA-Z0-9+.-]+;base64,[^"]+"/
  if (!atlasRe.test(html)) {
    throw new Error('COVER_ATLAS_DATA anchor not found in CompleteShelf HTML')
  }
  let out = html.replace(atlasRe, `const COVER_ATLAS_DATA = "${atlasDataUrl}"`)

  // Hide stock foil lettering so product photos read cleanly on covers.
  out = out.replace(
    'frontPivot.add(foilPlane);',
    'foilPlane.visible = false; frontPivot.add(foilPlane);',
  )
  out = out.replace(
    'backPivot.add(backFoilPlane);',
    'backFoilPlane.visible = false; backPivot.add(backFoilPlane);',
  )
  out = out.replace(
    'motion.add(spineFoil);',
    'spineFoil.visible = false; motion.add(spineFoil);',
  )

  return out
}

/**
 * Fetch the packaged byte-exact HTML, swap the cover atlas (and foil visibility)
 * in memory, return a same-origin blob URL for the iframe.
 */
export async function createAcharyaShelfBlobUrl(
  packagedHtmlUrl: string,
  baseUrl: string,
): Promise<string> {
  const html = await fetch(packagedHtmlUrl).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch shelf HTML: ${r.status}`)
    return r.text()
  })
  const atlasDataUrl = await buildCoverAtlasDataUrl(baseUrl)
  const patched = patchShelfHtml(html, atlasDataUrl)
  return URL.createObjectURL(new Blob([patched], { type: 'text/html;charset=utf-8' }))
}
