import { useId, useState } from "react";
import {
  ArrowUpRight,
  Menu,
  Minus,
  Phone,
  Plus,
  QrCode,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  asset,
  buildMailtoUrl,
  buildWhatsAppUrl,
  clampQty,
  mailHref,
  PACKS,
  sanitizeLine,
  SHOP,
  telHref,
  waHref,
  type PackId,
} from "@/lib/shop";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#packs", label: "Packs" },
  { href: "#craft", label: "Craft" },
  { href: "#gallery", label: "Gallery" },
  { href: "#order", label: "Order" },
] as const;

const FACTS = [
  {
    title: "Traditional maize",
    body: "Non-hybrid grain, puffed into light pipes — snack culture with a kitchen-table origin.",
  },
  {
    title: "Small-batch",
    body: "Handmade runs. You taste the batch, not a factory formula.",
  },
  {
    title: "Pasal, Kathmandu",
    body: "Call to book a bag, a party pack, or a sack for your shop.",
  },
] as const;

const GALLERY = [
  {
    src: "product/closeup-bright.jpg",
    alt: "Golden Corn Puff Pipes in close-up",
    caption: "The pipe",
  },
  {
    src: "product/basket-bright.jpg",
    alt: "Basket of Corn Puff Pipes",
    caption: "The share",
  },
  {
    src: "product/bulk-bright.jpg",
    alt: "Wholesale sack of Corn Puff Pipes",
    caption: "The sack",
  },
] as const;

function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={asset("brand/acharya-dhunro-pasal-logo.png")}
      alt=""
      width={40}
      height={40}
      decoding="async"
      className={cn("media block rounded-md object-cover", className)}
    />
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.15 6.37 2.15 11.75c0 1.72.45 3.4 1.32 4.88L2 22l5.54-1.43a10.1 10.1 0 0 0 4.5 1.05h.04c5.46 0 9.89-4.37 9.89-9.75C21.97 6.37 17.5 2 12.04 2Zm0 17.85h-.03a8.3 8.3 0 0 1-4.22-1.16l-.3-.18-3.28.85.88-3.15-.2-.32a8.17 8.17 0 0 1-1.27-4.39c0-4.52 3.73-8.2 8.32-8.2 4.58 0 8.32 3.68 8.32 8.2 0 4.52-3.74 8.2-8.22 8.2Zm4.55-6.14c-.25-.12-1.47-.72-1.7-.8-.23-.08-.4-.12-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.2-.73-.64-1.22-1.44-1.37-1.68-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.77-1.84-.2-.48-.4-.41-.56-.42h-.48c-.16 0-.43.06-.65.31-.23.25-.86.83-.86 2.03s.88 2.36 1 2.52c.12.17 1.73 2.63 4.19 3.69.59.25 1.04.4 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.17-.48-.29Z" />
    </svg>
  );
}

