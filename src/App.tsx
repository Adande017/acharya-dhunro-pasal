import { useCallback, useState } from 'react'

import {
  CompleteShelfAcharya,
  COMPLETE_SHELF_DEFAULTS,
} from './CompleteShelfAcharya'
import './App.css'

const BASE = import.meta.env.BASE_URL
const PHONE_TEL = '+9779845044572'
const PHONE_DISPLAY = '+977 984-5044572'
const EMAIL = 'roms7291@gmail.com'
const MAILTO = `mailto:${EMAIL}`
const LOGO_PNG = `${BASE}brand/acharya-dhunro-pasal-logo.png`

/** First logo: yellow→green PipeMark from commit 5beac37. */
function PipeMark({ size = 36 }: { size?: number }) {
  const gid = `markGrad-${size}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="pipe-mark"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5C84A" />
          <stop offset="45%" stopColor="#E8A820" />
          <stop offset="100%" stopColor="#4A8C3A" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${gid})`} />
      <path
        d="M12 38c0-2 1.5-3.5 3.5-3.5H28c6 0 10-3 10-8.5 0-4.5-3-7.5-8-7.5H14.5C13 18.5 12 17.5 12 16s1-2.5 2.5-2.5H30c9 0 15 6 15 14.5S39 42.5 30 42.5H15.5C13.5 42.5 12 41 12 38Z"
        fill="#1A2414"
      />
      <circle cx="46" cy="40" r="7" fill="#1A2414" />
      <circle cx="46" cy="40" r="3.2" fill="#F5C84A" />
    </svg>
  )
}

/** Map CompleteShelf volume copy → Acharya product story (DOM only; HTML stays byte-exact). */
const TITLE_SWAPS: Record<string, string> = {
  Codex: 'Traditional Maize',
  'Claude Code': 'Corn Puff Pipes',
  Cursor: 'Handmade Batch',
  Antigravity: 'Light & Crisp',
  Figma: 'Snack Bags',
  Framer: 'Party Packs',
  Xcode: 'Bulk Order',
}

const NOTE_SWAPS: Record<string, string> = {
  'Precise intent, translated into tested systems.':
    'Non-hybrid maize, puffed into pipe-shaped snacks.',
  'Long context, held with deliberation and care.':
    'Light, crunchy pipes — snack culture with nutrition in mind.',
  'A fast line between the thought and the file.':
    'Small-batch craft from Acharya Dhunro Pasal.',
  'Ideas released from the flatness of the page.':
    'Airy texture, golden finish, ready to share.',
  'Components, conversations, and systems in common.':
    'Everyday packs for home and teatime.',
  'Structure becomes rhythm when the page begins to move.':
    'Celebration sizes for gatherings and gifting.',
  'A measured path from blueprint to living device.':
    'Wholesale and bulk — call to arrange delivery.',
}

function swapText(el: Element | null, map: Record<string, string>) {
  if (!el) return
  const raw = el.textContent?.trim() ?? ''
  if (map[raw]) el.textContent = map[raw]
}

