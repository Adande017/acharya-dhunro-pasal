import { useEffect, useRef, useState, type FormEvent } from "react";
import type { IScannerControls } from "@zxing/browser";
import {
  ArrowLeft,
  Camera,
  Check,
  Minus,
  Package,
  Plus,
  Printer,
  RefreshCw,
  ScanLine,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PACKS, SHOP, type PackId } from "@/lib/shop";
import { supabase } from "@/lib/supabase";
import type { Database, Json } from "@/lib/database.types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type InventoryTransaction = Database["public"]["Tables"]["inventory_transactions"]["Row"];
type Cart = Partial<Record<PackId, number>>;
type InventoryMode = "receive" | "sale";

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

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function BarcodeLabel({ item }: { item: InventoryItem }) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const pack = PACKS.find((candidate) => candidate.id === item.product_id);

  useEffect(() => {
    if (!barcodeRef.current) return;
    JsBarcode(barcodeRef.current, item.barcode, {
      format: "CODE128",
      height: 54,
      width: 2,
      displayValue: true,
      fontSize: 13,
      margin: 8,
    });
  }, [item.barcode]);

  return (
    <article className="barcode-label rounded-2xl border border-border bg-white p-3 text-center text-fg">
      <p className="text-sm font-semibold">{pack?.name ?? item.product_id}</p>
      <svg ref={barcodeRef} className="mx-auto mt-2 max-w-full" aria-label={`Barcode ${item.barcode}`} />
    </article>
  );
}