export function ShopPage() {
  const [payOpen, setPayOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState<(typeof GALLERY)[number] | null>(null);
  const [pack, setPack] = useState<PackId>("snack");
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const formId = useId();

  const order = {
    name,
    phone,
    pack,
    qty,
    note,
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#packs"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to packs
      </a>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:px-6">
          <a href="#top" className="flex min-w-0 items-center gap-3">
            <BrandMark className="size-10" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-base font-medium tracking-tight sm:text-lg">
                {SHOP.name}
              </span>
              <span className="hidden truncate text-xs text-muted sm:block">
                {SHOP.product} · {SHOP.city}
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-muted transition-[color] duration-150 ease-out hover:text-fg"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <a href={telHref}>
                <Phone />
                Call to order
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setPayOpen(true)}
            >
              <QrCode />
              Pay
            </Button>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{SHOP.name}</SheetTitle>
                  <SheetDescription>
                    {SHOP.product} from {SHOP.city}
                  </SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-1" aria-label="Mobile">
                  {NAV.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <a
                        href={item.href}
                        className="rounded-xl px-3 py-3 text-base text-fg transition-[background-color] duration-150 ease-out hover:bg-surface-muted"
                      >
                        {item.label}
                      </a>
                    </SheetClose>
                  ))}
                </nav>
                <div className="mt-auto flex flex-col gap-2">
                  <Button asChild>
                    <a href={telHref}>
                      <Phone />
                      Call {SHOP.phoneDisplay}
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={waHref} target="_blank" rel="noopener noreferrer">
                      <WhatsAppIcon className="size-4" />
                      WhatsApp
                    </a>
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setMenuOpen(false); setPayOpen(true); }}>
                    <QrCode />
                    Scan to pay
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden bg-hero-wash">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:py-20">
            <div>
              <p className="rise-in text-xs font-medium tracking-[0.18em] text-muted uppercase">
                Pasal · {SHOP.city}
              </p>
              <h1 className="rise-in-2 mt-3 font-display text-4xl leading-[1.1] font-medium tracking-tight sm:text-5xl lg:text-6xl">
                Corn Puff Pipes from traditional maize.
              </h1>
              <p className="rise-in-3 mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
                Light, pipe-shaped puffs. Handmade in small batches at Acharya Dhunro Pasal.
                Call to book, then scan to pay.
              </p>
              <div className="rise-in-4 mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <a href={telHref}>
                    <Phone />
                    Call to order
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#order">Place an order</a>
                </Button>
              </div>
              <p className="mt-5 text-sm text-subtle">
                {SHOP.phoneDisplay} · {SHOP.email}
              </p>
            </div>

            <div className="rise-in-3 relative">
              <div className="overflow-hidden rounded-3xl bg-surface p-2 shadow-[var(--shadow-border)]">
                <img
                  src={asset("product/closeup-bright.jpg")}
                  alt="Golden Corn Puff Pipes, close-up"
                  width={1200}
                  height={900}
                  fetchPriority="high"
                  decoding="async"
                  className="media aspect-[4/3] w-full rounded-2xl object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-2 hidden w-44 overflow-hidden rounded-2xl bg-surface p-1.5 shadow-[var(--shadow-border)] sm:block lg:-left-8">
                <img
                  src={asset("product/basket-bright.jpg")}
                  alt=""
                  width={400}
                  height={300}
                  decoding="async"
                  className="media aspect-[4/3] w-full rounded-xl object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-3">
            {FACTS.map((fact) => (
              <article key={fact.title} className="bg-surface px-6 py-8 sm:px-8">
                <h2 className="font-display text-xl font-medium tracking-tight">{fact.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{fact.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="packs" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-xl">
              <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">The shelf</p>
              <h2 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                Three ways to take them home.
              </h2>
              <p className="mt-3 text-muted">
                Same maize, same pipes. Choose a bag for the table, a pack for the gathering,
                or a sack for the shop.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {PACKS.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-3xl bg-surface p-2 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 ease-out hover:shadow-[var(--shadow-border-hover)]"
                >
                  <img
                    src={asset(item.image)}
                    alt={item.imageAlt}
                    width={800}
                    height={600}
                    loading="lazy"
                    decoding="async"
                    className="media aspect-[4/3] w-full rounded-2xl object-cover"
                  />
                  <div className="flex flex-1 flex-col px-3 pt-4 pb-3">
                    <Badge>{item.kicker}</Badge>
                    <h3 className="mt-3 font-display text-2xl font-medium tracking-tight">
                      {item.name}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                      {item.description}
                    </p>
                    <p className="mt-3 text-xs text-subtle">{item.suited}</p>
                    <Button
                      type="button"
                      className="mt-5 w-full"
                      onClick={() => {
                        setPack(item.id);
                        document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Order {item.name.toLowerCase()}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="craft" className="scroll-mt-24 bg-hero-wash px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="overflow-hidden rounded-3xl bg-surface p-2 shadow-[var(--shadow-border)]">
              <img
                src={asset("product/bulk-bright.jpg")}
                alt="A sack of Corn Puff Pipes ready for wholesale"
                width={1200}
                height={900}
                loading="lazy"
                decoding="async"
                className="media aspect-[4/3] w-full rounded-2xl object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">The craft</p>
              <h2 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                Maize, heat, and a pipe shape.
              </h2>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-muted">
                <p>
                  Acharya Dhunro Pasal puffs traditional, non-hybrid maize into airy pipes —
                  a familiar teatime snack with a clean crunch and a golden finish.
                </p>
                <p>
                  Batches stay small so the crunch stays even. Ask for a bag for the house,
                  a pack for the gathering, or a sack if you sell snacks of your own.
                </p>
              </div>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  "Non-hybrid maize",
                  "Pipe-shaped puff",
                  "Small handmade batches",
                  "Call, WhatsApp, or scan",
                ].map((line) => (
                  <li
                    key={line}
                    className="rounded-xl bg-surface px-4 py-3 text-sm text-fg shadow-[var(--shadow-border)]"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="gallery" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Look closer</p>
                <h2 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                  The pipes, as they are.
                </h2>
              </div>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {GALLERY.map((shot) => (
                <button
                  key={shot.src}
                  type="button"
                  onClick={() => setLightbox(shot)}
                  className="group overflow-hidden rounded-3xl bg-surface p-2 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 ease-out hover:shadow-[var(--shadow-border-hover)]"
                >
                  <img
                    src={asset(shot.src)}
                    alt={shot.alt}
                    width={800}
                    height={600}
                    loading="lazy"
                    decoding="async"
                    className="media aspect-[4/5] w-full rounded-2xl object-cover"
                  />
                  <span className="mt-3 flex items-center justify-between px-2 pb-1 text-sm text-muted">
                    {shot.caption}
                    <ArrowUpRight className="size-4 opacity-0 transition-[opacity] duration-150 ease-out group-hover:opacity-100" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="order" className="scroll-mt-24 bg-surface px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Order</p>
              <h2 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                Tell us the pack. We’ll confirm on the call.
              </h2>
              <p className="mt-4 max-w-sm text-muted">
                No cart, no account. Send the order on WhatsApp, email, or just ring.
                Confirm first — then scan the Global IME code to pay {SHOP.payName}.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <a
                  href={telHref}
                  className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3 shadow-[var(--shadow-border)]"
                >
                  <span>
                    <span className="block text-xs text-subtle">Call</span>
                    <span className="font-medium">{SHOP.phoneDisplay}</span>
                  </span>
                  <Phone className="size-4 text-muted" />
                </a>
                <a
                  href={mailHref}
                  className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3 shadow-[var(--shadow-border)]"
                >
                  <span>
                    <span className="block text-xs text-subtle">Email</span>
                    <span className="font-medium">{SHOP.email}</span>
                  </span>
                  <ArrowUpRight className="size-4 text-muted" />
                </a>
              </div>
            </div>

            <form
              className="rounded-3xl bg-bg p-5 shadow-[var(--shadow-border)] sm:p-7"
              onSubmit={(event) => {
                event.preventDefault();
                window.open(buildWhatsAppUrl(order), "_blank", "noopener,noreferrer");
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`${formId}-name`}>Name</Label>
                  <Input
                    id={`${formId}-name`}
                    name="name"
                    autoComplete="name"
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(sanitizeLine(e.target.value, 80))}
                    placeholder="Your name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`${formId}-phone`}>Phone</Label>
                  <Input
                    id={`${formId}-phone`}
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={24}
                    value={phone}
                    onChange={(e) => setPhone(sanitizeLine(e.target.value, 24))}
                    placeholder="98XXXXXXXX"
                  />
                </div>
              </div>

              <fieldset className="mt-5">
                <legend className="text-sm font-medium">Pack</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {PACKS.map((item) => {
                    const selected = pack === item.id;
                    return (
                      <label
                        key={item.id}
                        className={cn(
                          "cursor-pointer rounded-2xl bg-surface px-3 py-3 text-sm shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 ease-out",
                          selected && "shadow-[var(--shadow-border-hover)] ring-2 ring-ring",
                        )}
                      >
                        <input
                          type="radio"
                          name="pack"
                          value={item.id}
                          checked={selected}
                          onChange={() => setPack(item.id)}
                          className="sr-only"
                        />
                        <span className="block font-medium">{item.name}</span>
                        <span className="text-xs text-muted">{item.kicker}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-5 grid gap-2">
                <Label htmlFor={`${formId}-qty`}>Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Decrease quantity"
                    onClick={() => setQty((n) => clampQty(n - 1))}
                  >
                    <Minus />
                  </Button>
                  <Input
                    id={`${formId}-qty`}
                    name="qty"
                    type="number"
                    min={1}
                    max={99}
                    inputMode="numeric"
                    className="w-20 text-center tabular-nums"
                    value={qty}
                    onChange={(e) => setQty(clampQty(Number(e.target.value)))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Increase quantity"
                    onClick={() => setQty((n) => clampQty(n + 1))}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                <Label htmlFor={`${formId}-note`}>Note</Label>
                <textarea
                  id={`${formId}-note`}
                  name="note"
                  rows={3}
                  maxLength={200}
                  value={note}
                  onChange={(e) => setNote(sanitizeLine(e.target.value, 200))}
                  placeholder="Delivery area, preferred time, or shop name"
                  className="w-full resize-y rounded-xl bg-surface px-3.5 py-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none transition-[box-shadow] duration-150 ease-out placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button type="submit" className="flex-1">
                  <WhatsAppIcon className="size-4" />
                  Send on WhatsApp
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href={buildMailtoUrl(order)}>Email the order</a>
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => setPayOpen(true)}
              >
                <QrCode />
                Scan to pay after you confirm
              </Button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-accent text-accent-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-14 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <BrandMark className="size-11" />
            <div>
              <p className="font-display text-xl font-medium tracking-tight">{SHOP.name}</p>
              <p className="mt-1 max-w-xs text-sm text-accent-foreground/70">
                {SHOP.product} · traditional maize · {SHOP.city}
              </p>
            </div>
          </div>
          <div className="grid gap-1 text-sm">
            <a className="hover:underline" href={telHref}>
              {SHOP.phoneDisplay}
            </a>
            <a className="hover:underline" href={mailHref}>
              {SHOP.email}
            </a>
            <button type="button" className="text-left hover:underline" onClick={() => setPayOpen(true)}>
              Scan to pay · {SHOP.payNetwork}
            </button>
          </div>
        </div>
        <Separator className="bg-accent-foreground/10" />
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-accent-foreground/55 sm:px-6">
          Handmade snacks. Confirm the order by phone before paying.
        </p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
        <div className="grid grid-cols-3 gap-2">
          <a href={telHref} className={cn(buttonVariants({ size: "sm" }), "px-2")}>
            <Phone />
            Call
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "px-2")}
          >
            Chat
          </a>
          <Button type="button" variant="walnut" size="sm" className="px-2" onClick={() => setPayOpen(true)}>
            Pay
          </Button>
        </div>
      </div>
      <div className="h-20 sm:hidden" aria-hidden="true" />

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan to pay</DialogTitle>
            <DialogDescription>
              {SHOP.payNetwork} · {SHOP.payName}. Call {SHOP.phoneDisplay} to confirm the
              order before you send money.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-bg p-4">
            <img
              src={asset("product/payment-qr.png")}
              alt={`Payment QR for ${SHOP.payName} on ${SHOP.payNetwork}`}
              width={220}
              height={220}
              decoding="async"
              className="mx-auto h-auto w-full max-w-[220px] rounded-lg bg-surface p-2"
            />
          </div>
          <p className="text-xs leading-relaxed text-subtle">
            This code is only for confirmed orders of {SHOP.product}. If the name on the
            scanner is not {SHOP.payName}, do not pay.
          </p>
          <Button asChild>
            <a href={telHref}>
              <Phone />
              Confirm by phone
            </a>
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(lightbox)} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="w-[min(40rem,calc(100vw-2rem))] p-3">
          {lightbox ? (
            <>
              <DialogHeader className="px-3 pt-10">
                <DialogTitle className="text-lg">{lightbox.caption}</DialogTitle>
                <DialogDescription>{lightbox.alt}</DialogDescription>
              </DialogHeader>
              <img
                src={asset(lightbox.src)}
                alt={lightbox.alt}
                width={1200}
                height={900}
                className="media w-full rounded-2xl object-cover"
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
