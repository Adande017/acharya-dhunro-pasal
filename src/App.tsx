import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type ElementType,
} from 'react'
import './App.css'

const YEAR = new Date().getFullYear()
const PHONE_TEL = '+9779845044572'
const PHONE_DISPLAY = '+977 984-5044572'
const EMAIL = 'roms7291@gmail.com'
const MAILTO = `mailto:${EMAIL}`

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
          <stop offset="0%" stopColor="#F5C542" />
          <stop offset="100%" stopColor="#D4A017" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${gid})`} />
      <path
        d="M12 38c0-2 1.5-3.5 3.5-3.5H28c6 0 10-3 10-8.5 0-4.5-3-7.5-8-7.5H14.5C13 18.5 12 17.5 12 16s1-2.5 2.5-2.5H30c9 0 15 6 15 14.5S39 42.5 30 42.5H15.5C13.5 42.5 12 41 12 38Z"
        fill="#1C1408"
      />
      <circle cx="46" cy="40" r="7" fill="#1C1408" />
      <circle cx="46" cy="40" r="3.2" fill="#F5C542" />
    </svg>
  )
}

function useReveal() {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.unobserve(el)
        }
      },
      { threshold: 0.16, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return { ref, visible }
}

function Reveal({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: ElementType
}) {
  const { ref, visible } = useReveal()
  const Comp = Tag
  return (
    <Comp
      ref={ref}
      className={`reveal ${visible ? 'is-in' : ''} ${className}`.trim()}
    >
      {children}
    </Comp>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [formState, setFormState] = useState<'idle' | 'success'>('idle')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('[data-tilt]')
    const onMove = (e: MouseEvent) => {
      const card = e.currentTarget as HTMLElement
      const r = card.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      card.style.setProperty('--tilt-x', `${(-y * 5).toFixed(2)}deg`)
      card.style.setProperty('--tilt-y', `${(x * 5).toFixed(2)}deg`)
    }
    const onLeave = (e: Event) => {
      const card = e.currentTarget as HTMLElement
      card.style.setProperty('--tilt-x', '0deg')
      card.style.setProperty('--tilt-y', '0deg')
    }
    cards.forEach((c) => {
      c.addEventListener('mousemove', onMove)
      c.addEventListener('mouseleave', onLeave)
    })
    return () => {
      cards.forEach((c) => {
        c.removeEventListener('mousemove', onMove)
        c.removeEventListener('mouseleave', onLeave)
      })
    }
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(
      `Corn Puff Pipes order — Acharya Dhunro Pasal (${name || 'customer'})`,
    )
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPhone preference: ${PHONE_DISPLAY}\n\nMessage:\n${message}\n`,
    )
    window.location.href = `${MAILTO}?subject=${subject}&body=${body}`
    setFormState('success')
  }

  return (
    <div className="page">
      <header className="nav">
        <div className="nav-inner">
          <a href="#top" className="brand" onClick={closeMenu}>
            <PipeMark size={40} />
            <span className="brand-text">
              <span className="brand-name">Acharya Dhunro Pasal</span>
              <span className="brand-sub">Corn Puff Pipes</span>
            </span>
          </a>

          <button
            className={`nav-toggle ${menuOpen ? 'is-open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav className={`nav-links ${menuOpen ? 'is-open' : ''}`} aria-label="Primary">
            <a href="#product" onClick={closeMenu}>
              Product
            </a>
            <a href="#why" onClick={closeMenu}>
              Why us
            </a>
            <a href="#packs" onClick={closeMenu}>
              Packs
            </a>
            <a href="#book" onClick={closeMenu}>
              Pay
            </a>
            <a className="nav-cta" href={`tel:${PHONE_TEL}`} onClick={closeMenu}>
              Call
            </a>
          </nav>
        </div>
      </header>

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
          <strong>Call to book</strong>
          <small>{PHONE_DISPLAY}</small>
        </span>
      </a>

      <main id="top">
        <section className="snap-section hero">
          <div className="layer layer-a" aria-hidden="true" />
          <div className="layer layer-b" aria-hidden="true" />
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Acharya Dhunro Pasal · snack shop</p>
              <h1>
                Corn Puff <em>Pipes</em>
              </h1>
              <p className="lede">
                Pipe-shaped puffs of crunchy corn from Acharya Dhunro Pasal — playful to look at,
                serious about crunch. Book a bag, party pack, or bulk order with one call.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={`tel:${PHONE_TEL}`}>
                  Call to book / order
                </a>
                <a className="btn btn-secondary" href="#book">
                  Scan to pay
                </a>
              </div>
              <p className="hero-phone">
                <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
              </p>
            </div>

            <div className="hero-visual">
              <figure className="frame-3d hero-photo" data-tilt>
                <div className="frame-3d-inner">
                  <img
                    src="/product/closeup.jpg"
                    alt="Close-up of Corn Puff Pipes — crunchy pipe-shaped corn snacks"
                    width={800}
                    height={1000}
                    loading="eager"
                  />
                </div>
                <figcaption className="hero-photo-badge">Corn Puff Pipes</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section id="product" className="snap-section section product">
          <div className="section-inner">
            <Reveal className="section-head">
              <p className="eyebrow">The product</p>
              <h2>What are Corn Puff Pipes?</h2>
              <p className="section-sub">
                Light, crunchy puffed corn shaped like tiny pipes — from Acharya Dhunro Pasal.
              </p>
            </Reveal>

            <div className="product-gallery" aria-label="Product photos">
              <Reveal className="gallery-card frame-3d" as="figure">
                <div className="frame-3d-inner" data-tilt>
                  <img
                    src="/product/closeup.jpg"
                    alt="Close-up of Corn Puff Pipes showing individual pipe-shaped corn puffs"
                    loading="lazy"
                  />
                </div>
              </Reveal>
              <Reveal className="gallery-card frame-3d" as="figure">
                <div className="frame-3d-inner" data-tilt>
                  <img
                    src="/product/basket.jpg"
                    alt="Wicker basket filled with long Corn Puff Pipes snacks"
                    loading="lazy"
                  />
                </div>
              </Reveal>
              <Reveal className="gallery-card frame-3d" as="figure">
                <div className="frame-3d-inner" data-tilt>
                  <img
                    src="/product/bulk.jpg"
                    alt="Bulk pile of wavy Corn Puff Pipes corn snacks"
                    loading="lazy"
                  />
                </div>
              </Reveal>
            </div>

            <div className="product-grid">
              <Reveal className="product-story">
                <p>
                  Corn Puff Pipes are light, crunchy puffed corn snacks shaped like tiny pipes —
                  playful to look at, serious about crunch. Think classic corn-puff satisfaction with
                  a shape that makes people stop mid-reach and say &ldquo;wait… are those pipes?&rdquo;
                </p>
                <p>
                  Made for sharing: toss a bag on the table, pass them around the couch, or stash a
                  pack for solo crunch sessions. Snack food only — no tobacco, no gimmick beyond the
                  shape and the snap.
                </p>
                <ul className="story-list">
                  <li>Pipe-shaped puffed corn</li>
                  <li>Crunchy texture, shareable vibe</li>
                  <li>From Acharya Dhunro Pasal</li>
                </ul>
              </Reveal>
              <Reveal className="product-card" as="aside">
                <h3>At a glance</h3>
                <dl>
                  <div>
                    <dt>Shop</dt>
                    <dd>Acharya Dhunro Pasal</dd>
                  </div>
                  <div>
                    <dt>Product</dt>
                    <dd>Corn Puff Pipes</dd>
                  </div>
                  <div>
                    <dt>Format</dt>
                    <dd>Puffed corn snack</dd>
                  </div>
                  <div>
                    <dt>Shape</dt>
                    <dd>Tiny pipes</dd>
                  </div>
                </dl>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="why" className="snap-section section why">
          <div className="section-inner">
            <Reveal className="section-head">
              <p className="eyebrow">Why buy</p>
              <h2>Built for snack moments that stick</h2>
              <p className="section-sub">
                No fake stats — just the reasons people reach for pipe-shaped crunch.
              </p>
            </Reveal>
            <div className="cards">
              <Reveal className="card frame-3d" as="article" >
                <div className="frame-3d-inner card-body" data-tilt>
                  <div className="card-icon" aria-hidden="true">
                    🌽
                  </div>
                  <h3>Crunch you can hear</h3>
                  <p>
                    Light, airy corn puffs with a satisfying snap — the kind that turns &ldquo;just
                    one&rdquo; into a shared bowl.
                  </p>
                </div>
              </Reveal>
              <Reveal className="card frame-3d" as="article">
                <div className="frame-3d-inner card-body" data-tilt>
                  <div className="card-icon" aria-hidden="true">
                    🎭
                  </div>
                  <h3>Shape that starts conversations</h3>
                  <p>
                    Tiny pipes look playful on the table. Instant icebreaker for parties, game nights,
                    and office snack runs.
                  </p>
                </div>
              </Reveal>
              <Reveal className="card frame-3d" as="article">
                <div className="frame-3d-inner card-body" data-tilt>
                  <div className="card-icon" aria-hidden="true">
                    🤝
                  </div>
                  <h3>Made to share</h3>
                  <p>
                    Bag-friendly and bowl-friendly. Pass them around without fuss — snack energy that
                    scales from solo to crew.
                  </p>
                </div>
              </Reveal>
              <Reveal className="card frame-3d" as="article">
                <div className="frame-3d-inner card-body" data-tilt>
                  <div className="card-icon" aria-hidden="true">
                    📞
                  </div>
                  <h3>Easy to book</h3>
                  <p>
                    Call Acharya Dhunro Pasal to order, or scan the Global IME QR to pay — simple from
                    first crunch to checkout.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="packs" className="snap-section section packs">
          <div className="section-inner">
            <Reveal className="section-head">
              <p className="eyebrow">Packs</p>
              <h2>Pick a pack vibe</h2>
              <p className="section-sub">
                Tell us what you need when you call — snack bags, party packs, or bulk.
              </p>
            </Reveal>
            <div className="pack-grid">
              <Reveal className="pack frame-3d" as="article">
                <div className="frame-3d-inner pack-body" data-tilt>
                  <span className="pack-label">Everyday</span>
                  <h3>Snack bags</h3>
                  <p>
                    Personal-size bags for desks, lunchboxes, and &ldquo;I earned this crunch&rdquo;
                    moments.
                  </p>
                  <a href={`tel:${PHONE_TEL}`} className="pack-link">
                    Call for snack bags →
                  </a>
                </div>
              </Reveal>
              <Reveal className="pack pack-featured frame-3d" as="article">
                <div className="frame-3d-inner pack-body" data-tilt>
                  <div className="pack-thumb">
                    <img src="/product/basket.jpg" alt="" aria-hidden="true" loading="lazy" />
                  </div>
                  <span className="pack-label">Crowd favorite</span>
                  <h3>Party packs</h3>
                  <p>
                    Bigger share formats for gatherings, watch parties, and &ldquo;bring something
                    fun&rdquo; assignments.
                  </p>
                  <a href={`tel:${PHONE_TEL}`} className="pack-link">
                    Call for party packs →
                  </a>
                </div>
              </Reveal>
              <Reveal className="pack frame-3d" as="article">
                <div className="frame-3d-inner pack-body" data-tilt>
                  <div className="pack-thumb">
                    <img src="/product/bulk.jpg" alt="" aria-hidden="true" loading="lazy" />
                  </div>
                  <span className="pack-label">Custom</span>
                  <h3>Bulk / events</h3>
                  <p>
                    Planning a bigger run or brand moment? Call with quantity and timing — we&apos;ll
                    talk options.
                  </p>
                  <a href={`tel:${PHONE_TEL}`} className="pack-link">
                    Call about bulk →
                  </a>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="book" className="snap-section section book">
          <div className="section-inner book-grid">
            <Reveal className="book-copy">
              <p className="eyebrow">Book / order</p>
              <h2>Call Acharya Dhunro Pasal</h2>
              <p>
                Ready for Corn Puff Pipes? Call to book or order snack bags, party packs, or bulk.
                Prefer email? The form still opens a mailto — call and QR are the fastest path.
              </p>
              <a className="btn btn-primary btn-lg" href={`tel:${PHONE_TEL}`}>
                Call {PHONE_DISPLAY}
              </a>
              <a className="email-pill" href={MAILTO}>
                Or email {EMAIL}
              </a>

              <div className="order-form-wrap book-form">
                {formState === 'success' ? (
                  <div className="form-success" role="status">
                    <h3>Almost there</h3>
                    <p>
                      Your mail client should open with a pre-filled message. Or just call{' '}
                      <a href={`tel:${PHONE_TEL}`}>
                        <strong>{PHONE_DISPLAY}</strong>
                      </a>
                      .
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setFormState('idle')
                        setName('')
                        setEmail('')
                        setMessage('')
                      }}
                    >
                      Write another
                    </button>
                  </div>
                ) : (
                  <form className="order-form" onSubmit={handleSubmit}>
                    <label>
                      Name
                      <input
                        type="text"
                        name="name"
                        autoComplete="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label>
                      Message
                      <textarea
                        name="message"
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Snack bags, party pack, quantity, timing…"
                      />
                    </label>
                    <button type="submit" className="btn btn-secondary btn-block">
                      Email an inquiry
                    </button>
                  </form>
                )}
              </div>
            </Reveal>

            <Reveal className="pay-panel">
              <p className="eyebrow">Payment</p>
              <h2>Scan to pay</h2>
              <p className="pay-label">Global IME / Roman Acharya</p>
              <figure className="qr-frame">
                <div className="qr-quiet">
                  <img
                    src="/product/payment-qr.png"
                    alt="Payment QR code — Global IME, Roman Acharya. Scan to pay for Corn Puff Pipes."
                    width={360}
                    height={360}
                    loading="lazy"
                  />
                </div>
              </figure>
              <p className="pay-hint">
                Keep the code fully visible on screen for a clean scan. After paying, call or message
                to confirm your order.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="snap-section footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <PipeMark size={36} />
            <div>
              <strong>Acharya Dhunro Pasal</strong>
              <p>Corn Puff Pipes — crunchy corn snacks shaped like tiny pipes.</p>
              <a className="footer-phone" href={`tel:${PHONE_TEL}`}>
                {PHONE_DISPLAY}
              </a>
            </div>
          </div>
          <div className="footer-meta">
            <p>© {YEAR} Acharya Dhunro Pasal. All rights reserved.</p>
            <p className="privacy-stub">
              Call or scan to pay are primary. Optional email via mailto — this page does not store
              form data on a server.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