function applyAcharyaScene(frame: HTMLIFrameElement) {
  const doc = frame.contentDocument
  if (!doc) return

  const identityStrong = doc.querySelector('.editorial-identity strong')
  const identitySpan = doc.querySelector('.editorial-identity span')
  const edition = doc.querySelector('.editorial-index span:first-child')
  const fallbackKicker = doc.querySelector('.fallback__kicker')
  const fallbackTitle = doc.querySelector('#fallback-title')

  if (identityStrong) identityStrong.textContent = 'Acharya Dhunro Pasal'
  if (identitySpan) identitySpan.textContent = 'Corn Puff Pipes · traditional maize'
  if (edition) edition.textContent = 'Pasal · Kathmandu'
  if (fallbackKicker) fallbackKicker.textContent = 'Acharya Dhunro Pasal · Catalog'
  if (fallbackTitle) fallbackTitle.textContent = 'Corn Puff Pipes from traditional maize.'

  // Prefer PNG mark in the shelf identity row when present; fall back to SVG inject.
  const identity = doc.querySelector('.editorial-identity')
  if (identity && !identity.querySelector('.acharya-identity-mark')) {
    const mark = doc.createElement('img')
    mark.className = 'acharya-identity-mark'
    mark.src = LOGO_PNG
    mark.alt = ''
    mark.width = 36
    mark.height = 36
    mark.decoding = 'async'
    mark.style.cssText =
      'width:36px;height:36px;border-radius:8px;margin-right:10px;flex-shrink:0;display:block;object-fit:cover'
    identity.insertBefore(mark, identity.firstChild)
    const idStyle = doc.createElement('style')
    idStyle.textContent =
      '.editorial-identity{display:flex;align-items:center;gap:2px;} .editorial-identity .acharya-identity-mark{margin-right:10px;}'
    doc.head.appendChild(idStyle)
  }

  const syncSelection = () => {
    swapText(doc.getElementById('selection-title'), TITLE_SWAPS)
    swapText(doc.getElementById('pointer-label-title'), TITLE_SWAPS)
    swapText(doc.getElementById('detail-title'), TITLE_SWAPS)
    swapText(doc.getElementById('selection-note'), NOTE_SWAPS)

    const note = doc.getElementById('selection-note')?.textContent?.trim()
    const deck = doc.getElementById('detail-deck')
    if (deck) {
      const t = deck.textContent ?? ''
      if (t.includes('Codex') || t.includes('field manual for delegating')) {
        deck.textContent =
          'Traditional (non-hybrid) maize, handcrafted into pipe-shaped puffs at Acharya Dhunro Pasal.'
      } else if (t.includes('Claude Code') || t.includes('context-first')) {
        deck.textContent =
          'Corn Puff Pipes — light, crunchy, and made for sharing. Call to order or scan to pay.'
      } else if (t.includes('Cursor') || t.includes('editing with Cursor')) {
        deck.textContent =
          'Handmade in small batches. Ask for snack bags, party packs, or bulk delivery.'
      } else if (t.includes('Antigravity') || t.includes('spatial way')) {
        deck.textContent =
          'Airy pipes with a golden finish — everyday snack culture rooted in traditional maize.'
      } else if (t.includes('Figma') || t.includes('designing in Figma')) {
        deck.textContent =
          'Snack bags for home and teatime. Call +977 984-5044572 to book your pack.'
      } else if (t.includes('Framer') || t.includes('studio notebook for Framer')) {
        deck.textContent =
          'Party packs for gatherings and gifting. Email roms7291@gmail.com for large orders.'
      } else if (t.includes('Xcode') || t.includes('making with Xcode')) {
        deck.textContent =
          'Bulk and wholesale — arrange pickup or delivery with Acharya Dhunro Pasal.'
      }
    }

    doc.querySelectorAll('.fallback-book strong').forEach((node) => {
      swapText(node, TITLE_SWAPS)
    })

    void note
  }

  syncSelection()

  const root = doc.getElementById('experience') ?? doc.body
  const observer = new MutationObserver(() => syncSelection())
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
  })

  ;(frame as HTMLIFrameElement & { __acharyaObserver?: MutationObserver }).__acharyaObserver =
    observer
}

function App() {
  const [payOpen, setPayOpen] = useState(false)

  const applyScene = useCallback((frame: HTMLIFrameElement) => {
    applyAcharyaScene(frame)
  }, [])

  return (
    <div className="acharya-2">
      <div className="shader-frame" aria-hidden={false}>
        <CompleteShelfAcharya
          className="shelf-scene"
          style={{ width: '100%', height: '100%' }}
          applyScene={applyScene}
          {...COMPLETE_SHELF_DEFAULTS}
        />
      </div>

      <a className="float-call" href={`tel:${PHONE_TEL}`} aria-label={`Call ${PHONE_DISPLAY}`}>
        <span className="float-call-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span className="float-call-text">
          <strong>Call</strong>
          <small>{PHONE_DISPLAY}</small>
        </span>
      </a>

      <div className="chrome-rail">
        <div className="chrome-brand">
          <div className="chrome-brand-row">
            <PipeMark size={40} />
            <img
              className="chrome-brand-png"
              src={LOGO_PNG}
              alt=""
              width={40}
              height={40}
              decoding="async"
            />
            <div className="chrome-brand-text">
              <strong>Acharya Dhunro Pasal</strong>
              <span>Corn Puff Pipes · traditional maize</span>
            </div>
          </div>
        </div>
        <div className="chrome-actions">
          <a className="chrome-btn primary" href={`tel:${PHONE_TEL}`}>
            Call to order
          </a>
          <button
            type="button"
            className="chrome-btn ghost"
            aria-expanded={payOpen}
            onClick={() => setPayOpen((v) => !v)}
          >
            Scan to pay
          </button>
          <a className="chrome-link" href={MAILTO}>
            {EMAIL}
          </a>
        </div>
      </div>

      {payOpen ? (
        <aside className="pay-panel" aria-label="Scan to pay">
          <button
            type="button"
            className="pay-close"
            aria-label="Close payment panel"
            onClick={() => setPayOpen(false)}
          >
            ×
          </button>
          <div className="pay-brand">
            <PipeMark size={48} />
            <img
              className="pay-brand-png"
              src={LOGO_PNG}
              alt="Acharya Dhunro Pasal"
              width={48}
              height={48}
              decoding="async"
            />
          </div>
          <p className="pay-kicker">Global IME · Roman Acharya</p>
          <h2>Scan to pay</h2>
          <p className="pay-copy">
            Corn Puff Pipes from Acharya Dhunro Pasal. Call{' '}
            <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a> to confirm your order, then scan.
          </p>
          <img
            className="pay-qr"
            src={`${BASE}product/payment-qr.png`}
            alt="Payment QR code — Global IME, Roman Acharya. Scan to pay for Corn Puff Pipes."
            width={220}
            height={220}
          />
          <a className="chrome-btn primary pay-call" href={`tel:${PHONE_TEL}`}>
            Call {PHONE_DISPLAY}
          </a>
        </aside>
      ) : null}
    </div>
  )
}

export default App
