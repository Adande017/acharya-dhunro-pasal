# Acharya Dhunro Pasal — Corn Puff Pipes

Snack shop site for **Acharya Dhunro Pasal** (Kathmandu). Corn Puff Pipes from traditional maize.

## What changed in 3.0

The previous build wrapped an 880 KB Three.js “CompleteShelf” iframe (WebGL books, jsDelivr import map, blob HTML rewrite, MutationObserver). It was slow, the overlay UI fought the 3D scene, and the sandbox was unsafe (`allow-scripts` + `allow-same-origin`).

This rewrite is a real shop page:

- Product photos, packs (snack / party / bulk)
- Call, WhatsApp, email, scan-to-pay (Global IME)
- No iframe, no WebGL, no third-party JS CDN

Call **+977 984-5044572** · Email **roms7291@gmail.com**

Live: https://adande017.github.io/acharya-dhunro-pasal/

## Blogspot / Blogger edition

A no-framework copy of the shop (same look, WhatsApp order, scan-to-pay). No React, no iframe, no third-party JS besides Google Fonts.

- Live HTML page: https://adande017.github.io/acharya-dhunro-pasal/blogspot.html
- Blogger theme file: [`blogspot/blogger-template.xml`](blogspot/blogger-template.xml)

To put this on a `*.blogspot.com` site: Blogger → Theme → Backup and Restore → Upload the XML. The shop fills the page; old posts stay hidden. Images and the QR code load from this GitHub Pages site so they stay in sync.
