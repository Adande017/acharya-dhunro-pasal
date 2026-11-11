# Acharya Dhunro Pasal — Corn Puff Pipes

Snack shop site for **Acharya Dhunro Pasal** (Kathmandu). Corn Puff Pipes from traditional maize.

## What changed in 3.0

The previous build wrapped an 880 KB Three.js “CompleteShelf” iframe (WebGL books, jsDelivr import map, blob HTML rewrite, MutationObserver). It was slow, the overlay UI fought the 3D scene, and the sandbox was unsafe (`allow-scripts` + `allow-same-origin`).

This rewrite is a real shop page:

- Supabase email/password sign-up, login, email confirmation, and password reset (requires project configuration), plus guest access
- Product photos, packs (snack / party / bulk)
- Call, WhatsApp, email, scan-to-pay (Global IME)
- No iframe, no WebGL, no third-party JS CDN

Call **+977 984-5044572** · Email **roms7291@gmail.com**

Live: https://adande017.github.io/acharya-dhunro-pasal/

## Account sign-in setup

Email/password accounts use Supabase Auth. The app stores the name as Supabase user metadata; passwords are sent directly to Supabase Auth and are never stored by this site. No service-role key or custom database table is used. Orders still go through WhatsApp/email; the site does not yet save order history to an account.

1. In Supabase, enable the Email provider and choose whether email confirmation is required.
2. In **Authentication → URL Configuration**, add `http://localhost:5173/` and `https://adande017.github.io/acharya-dhunro-pasal/` to the allowed redirect URLs.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project URL and browser-safe publishable/anon key from **Project Settings → API**.
4. For GitHub Pages, add those same two values as repository **Actions variables** named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Settings → Secrets and variables → Actions → Variables**, then rerun the Pages workflow.

Never put a service-role key, secret key, database password, or email credentials in the frontend or GitHub Actions variables. Without the two public project values, account actions show an explicit setup message while guest browsing remains available.

## Blogspot / Blogger edition

A no-framework copy of the shop (same look, WhatsApp order, scan-to-pay). No React, no iframe, no third-party JS besides Google Fonts.

- Live HTML page: https://adande017.github.io/acharya-dhunro-pasal/blogspot.html
- Blogger theme file: [`blogspot/blogger-template.xml`](blogspot/blogger-template.xml)

To put this on a `*.blogspot.com` site: Blogger → Theme → Backup and Restore → Upload the XML. The shop fills the page; old posts stay hidden. Images and the QR code load from this GitHub Pages site so they stay in sync.
