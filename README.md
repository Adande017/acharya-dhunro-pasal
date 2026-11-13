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

Email/password accounts use Supabase Auth. The app stores the name as Supabase user metadata; passwords are sent directly to Supabase Auth and are never stored by this site. Auth does not use a service-role key or an auth-specific user table. Online guest orders reserve inventory and are visible to staff; they are not saved to a customer account. WhatsApp and email inquiries are also available.

1. In Supabase, enable the Email provider and choose whether email confirmation is required.
2. In **Authentication → URL Configuration**, add `http://localhost:5173/` and `https://adande017.github.io/acharya-dhunro-pasal/` to the allowed redirect URLs.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project URL and browser-safe publishable/anon key from **Project Settings → API**.
4. For GitHub Pages, add those same two values as repository **Actions variables** named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Settings → Secrets and variables → Actions → Variables**, then rerun the Pages workflow.

Never put a service-role key, secret key, database password, or email credentials in the frontend or GitHub Actions variables. Without the two public project values, account actions show an explicit setup message while guest browsing remains available.

## Inventory scanning and online orders

Inventory staff can scan product labels with a camera or a Bluetooth barcode scanner that types into the focused barcode field. Customers can review an order, explicitly acknowledge that stock will be reserved, and place it online. The backend checks stock and records the order and stock deduction atomically; the customer receives an order reference, and staff can see customer contact details in the inventory page. Payment is not collected online.

Apply these migrations in order from **Supabase → SQL Editor → New query** before using inventory scanning or online orders:

1. [`supabase/migrations/20261113184731_barcode_inventory.sql`](supabase/migrations/20261113184731_barcode_inventory.sql)
2. [`supabase/migrations/20261113185756_staff_inventory_access.sql`](supabase/migrations/20261113185756_staff_inventory_access.sql)
3. [`supabase/migrations/20261114000000_customer_orders.sql`](supabase/migrations/20261114000000_customer_orders.sql)
4. [`supabase/migrations/20261114010000_inventory_product_catalog.sql`](supabase/migrations/20261114010000_inventory_product_catalog.sql)

Camera access requires HTTPS (or localhost). Staff can add/edit catalog products, update barcodes and low-stock thresholds, and archive/restore products; archiving hides a product from customers while preserving its stock and history. Customers see availability status rather than exact stock counts.

### Accessing staff shop edits

1. Open the live shop and select **Staff sign-in** in the shop header.
2. Sign in with the email/password for your Supabase account. The shop owner account (`roms7291@gmail.com`) has staff access automatically. Other accounts must first be approved by the owner.
3. To approve a staff member, the owner signs in, opens **Staff access** on the staff page, enters the staff member's account email, and selects **Approve staff**. The staff member can then sign in with that same email.
4. On the **Stock desk**, select **Manage products** in the Staff workspace to reach the product editor. Use **Add product** for a new listing or **Edit** beside a product to update its name, category/short label, customer description, image, image description, “Best for” text, barcode, or low-stock alert threshold. Select **Save product changes** to apply edits.
5. To hide a listing from the customer shop, choose **Delete from shop**. This archives it rather than permanently deleting it, so stock and transaction history are retained; choose **Restore** to list it again.

The product editor does not change product prices. Staff access and inventory editing require the Supabase setup above, including the inventory and product-catalog migrations.

## Member community

After sign-in, members land on the community feed, which is connected to the shop in the same site. Members can manage a display name and profile photo, publish posts, comment, like posts, discover suggested members, send and accept friend requests, and message other members. Community profiles, posts, comments, friendships, and messages are readable only by signed-in members. Profile photos are stored in a private Supabase Storage bucket and served with short-lived signed URLs. Guests can still browse and order from the shop.

Before using the community, apply these migrations in order from **Supabase → SQL Editor → New query**:

1. [`supabase/migrations/20261111000000_community.sql`](supabase/migrations/20261111000000_community.sql)
2. [`supabase/migrations/20261111181608_add_friendships.sql`](supabase/migrations/20261111181608_add_friendships.sql)

The community migration creates the tables and row-level security policies, provisions profiles for existing accounts, and creates the private avatar bucket. Do not disable RLS or make the avatar bucket public.

## Blogspot / Blogger edition

A no-framework copy of the shop (same look, WhatsApp order, scan-to-pay). No React, no iframe, no third-party JS besides Google Fonts.

- Live HTML page: https://adande017.github.io/acharya-dhunro-pasal/blogspot.html
- Blogger theme file: [`blogspot/blogger-template.xml`](blogspot/blogger-template.xml)

To put this on a `*.blogspot.com` site: Blogger → Theme → Backup and Restore → Upload the XML. The shop fills the page; old posts stay hidden. Images and the QR code load from this GitHub Pages site so they stay in sync.
