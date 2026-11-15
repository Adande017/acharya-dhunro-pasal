import { useEffect, useId, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Minus,
  Package,
  Phone,
  Plus,
  QrCode,
  UserRound,
  Users,
} from "lucide-react";
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
import { AvailabilityBadge } from "@/components/availability-badge";
import {
  asset,
  buildMailtoUrl,
  buildWhatsAppUrl,
  clampQty,
  mailHref,
  sanitizeLine,
  SHOP,
  telHref,
  waHref,
  type PackId,
} from "@/lib/shop";
import { resetTilt, updateTilt } from "@/lib/tilt";
import { useInventoryAvailability } from "@/lib/use-inventory-availability";
import { useProductCatalog } from "@/lib/use-product-catalog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type CustomerOrderReceipt = {
  order_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
};

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

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

export function ShopPage({
  onAccount,
  onProducts,
  onAbout,
  onCommunity,
  onSignOut,
  onInventory,
  onStaffLogin,
  accountNotice = "",
  initialPack = "snack",
}: {
  onAccount?: () => void;
  onProducts?: () => void;
  onAbout?: () => void;
  onCommunity?: () => void;
  onSignOut?: () => void;
  onInventory?: () => void;
  onStaffLogin?: () => void;
  accountNotice?: string;
  initialPack?: PackId;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const [pack, setPack] = useState<PackId>(initialPack);
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [orderReviewOpen, setOrderReviewOpen] = useState(false);
  const [orderAcknowledged, setOrderAcknowledged] = useState(false);
  const [orderPending, setOrderPending] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderReceipt, setOrderReceipt] = useState<CustomerOrderReceipt | null>(null);
  const formId = useId();
  const { availability, loading, error, refresh } = useInventoryAvailability();
  const { products, error: catalogError } = useProductCatalog();

  useEffect(() => {
    if (!products.some((product) => product.product_id === pack) && products.length) {
      setPack(products[0].product_id);
    }
  }, [pack, products]);
  const selectedProduct = products.find((product) => product.product_id === pack);

  const order = {
    name,
    phone,
    pack,
    qty,
    note,
    packName: selectedProduct?.name,
  };

  function reviewOrder(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setOrderError("");
    setOrderAcknowledged(false);
    setOrderReviewOpen(true);
  }

  async function confirmOrder(): Promise<void> {
    if (!supabase) {
      setOrderError("Online ordering is unavailable. Please contact us by phone or WhatsApp.");
      return;
    }

    setOrderPending(true);
    setOrderError("");
    try {
      const { data, error: orderErrorResult } = await supabase.rpc("place_customer_order", {
        p_customer_name: name,
        p_customer_phone: phone,
        p_note: note,
        p_items: [{ product_id: pack, quantity: qty }],
      });
      if (orderErrorResult) throw orderErrorResult;
      if (!data) throw new Error("The shop did not return an order confirmation.");

      setOrderReceipt(data);
      setOrderReviewOpen(false);
      void refresh();
    } catch (error: unknown) {
      setOrderError(`Your order was not placed: ${messageOf(error)}`);
    } finally {
      setOrderPending(false);
    }
  }

  return (
    <div className="page-transition pasal-watermark relative min-h-dvh bg-bg text-fg">
      <div
        className="watermark-layer"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(rgba(243, 238, 228, 0.94), rgba(243, 238, 228, 0.94)), url("${asset("product/basket-bright.jpg")}")`,
        }}
      />
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
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

          <div className="flex items-center gap-2">
            {onStaffLogin && (
              <Button type="button" variant="outline" size="sm" onClick={onStaffLogin}>
                <Package />
                <span>Staff sign-in</span>
              </Button>
            )}
            {onInventory && (
              <Button type="button" variant="outline" size="sm" onClick={onInventory}>
                <Package />
                <span className="hidden sm:inline">Inventory</span>
              </Button>
            )}
            {onCommunity && (
              <Button type="button" variant="ghost" size="sm" onClick={onCommunity}>
                <Users />
                Community
              </Button>
            )}
            {onSignOut ? (
              <Button type="button" variant="ghost" size="sm" onClick={onSignOut}>
                <UserRound />
                Sign out
              </Button>
            ) : onAccount ? (
              <Button type="button" variant="ghost" size="sm" onClick={onAccount}>
                <UserRound />
                Account
              </Button>
            ) : null}
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <a href={telHref}>
                <Phone />
                Call to order
              </a>
            </Button>
            <Button
              type="button"
              variant="walnut"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setPayOpen(true)}
            >
              <QrCode />
              Pay
            </Button>
          </div>
        </div>
        <nav
          className="glass-nav mx-4 mb-2 grid max-w-sm grid-cols-3 gap-1.5 p-1.5 sm:mx-auto"
          aria-label="Primary"
        >
          <button type="button" onClick={onProducts} className="glass-nav-card">
            <Package className="size-4" />
            Products
          </button>
          <button type="button" onClick={onAbout} className="glass-nav-card">
            <BookOpen className="size-4" />
            About
          </button>
          <a href="#order" className="glass-nav-card">
            <Phone className="size-4" />
            Order
          </a>
        </nav>
      </header>

      <main id="top" className="relative z-10">
        {accountNotice && (
          <p className="mx-auto max-w-6xl px-4 pt-4 text-sm text-primary sm:px-6" role="status">
            {accountNotice}
          </p>
        )}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
            <div>
              <p className="rise-in text-xs font-medium tracking-[0.18em] text-muted uppercase">
                Pasal · {SHOP.city}
              </p>
              <h1 className="rise-in-2 mt-3 font-display text-4xl leading-[1.1] font-medium tracking-tight sm:text-5xl lg:text-6xl">
                Corn Puff Pipes from traditional maize.
              </h1>
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
                {onProducts && (
                  <Button type="button" variant="ghost" size="lg" onClick={onProducts}>
                    Browse all products
                    <ArrowUpRight />
                  </Button>
                )}
                {onAbout && (
                  <Button type="button" variant="ghost" size="lg" onClick={onAbout}>
                    About the pasal
                    <ArrowUpRight />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="order" className="scroll-mt-24 bg-surface/80 px-4 py-16 backdrop-blur-sm sm:px-6 sm:py-20">
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
                  className="depth-card-3d flex items-center justify-between rounded-2xl bg-bg px-4 py-3 shadow-[var(--shadow-border)]"
                  data-tilt-strength="3"
                  onPointerMove={updateTilt}
                  onPointerLeave={resetTilt}
                >
                  <span>
                    <span className="block text-xs text-subtle">Call</span>
                    <span className="font-medium">{SHOP.phoneDisplay}</span>
                  </span>
                  <Phone className="size-4 text-muted" />
                </a>
                <a
                  href={mailHref}
                  className="depth-card-3d flex items-center justify-between rounded-2xl bg-bg px-4 py-3 shadow-[var(--shadow-border)]"
                  data-tilt-strength="3"
                  onPointerMove={updateTilt}
                  onPointerLeave={resetTilt}
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
              onSubmit={reviewOrder}
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
                    required
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
                    required
                  />
                </div>
              </div>

              <fieldset className="mt-5">
                <legend className="text-sm font-medium">Pack</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {products.map((item) => {
                    const selected = pack === item.product_id;
                    return (
                      <label
                        key={item.product_id}
                        className={cn(
                          "depth-card-3d cursor-pointer rounded-2xl bg-surface px-3 py-3 text-sm shadow-[var(--shadow-border)] transition-[box-shadow] duration-180 ease-out",
                          selected && "shadow-[var(--shadow-border-hover)] ring-2 ring-ring",
                        )}
                        data-tilt-strength="3"
                        onPointerMove={updateTilt}
                        onPointerLeave={resetTilt}
                      >
                        <input
                          type="radio"
                          name="pack"
                          value={item.product_id}
                          checked={selected}
                          onChange={() => setPack(item.product_id)}
                          className="sr-only"
                        />
                        <span className="block font-medium">{item.name}</span>
                        <span className="text-xs text-muted">{item.kicker}</span>
                        <AvailabilityBadge
                          status={availability[item.product_id]}
                          loading={loading}
                          error={error}
                        />
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                        {availability[pack] === "unavailable"
                          ? "This pack is currently unavailable. You can still send an inquiry by WhatsApp or email."
                          : "Confirming an online order reserves available stock immediately; we’ll contact you about fulfillment and payment."}
                </p>
                {error && (
                  <p className="mt-2 text-xs text-muted" role="status">
                    {error || catalogError}
                  </p>
                )}
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
                  className="w-full resize-y rounded-xl bg-surface px-3.5 py-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none transition-[box-shadow] duration-180 ease-out placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {orderReceipt && (
                <div className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950" role="status" aria-live="polite">
                  <p className="flex items-center gap-2 font-semibold">
                    <Check className="size-4" />
                    Order confirmed — {products.find((item) => item.product_id === orderReceipt.product_id)?.name ?? orderReceipt.product_id}, {orderReceipt.quantity} {orderReceipt.quantity === 1 ? "unit" : "units"} reserved.
                  </p>
                  <p className="mt-1 break-all text-xs">
                    Reference: <span className="font-mono">{orderReceipt.order_id}</span>
                  </p>
                  <p className="mt-2 text-xs leading-relaxed">
                    We’ll contact you to confirm fulfillment and payment. No payment was collected online.
                  </p>
                </div>
              )}
              {orderError && (
                <p className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary" role="alert">
                  {orderError}
                </p>
              )}
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button type="submit" className="flex-1">
                  Review and place order
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href={buildWhatsAppUrl(order)} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon className="size-4" />
                    WhatsApp inquiry
                  </a>
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
                Scan to pay after the shop confirms
              </Button>
            </form>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border bg-accent text-accent-foreground">
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
          Handmade snacks. Placing an online order reserves stock; we’ll contact you to confirm fulfillment and payment.
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

      <Dialog
        open={orderReviewOpen}
        onOpenChange={(open) => {
          if (!orderPending) setOrderReviewOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review your order</DialogTitle>
            <DialogDescription>
              Confirming reserves this quantity from available stock. No payment is collected online; the shop will contact you about fulfillment and payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-2xl bg-bg p-4 text-sm">
            <p><span className="text-muted">Customer:</span> {name}</p>
            <p><span className="text-muted">Phone:</span> {phone}</p>
            <p><span className="text-muted">Product:</span> {selectedProduct?.name ?? pack}</p>
            <p><span className="text-muted">Quantity:</span> {qty}</p>
            {note && <p className="break-words"><span className="text-muted">Note:</span> {note}</p>}
          </div>
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              checked={orderAcknowledged}
              onChange={(event) => setOrderAcknowledged(event.target.checked)}
              className="mt-1 size-4 accent-primary"
            />
            <span>I have reviewed these order details and acknowledge that placing this order reserves the selected stock.</span>
          </label>
          {orderError && (
            <p className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary" role="alert">
              {orderError}
            </p>
          )}
          <Button type="button" onClick={() => void confirmOrder()} disabled={!orderAcknowledged || orderPending}>
            {orderPending ? "Placing order…" : "Confirm and reserve stock"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan to pay</DialogTitle>
            <DialogDescription>
              {SHOP.payNetwork} · {SHOP.payName}. The shop will contact you to confirm fulfillment.
              Do not send payment before the shop confirms your order.
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

    </div>
  );
}