export function InventoryPage({
  onShop,
  onSignOut,
  isOwner,
}: {
  onShop: () => void;
  onSignOut: () => void;
  isOwner: boolean;
}) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [staffEmails, setStaffEmails] = useState<string[]>([]);
  const [staffEmailInput, setStaffEmailInput] = useState("");
  const [staffNotice, setStaffNotice] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffPending, setStaffPending] = useState(false);
  const [mode, setMode] = useState<InventoryMode>("receive");
  const [receiveCart, setReceiveCart] = useState<Cart>({});
  const [saleCart, setSaleCart] = useState<Cart>({});
  const [barcodeInput, setBarcodeInput] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControls = useRef<IScannerControls | null>(null);
  const cameraRequest = useRef(0);
  const cart = mode === "receive" ? receiveCart : saleCart;
  const setCart = mode === "receive" ? setReceiveCart : setSaleCart;

  async function refreshInventory(): Promise<void> {
    if (!supabase) throw new Error("Inventory service is unavailable.");
    const [itemsResult, historyResult] = await Promise.all([
      supabase.from("inventory_items").select("*").order("product_id"),
      supabase
        .from("inventory_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    if (itemsResult.error) throw itemsResult.error;
    if (historyResult.error) throw historyResult.error;
    setItems(itemsResult.data);
    setHistory(historyResult.data);
  }

  async function refreshStaffEmails(): Promise<void> {
    if (!supabase) throw new Error("Inventory service is unavailable.");
    const { data, error } = await supabase
      .from("inventory_staff_emails")
      .select("email")
      .order("email");
    if (error) throw error;
    setStaffEmails(data.map((staff) => staff.email));
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    void refreshInventory()
      .catch((error: unknown) => {
        if (active) setNotice(`Inventory could not be loaded: ${messageOf(error)}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      cameraRequest.current += 1;
      scannerControls.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    setStaffLoading(true);
    void refreshStaffEmails()
      .catch((error: unknown) => {
        if (active) setStaffNotice(`Staff access could not be loaded: ${messageOf(error)}`);
      })
      .finally(() => {
        if (active) setStaffLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOwner]);

  async function addStaffEmail(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!supabase) {
      setStaffNotice("Inventory service is unavailable.");
      return;
    }

    const email = staffEmailInput.trim().toLowerCase();
    setStaffPending(true);
    setStaffNotice("");
    try {
      const { error } = await supabase.from("inventory_staff_emails").insert({ email });
      if (error) throw error;
      setStaffEmailInput("");
      await refreshStaffEmails();
      setStaffNotice(`${email} is approved for inventory. They can sign in with their own account.`);
    } catch (error: unknown) {
      setStaffNotice(`Staff access could not be added: ${messageOf(error)}`);
    } finally {
      setStaffPending(false);
    }
  }

  async function removeStaffEmail(email: string): Promise<void> {
    if (!supabase || !window.confirm(`Remove inventory access for ${email}?`)) return;
    setStaffPending(true);
    setStaffNotice("");
    try {
      const { error } = await supabase.from("inventory_staff_emails").delete().eq("email", email);
      if (error) throw error;
      await refreshStaffEmails();
      setStaffNotice(`Inventory access was removed for ${email}.`);
    } catch (error: unknown) {
      setStaffNotice(`Staff access could not be removed: ${messageOf(error)}`);
    } finally {
      setStaffPending(false);
    }
  }

  async function startCamera(): Promise<void> {
    if (!videoRef.current) return;
    setNotice("");
    const requestId = ++cameraRequest.current;
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _error, activeControls) => {
          if (!result) return;
          activeControls.stop();
          cameraRequest.current += 1;
          scannerControls.current = null;
          setScanning(false);
          setBarcodeInput("");
          addBarcode(result.getText());
        },
      );
      if (cameraRequest.current !== requestId) {
        controls.stop();
        return;
      }
      scannerControls.current = controls;
    } catch (error: unknown) {
      if (cameraRequest.current === requestId) {
        setScanning(false);
        setNotice(
          error instanceof Error && error.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access or scan with a Bluetooth scanner."
            : `Camera scanning could not start: ${messageOf(error)}`,
        );
      }
    }
  }

  function stopCamera(): void {
    cameraRequest.current += 1;
    scannerControls.current?.stop();
    scannerControls.current = null;
    setScanning(false);
  }

  function addBarcode(value: string): void {
    const barcode = value.trim().toUpperCase();
    if (!barcode) return;
    const item = items.find((candidate) => candidate.barcode.toUpperCase() === barcode);
    if (!item) {
      setNotice(`Barcode “${barcode}” isn’t assigned to an inventory product.`);
      return;
    }

    const currentCart = mode === "receive" ? receiveCart : saleCart;
    const currentQuantity = currentCart[item.product_id as PackId] ?? 0;
    if (mode === "sale" && currentQuantity >= item.quantity_on_hand) {
      setNotice(`Only ${item.quantity_on_hand} ${item.quantity_on_hand === 1 ? "unit is" : "units are"} available for ${item.barcode}.`);
      return;
    }
    setCart((current) => ({
      ...current,
      [item.product_id]: (current[item.product_id as PackId] ?? 0) + 1,
    }));
    setNotice(`${item.barcode} added to the ${mode === "receive" ? "receiving" : "sales"} cart.`);
  }

  function submitBarcode(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    addBarcode(barcodeInput);
    setBarcodeInput("");
  }

  function changeQuantity(productId: PackId, change: number): void {
    const item = items.find((candidate) => candidate.product_id === productId);
    const current = cart[productId] ?? 0;
    const max = mode === "sale" ? item?.quantity_on_hand ?? 0 : 10000;
    const next = Math.min(max, Math.max(0, current + change));
    setCart((previous) => {
      const updated = { ...previous };
      if (next === 0) delete updated[productId];
      else updated[productId] = next;
      return updated;
    });
  }

  async function confirmCart(): Promise<void> {
    if (!supabase) {
      setNotice("Inventory service is unavailable.");
      return;
    }
    const lines = Object.entries(cart)
      .filter((entry): entry is [PackId, number] => typeof entry[1] === "number" && entry[1] > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }));
    if (!lines.length) return;

    setPending(true);
    setNotice("");
    const successMessage =
      mode === "receive" ? "Received stock and updated inventory." : "Sale confirmed and stock deducted.";
    try {
      const result =
        mode === "receive"
          ? await supabase.rpc("receive_inventory", { p_items: lines as Json })
          : await supabase.rpc("complete_inventory_sale", { p_items: lines as Json });
      if (result.error) throw result.error;
      setCart({});
      setNotice(successMessage);
      try {
        await refreshInventory();
      } catch {
        setNotice(`${successMessage} The stock display could not refresh; reload the inventory page.`);
      }
    } catch (error: unknown) {
      setNotice(`The cart was not saved: ${messageOf(error)}`);
    } finally {
      setPending(false);
    }
  }

  const cartCount = Object.values(cart).reduce((total, quantity) => total + (quantity ?? 0), 0);

  return (
    <main className="inventory-screen page-transition min-h-dvh bg-bg text-fg">
      <header className="border-b border-border bg-bg/90 backdrop-blur-md" data-print-hide>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <Package className="size-5" />
            </span>
            <div>
              <p className="font-display text-base font-semibold">{SHOP.name}</p>
              <p className="text-xs text-muted">{isOwner ? "Owner inventory" : "Staff inventory"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onShop}>
              <ArrowLeft />
              <span className="hidden sm:inline">Back to shop</span>
              <span className="sm:hidden">Shop</span>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onSignOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-print-hide>
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Barcode inventory</p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Stock desk</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Scan a product barcode with the camera or a Bluetooth scanner. Each scan adds one unit to the selected cart.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer />
            Print product labels
          </Button>
        </div>

        {notice && (
          <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-fg" role="status" aria-live="polite">
            {notice}
          </p>
        )}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]" data-print-hide>
          <div className="space-y-5">
            <div className="rounded-3xl border border-border/70 bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
              <div
                className="grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1"
                role="tablist"
                aria-label="Inventory operation"
              >
                {(["receive", "sale"] as const).map((nextMode) => (
                  <button
                    key={nextMode}
                    type="button"
                    role="tab"
                    aria-selected={mode === nextMode}
                    onClick={() => setMode(nextMode)}
                    className={`h-10 rounded-full text-sm font-medium ${
                      mode === nextMode ? "bg-surface text-fg shadow-[var(--shadow-border)]" : "text-muted hover:text-fg"
                    }`}
                  >
                    {nextMode === "receive" ? "Receive stock" : "Sales cart"}
                  </button>
                ))}
              </div>

              <form className="mt-5 flex gap-2" onSubmit={submitBarcode}>
                <div className="min-w-0 flex-1">
                  <Label htmlFor="inventory-barcode">Barcode or product code</Label>
                  <Input
                    id="inventory-barcode"
                    type="text"
                    value={barcodeInput}
                    onChange={(event) => setBarcodeInput(event.target.value)}
                    placeholder="Scan here, then press Enter"
                    autoComplete="off"
                    className="mt-2 h-12 font-mono"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="mt-7 h-12 shrink-0" disabled={!barcodeInput.trim()}>
                  <ScanLine />
                  <span className="hidden sm:inline">Add scan</span>
                </Button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  aria-pressed={scanning}
                  onClick={() => (scanning ? stopCamera() : void startCamera())}
                >
                  <Camera />
                  {scanning ? "Stop camera" : "Use camera"}
                </Button>
                <p className="self-center text-xs text-muted">
                  Bluetooth scanners work as a keyboard and can scan into the focused field.
                </p>
              </div>
              <video
                ref={videoRef}
                className={`mt-4 max-h-80 w-full rounded-2xl bg-accent object-cover ${scanning ? "" : "hidden"}`}
                muted
                playsInline
                aria-label="Camera barcode preview"
              />
            </div>

            <div className="rounded-3xl border border-border/70 bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold">Current stock</h2>
                  <p className="mt-1 text-xs text-muted">Low stock is 10 units or fewer.</p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Refresh inventory" onClick={() => {
                  setLoading(true);
                  void refreshInventory()
                    .then(() => setNotice("Inventory refreshed."))
                    .catch((error: unknown) => setNotice(`Inventory could not be refreshed: ${messageOf(error)}`))
                    .finally(() => setLoading(false));
                }}>
                  <RefreshCw />
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                {loading ? (
                  <p className="rounded-2xl bg-bg p-4 text-sm text-muted">Loading inventory…</p>
                ) : (
                  items.map((item) => {
                    const pack = PACKS.find((candidate) => candidate.id === item.product_id);
                    return (
                      <article key={item.product_id} className="flex items-center gap-3 rounded-2xl bg-bg p-3 sm:p-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-primary">
                          <Package className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{pack?.name ?? item.product_id}</p>
                          <p className="truncate font-mono text-xs text-muted">{item.barcode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold tabular-nums">{item.quantity_on_hand}</p>
                          <p className="text-[0.6875rem] text-muted">units</p>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-border/70 bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">
                  {mode === "receive" ? "Incoming stock" : "Checkout"}
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold">
                  {mode === "receive" ? "Receiving cart" : "Sales cart"}
                </h2>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-surface-muted text-accent">
                <ShoppingCart className="size-5" />
              </span>
            </div>

            <div className="mt-5 space-y-2">
              {Object.entries(cart).map(([productId, quantity]) => {
                const pack = PACKS.find((candidate) => candidate.id === productId);
                const item = items.find((candidate) => candidate.product_id === productId);
                if (!pack || !item || !quantity) return null;
                return (
                  <div key={productId} className="rounded-2xl bg-bg p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{pack.name}</p>
                        <p className="font-mono text-xs text-muted">{item.barcode}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${pack.name} from cart`}
                        onClick={() => changeQuantity(pack.id, -quantity)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted">Units</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Remove one ${pack.name}`}
                          onClick={() => changeQuantity(pack.id, -1)}
                        >
                          <Minus />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Add one ${pack.name}`}
                          onClick={() => changeQuantity(pack.id, 1)}
                          disabled={mode === "sale" && quantity >= item.quantity_on_hand}
                        >
                          <Plus />
                        </Button>
                      </div>
                    </div>
                    {mode === "sale" && (
                      <p className="mt-2 text-xs text-muted">{item.quantity_on_hand} units available</p>
                    )}
                  </div>
                );
              })}
              {cartCount === 0 && (
                <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-border bg-bg p-5 text-center">
                  <div>
                    <ShoppingCart className="mx-auto size-7 text-subtle" />
                    <p className="mt-2 text-sm font-medium">Your cart is empty</p>
                    <p className="mt-1 text-xs text-muted">Scan a product barcode to add a unit.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Total units</span>
                <span className="font-semibold tabular-nums">{cartCount}</span>
              </div>
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={() => void confirmCart()}
                disabled={pending || loading || cartCount === 0}
              >
                {mode === "receive" ? <Plus /> : <Check />}
                {pending
                  ? "Saving…"
                  : mode === "receive"
                    ? "Add received stock"
                    : `Confirm sale (${cartCount})`}
              </Button>
              <p className="mt-2 text-center text-xs leading-relaxed text-muted">
                {mode === "receive"
                  ? "Stock changes after you add the received items."
                  : "Stock is deducted only after you confirm the sale."}
              </p>
            </div>
          </aside>
        </section>

        {isOwner && (
          <section className="rounded-3xl border border-border/70 bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6" data-print-hide>
            <div>
              <h2 className="font-display text-xl font-semibold">Staff access</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Approve individual email addresses. Staff use their own account; removing an email revokes inventory access.
              </p>
            </div>
            <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => void addStaffEmail(event)}>
              <div className="flex-1 space-y-2">
                <Label htmlFor="staff-email">Staff email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={staffEmailInput}
                  onChange={(event) => setStaffEmailInput(event.target.value)}
                  placeholder="staff@example.com"
                  required
                  disabled={staffPending}
                />
              </div>
              <Button type="submit" disabled={staffPending || !staffEmailInput.trim()}>
                {staffPending ? "Saving…" : "Approve staff"}
              </Button>
            </form>
            {staffNotice && (
              <p className="mt-3 text-sm text-muted" role="status" aria-live="polite">
                {staffNotice}
              </p>
            )}
            <div className="mt-4 space-y-2">
              {staffLoading ? (
                <p className="rounded-2xl bg-bg p-4 text-sm text-muted">Loading staff access…</p>
              ) : staffEmails.length ? (
                staffEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between gap-3 rounded-2xl bg-bg p-3">
                    <span className="min-w-0 truncate text-sm">{email}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={staffPending}
                      onClick={() => void removeStaffEmail(email)}
                    >
                      <Trash2 />
                      Remove access
                    </Button>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-bg p-4 text-sm text-muted">No additional staff accounts are approved.</p>
              )}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-border/70 bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6" data-print-hide>
          <h2 className="font-display text-xl font-semibold">Recent stock activity</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Product</th>
                  <th className="py-2 pr-4 text-right font-medium">Units</th>
                  <th className="py-2 pr-4 text-right font-medium">Stock after</th>
                  <th className="py-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-4">{entry.transaction_type === "received" ? "Received" : "Sale"}</td>
                    <td className="py-3 pr-4">{PACKS.find((pack) => pack.id === entry.product_id)?.name ?? entry.product_id}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{entry.quantity}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{entry.stock_after}</td>
                    <td className="py-3 text-right text-xs text-muted">{formatTime(entry.created_at)}</td>
                  </tr>
                ))}
                {!history.length && !loading && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-muted">
                      No stock activity yet. Scans will appear here after you confirm a receiving cart or sale.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="barcode-print-sheet" aria-label="Printable product barcodes">
          <h1 className="mb-5 text-xl font-semibold">{SHOP.name} · Product barcodes</h1>
          <div className="grid grid-cols-2 gap-4">
            {items.map((item) => <BarcodeLabel key={item.product_id} item={item} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
