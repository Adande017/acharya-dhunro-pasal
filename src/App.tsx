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

  const syncSelection = () => {
    swapText(doc.getElementById('selection-title'), TITLE_SWAPS)
    swapText(doc.getElementById('pointer-label-title'), TITLE_SWAPS)
    swapText(doc.getElementById('detail-title'), TITLE_SWAPS)
    swapText(doc.getElementById('selection-note'), NOTE_SWAPS)

    const note = doc.getElementById('selection-note')?.textContent?.trim()
    // detail deck: soft rewrite when known CompleteShelf decks appear
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

    // Fallback grid labels
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

  // Keep observer alive for the life of the iframe document
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
          <strong>Acharya Dhunro Pasal</strong>
          <span>Corn Puff Pipes · traditional maize</span>
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
