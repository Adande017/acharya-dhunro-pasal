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
const BASE = import.meta.env.BASE_URL
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
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: ElementType
} & Record<string, unknown>) {
  const { ref, visible } = useReveal()
  const Comp = Tag
  return (
    <Comp
      ref={ref}
      className={`reveal ${visible ? 'is-in' : ''} ${className}`.trim()}
      {...rest}
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
      card.style.setProperty('--tilt-x', `${(-y * 3).toFixed(2)}deg`)
      card.style.setProperty('--tilt-y', `${(x * 3).toFixed(2)}deg`)
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

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduceMotion.matches) return

    const strengthOf = (mode: string | undefined) => {
      if (mode === 'fast') return 0.55
      if (mode === 'slow') return 0.28
      return 0.42
    }

    let frame = 0
    let queued = false

    const apply = () => {
      queued = false
      const vh = window.innerHeight || 1
      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const s = strengthOf(el.dataset.parallax)
        const box = el.getBoundingClientRect()
        const mid = box.top + box.height / 2
        const rel = Math.max(-1.2, Math.min(1.2, (mid - vh / 2) / vh))
        el.style.setProperty('--py', `${(rel * 22 * s).toFixed(2)}px`)
        el.style.setProperty('--px', `${(rel * 6 * s).toFixed(2)}px`)
        el.style.setProperty('--pz', `${(-Math.abs(rel) * 8 * s).toFixed(2)}px`)
        el.style.setProperty('--pr', `${(rel * 1.2 * s).toFixed(3)}deg`)
      })
    }

    const onScroll = () => {
      if (queued) return
      queued = true
      frame = requestAnimationFrame(apply)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    apply()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
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
            <a href="#packs" onClick={closeMenu}>
              Packs
            </a>
            <a href="#book" onClick={closeMenu}>
              Order
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
          <strong>Call</strong>
          <small>{PHONE_DISPLAY}</small>
        </span>
      </a>

      <main id="top">
        {/* ——— Hero: calm, one idea ——— */}
        <section className="snap-section hero">
          <div className="layer layer-a" aria-hidden="true" />
          <div className="layer layer-b" aria-hidden="true" />
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>
                Corn Puff <em>Pipes</em>
              </h1>
              <p className="lede">
                Traditional maize snacks — light, pipe-shaped, handmade.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={`tel:${PHONE_TEL}`}>
                  Call to order
                </a>
                <a className="btn btn-ghost" href="#book">
                  Scan to pay
                </a>
              </div>
            </div>

            <div className="hero-visual">
              <figure className="frame-3d hero-photo" data-tilt data-parallax="slow">
                <div className="frame-3d-inner">
                  <img
                    src={`${BASE}product/closeup-bright.jpg`}
                    alt="Close-up of Corn Puff Pipes — traditional maize puff snacks"
                    width={800}
                    height={1000}
                    loading="eager"
                  />
                </div>
              </figure>
            </div>
          </div>
        </section>

        {/* ——— Product ——— */}
        <section id="product" className="snap-section section product">
          <div className="section-inner">
            <Reveal className="section-head">
              <h2>Pipe-shaped maize puffs</h2>
              <p className="section-sub">
                Made from traditional (non-hybrid) maize at Acharya Dhunro Pasal.
              </p>
            </Reveal>

            <div className="product-gallery" aria-label="Product photos">
              <Reveal className="gallery-card frame-3d" as="figure">
                <div className="frame-3d-inner" data-tilt data-parallax="slow">
                  <img
                    src={`${BASE}product/closeup-bright.jpg`}
                    alt="Close-up of Corn Puff Pipes showing individual pipe-shaped maize puffs"
                    loading="lazy"
                  />
                </div>
              </Reveal>
              <Reveal className="gallery-card frame-3d" as="figure">
                <div className="frame-3d-inner" data-tilt data-parallax="slow">
                  <img
                    src={`${BASE}product/basket-bright.jpg`}
                    alt="Wicker basket filled with long Corn Puff Pipes snacks"
                    loading="lazy"
                  />
                </div>
              </Reveal>
              <Reveal className="gallery-card frame-3d" as="figure">
                <div className="frame-3d-inner" data-tilt data-parallax="slow">
                  <img
                    src={`${BASE}product/bulk-bright.jpg`}
                    alt="Bulk pile of Corn Puff Pipes made from traditional maize"
                    loading="lazy"
                  />
                </div>
              </Reveal>
            </div>

            <Reveal className="nutrition-strip">
              <p>
                <strong>Traditional maize</strong> — real grain character, cleaner snack story,
                shareable crunch.
              </p>
            </Reveal>

            <Reveal as="details" className="disclose">
              <summary>More about the maize</summary>
              <div className="disclose-body">
                <ul className="story-list">
                  <li>Non-hybrid maize — grain families know</li>
                  <li>Handmade snack craft, not factory filler</li>
                  <li>Nutrition-minded: light puffs from real maize</li>
                  <li>No tobacco — just the shape, the snap, the plant</li>
                </ul>
                <dl className="glance">
                  <div>
                    <dt>Shop</dt>
                    <dd>Acharya Dhunro Pasal</dd>
                  </div>
                  <div>
                    <dt>Product</dt>
                    <dd>Corn Puff Pipes</dd>
                  </div>
                  <div>
                    <dt>Maize</dt>
                    <dd>Traditional (non-hybrid)</dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ——— Why (collapsed) ——— */}
        <section id="why" className="snap-section section why">
          <div className="section-inner">
            <Reveal className="section-head">
              <h2>Why these puffs</h2>
              <p className="section-sub">Traditional grain. Handmade crunch. Easy to order.</p>
            </Reveal>

            <Reveal className="why-compact">
              <div className="why-line">
                <span aria-hidden="true">🌱</span>
                <p>
                  <strong>Traditional maize</strong> — non-hybrid grain with character.
                </p>
              </div>
              <div className="why-line">
                <span aria-hidden="true">👐</span>
                <p>
                  <strong>Handmade culture</strong> — playful pipes, serious craft.
                </p>
              </div>
              <div className="why-line">
                <span aria-hidden="true">📞</span>
                <p>
                  <strong>Easy to book</strong> — call or scan the QR.
                </p>
              </div>
            </Reveal>

            <Reveal as="details" className="disclose">
              <summary>Nutrition & craft details</summary>
              <div className="disclose-body">
                <p>
                  Choosing traditional maize is about real grain character and food that belongs on a
                  shared table — a snack story that starts with the plant, not a gimmick.
                </p>
                <ul className="story-list">
                  <li>Closer to the maize plant families know</li>
                  <li>Light puffs you can feel good about sharing</li>
                  <li>Rooted in how snacks used to be made</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ——— Packs (progressive disclosure) ——— */}
        <section id="packs" className="snap-section section packs">
          <div className="section-inner">
            <Reveal className="section-head">
              <h2>Packs</h2>
              <p className="section-sub">Snack bags, party packs, or bulk — tell us when you call.</p>
            </Reveal>

            <Reveal as="details" className="disclose disclose-packs" open>
              <summary>Compare pack sizes</summary>
              <div className="disclose-body pack-grid">
                <article className="pack-simple">
                  <h3>Snack bags</h3>
                  <p>Everyday personal size.</p>
                  <a href={`tel:${PHONE_TEL}`} className="pack-link">
                    Call →
                  </a>
                </article>
                <article className="pack-simple pack-simple-featured">
                  <h3>Party packs</h3>
                  <p>Share formats for gatherings.</p>
                  <a href={`tel:${PHONE_TEL}`} className="pack-link">
                    Call →
                  </a>
                </article>
                <article className="pack-simple">
                  <h3>Bulk / events</h3>
                  <p>Custom quantity & timing.</p>
                  <a href={`tel:${PHONE_TEL}`} className="pack-link">
                    Call →
                  </a>
                </article>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ——— Book / Pay — breathe ——— */}
        <section id="book" className="snap-section section book">
          <div className="section-inner book-grid">
            <Reveal className="book-copy">
              <h2>Call to order</h2>
              <p>Acharya Dhunro Pasal — snack bags, party packs, or bulk.</p>
              <a className="btn btn-primary btn-lg" href={`tel:${PHONE_TEL}`}>
                {PHONE_DISPLAY}
              </a>
              <a className="email-link" href={MAILTO}>
                {EMAIL}
              </a>

              <details className="disclose book-form-disclose">
                <summary>Email an inquiry instead</summary>
                <div className="disclose-body order-form-wrap">
                  {formState === 'success' ? (
                    <div className="form-success" role="status">
                      <h3>Almost there</h3>
                      <p>
                        Your mail client should open. Or call{' '}
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
                          rows={3}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Pack type, quantity, timing…"
                        />
                      </label>
                      <button type="submit" className="btn btn-secondary btn-block">
                        Open email
                      </button>
                    </form>
                  )}
                </div>
              </details>
            </Reveal>

            <Reveal className="pay-panel">
              <h2>Scan to pay</h2>
              <p className="pay-label">Global IME · Roman Acharya</p>
              <figure className="qr-frame">
                <div className="qr-quiet">
                  <img
                    src={`${BASE}product/payment-qr.png`}
                    alt="Payment QR code — Global IME, Roman Acharya. Scan to pay for Corn Puff Pipes."
                    width={360}
                    height={360}
                    loading="lazy"
                  />
                </div>
              </figure>
              <p className="pay-hint">Pay, then call to confirm.</p>
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
              <p>Corn Puff Pipes — traditional maize.</p>
              <a className="footer-phone" href={`tel:${PHONE_TEL}`}>
                {PHONE_DISPLAY}
              </a>
            </div>
          </div>
          <div className="footer-meta">
            <p>© {YEAR} Acharya Dhunro Pasal</p>
            <p className="privacy-stub">Call or scan to pay. Email via mailto — nothing stored here.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
