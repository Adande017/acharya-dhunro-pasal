import { useEffect, useRef, useState, type FormEvent } from "react";
import type { IScannerControls } from "@zxing/browser";
import {
  ArrowLeft,
  Archive,
  Camera,
  Check,
  Minus,
  Package,
  Pencil,
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
import { SHOP, type PackId } from "@/lib/shop";
import { supabase } from "@/lib/supabase";
import type { Database, Json } from "@/lib/database.types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type InventoryTransaction = Database["public"]["Tables"]["inventory_transactions"]["Row"];
type CustomerOrder = Database["public"]["Tables"]["customer_orders"]["Row"];
type InventoryProduct = Database["public"]["Tables"]["inventory_products"]["Row"];
type Cart = Partial<Record<PackId, number>>;
type InventoryMode = "receive" | "sale";
type ProductDraft = {
  name: string;
  kicker: string;
  description: string;
  image: string;
  image_alt: string;
  suited: string;
  barcode: string;
  low_stock_threshold: string;
};

const EMPTY_PRODUCT_DRAFT: ProductDraft = {
  name: "",
  kicker: "",
  description: "",
  image: "product/closeup-bright.jpg",
  image_alt: "",
  suited: "",
  barcode: "",
  low_stock_threshold: "10",
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

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function BarcodeLabel({ item, productName }: { item: InventoryItem; productName: string }) {
  const barcodeRef = useRef<SVGSVGElement>(null);

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
      <p className="text-sm font-semibold">{productName}</p>
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
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
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
  const [productPending, setProductPending] = useState(false);
  const [productNotice, setProductNotice] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft>(EMPTY_PRODUCT_DRAFT);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControls = useRef<IScannerControls | null>(null);
  const cameraRequest = useRef(0);
  const cart = mode === "receive" ? receiveCart : saleCart;
  const setCart = mode === "receive" ? setReceiveCart : setSaleCart;

  async function refreshInventory(): Promise<void> {
    if (!supabase) throw new Error("Inventory service is unavailable.");
    const [itemsResult, historyResult, ordersResult, productsResult] = await Promise.all([
      supabase.from("inventory_items").select("*").order("product_id"),
      supabase
        .from("inventory_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("customer_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25),
      supabase.from("inventory_products").select("*").order("sort_order").order("name"),
    ]);
    if (itemsResult.error) throw itemsResult.error;
    if (historyResult.error) throw historyResult.error;
    if (ordersResult.error) throw ordersResult.error;
    if (productsResult.error) throw productsResult.error;
    setItems(itemsResult.data);
    setHistory(historyResult.data);
    setCustomerOrders(ordersResult.data);
    setProducts(productsResult.data);
  }

  function editProduct(product: InventoryProduct): void {
    const item = items.find((candidate) => candidate.product_id === product.product_id);
    setEditingProductId(product.product_id);
    setProductDraft({
      name: product.name,
      kicker: product.kicker,
      description: product.description,
      image: product.image,
      image_alt: product.image_alt,
      suited: product.suited,
      barcode: item?.barcode ?? "",
      low_stock_threshold: String(item?.low_stock_threshold ?? 10),
    });
    setProductNotice("");
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!supabase) {
      setProductNotice("Inventory service is unavailable.");
      return;
    }

    const productId =
      editingProductId ??
      productDraft.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
    if (!productId) {
      setProductNotice("Enter a product name that includes letters or numbers.");
      return;
    }
    if (!editingProductId && products.some((product) => product.product_id === productId)) {
      setProductNotice(`The product ID “${productId}” already exists. Use a distinct product name.`);
      return;
    }

    setProductPending(true);
    setProductNotice("");
    try {
      const { error } = await supabase.rpc("save_inventory_product", {
        p_product_id: productId,
        p_name: productDraft.name.trim(),
        p_kicker: productDraft.kicker.trim(),
        p_description: productDraft.description.trim(),
        p_image: productDraft.image.trim(),
        p_image_alt: productDraft.image_alt.trim(),
        p_suited: productDraft.suited.trim(),
        p_barcode: productDraft.barcode.trim().toUpperCase(),
        p_low_stock_threshold: Number(productDraft.low_stock_threshold),
      });
      if (error) throw error;
      const successMessage = editingProductId ? "Product updated." : "Product added to the catalog.";
      setEditingProductId(null);
      setProductDraft(EMPTY_PRODUCT_DRAFT);
      setProductNotice(successMessage);
      try {
        await refreshInventory();
      } catch (error: unknown) {
        setProductNotice(`${successMessage} The product list could not refresh: ${messageOf(error)}`);
      }
    } catch (error: unknown) {
      setProductNotice(`Product could not be saved: ${messageOf(error)}`);
    } finally {
      setProductPending(false);
    }
  }

  async function setProductActive(product: InventoryProduct, active: boolean): Promise<void> {
    const action = active ? "restore" : "archive";
    if (!supabase) {
      setProductNotice("Inventory service is unavailable.");
      return;
    }
    if (!active && !window.confirm(`Archive ${product.name} from the customer catalog? Stock and history will be kept.`)) {
      return;
    }

    setProductPending(true);
    setProductNotice("");
    try {
      const { error } = await supabase.rpc("set_inventory_product_active", {
        p_product_id: product.product_id,
        p_active: active,
      });
      if (error) throw error;
      const successMessage = `${product.name} ${active ? "restored to" : "archived from"} the customer catalog.`;
      setProductNotice(successMessage);
      try {
        await refreshInventory();
      } catch (error: unknown) {
        setProductNotice(`${successMessage} The product list could not refresh: ${messageOf(error)}`);
      }
    } catch (error: unknown) {
      setProductNotice(`Product could not be ${action}d: ${messageOf(error)}`);
    } finally {
      setProductPending(false);
    }
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
    const product = item && products.find((candidate) => candidate.product_id === item.product_id);
    if (!item || !product?.active) {
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

  const cartCount = Object.values(cart).reduce<number>((total, quantity) => total + (quantity ?? 0), 0);

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
                    const pack = products.find((candidate) => candidate.product_id === item.product_id);
                    return (
                      <article key={item.product_id} className="flex items-center gap-3 rounded-2xl bg-bg p-3 sm:p-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-primary">
                          <Package className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{pack?.name ?? item.product_id}</p>
                          <p className="truncate font-mono text-xs text-muted">{item.barcode}</p>
                          <p className="text-[0.6875rem] text-muted">Alert at {item.low_stock_threshold} units or fewer</p>
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
                const pack = products.find((candidate) => candidate.product_id === productId);
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
                        onClick={() => changeQuantity(pack.product_id, -quantity)}
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
                          onClick={() => changeQuantity(pack.product_id, -1)}
                        >
                          <Minus />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Add one ${pack.name}`}
                          onClick={() => changeQuantity(pack.product_id, 1)}
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

        <section className="rounded-3xl border border-border/70 bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6" data-print-hide>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">Staff tools</p>
              <h2 className="mt-1 font-display text-xl font-semibold">Manage products</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                Add products, edit customer-facing details, barcode and low-stock threshold, or archive products from the storefront. Archived products keep stock and transaction history.
              </p>
            </div>
            {editingProductId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingProductId(null);
                  setProductDraft(EMPTY_PRODUCT_DRAFT);
                  setProductNotice("");
                }}
              >
                Cancel edit
              </Button>
            )}
          </div>

          <form className="mt-5 grid gap-4 rounded-2xl bg-bg p-4 sm:grid-cols-2 sm:p-5" onSubmit={(event) => void saveProduct(event)}>
            <div className="space-y-2">
              <Label htmlFor="product-name">Product name</Label>
              <Input
                id="product-name"
                value={productDraft.name}
                onChange={(event) => setProductDraft((draft) => ({ ...draft, name: event.target.value }))}
                maxLength={80}
                required
                disabled={productPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-kicker">Category / short label</Label>
              <Input
                id="product-kicker"
                value={productDraft.kicker}
                onChange={(event) => setProductDraft((draft) => ({ ...draft, kicker: event.target.value }))}
                maxLength={40}
                placeholder="Everyday, Gatherings…"
                disabled={productPending}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-description">Customer description</Label>
              <textarea
                id="product-description"
                value={productDraft.description}
                onChange={(event) => setProductDraft((draft) => ({ ...draft, description: event.target.value }))}
                maxLength={300}
                rows={3}
                className="w-full resize-y rounded-xl bg-surface px-3.5 py-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={productPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-image">Image path or HTTPS URL</Label>
              <Input
                id="product-image"
                value={productDraft.image}
                onChange={(event) => setProductDraft((draft) => ({ ...draft, image: event.target.value }))}
                maxLength={500}
                required
                disabled={productPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-image-alt">Image description</Label>
              <Input
                id="product-image-alt"
                value={productDraft.image_alt}
                onChange={(event) => setProductDraft((draft) => ({ ...draft, image_alt: event.target.value }))}
                maxLength={200}
                disabled={productPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-suited">Best for</Label>
              <Input
                id="product-suited"
                value={productDraft.suited}
                onChange={(event) => setProductDraft((draft) => ({ ...draft, suited: event.target.value }))}
                maxLength={120}
                disabled={productPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-barcode">Barcode</Label>
              <Input
                id="product-barcode"
                value={productDraft.barcode}
                onChange={(event) => setProductDraft((draft) => ({ ...draft, barcode: event.target.value.toUpperCase() }))}
                pattern="[A-Z0-9][A-Z0-9-]{2,63}"
                maxLength={64}
                required
                className="font-mono"
                disabled={productPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-threshold">Low-stock alert threshold</Label>
              <Input
                id="product-threshold"
                type="number"
                min={0}
                max={1000000}
                value={productDraft.low_stock_threshold}
                onChange={(event) => setProductDraft((draft) => ({ ...draft, low_stock_threshold: event.target.value }))}
                required
                disabled={productPending}
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button type="submit" disabled={productPending}>
                {editingProductId ? <Pencil /> : <Plus />}
                {productPending ? "Saving…" : editingProductId ? "Save product changes" : "Add product"}
              </Button>
            </div>
          </form>

          {productNotice && (
            <p className="mt-3 rounded-xl border border-border bg-bg px-4 py-3 text-sm" role="status" aria-live="polite">
              {productNotice}
            </p>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {products.map((product) => {
              const stockItem = items.find((item) => item.product_id === product.product_id);
              return (
                <article key={product.product_id} className="rounded-2xl border border-border/70 bg-bg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{product.name}</p>
                      <p className="mt-1 font-mono text-xs text-muted">{stockItem?.barcode ?? "No barcode"} · {stockItem?.quantity_on_hand ?? 0} units</p>
                      <p className="mt-1 text-xs text-muted">{product.active ? "Visible in storefront" : "Archived"}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={productPending} onClick={() => editProduct(product)}>
                        <Pencil />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={productPending}
                        onClick={() => void setProductActive(product, !product.active)}
                      >
                        {product.active ? <Archive /> : <RefreshCw />}
                        {product.active ? "Delete from shop" : "Restore"}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
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
                    <td className="py-3 pr-4">{products.find((pack) => pack.product_id === entry.product_id)?.name ?? entry.product_id}</td>
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

        <section className="rounded-3xl border border-border/70 bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6" data-print-hide>
          <div>
            <h2 className="font-display text-xl font-semibold">Customer orders</h2>
            <p className="mt-1 text-sm text-muted">Confirmed online orders with stock reserved at checkout.</p>
          </div>
          <div className="mt-4 space-y-3">
            {customerOrders.map((order) => (
              <article key={order.id} className="rounded-2xl bg-bg p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{order.customer_name} · {order.customer_phone}</p>
                    <p className="mt-1 text-sm">
                      {products.find((pack) => pack.product_id === order.product_id)?.name ?? order.product_id}
                      {" · "}{order.quantity} {order.quantity === 1 ? "unit" : "units"} · Stock reserved
                    </p>
                    {order.note && <p className="mt-1 break-words text-sm text-muted">{order.note}</p>}
                    <p className="mt-1 break-all font-mono text-xs text-muted">Ref: {order.id}</p>
                  </div>
                  <time className="shrink-0 text-xs text-muted">{formatTime(order.created_at)}</time>
                </div>
              </article>
            ))}
            {!customerOrders.length && !loading && (
              <p className="rounded-2xl bg-bg p-4 text-sm text-muted">No customer orders yet.</p>
            )}
          </div>
        </section>

        <section className="barcode-print-sheet" aria-label="Printable product barcodes">
          <h1 className="mb-5 text-xl font-semibold">{SHOP.name} · Product barcodes</h1>
          <div className="grid grid-cols-2 gap-4">
            {items.map((item) => (
              <BarcodeLabel
                key={item.product_id}
                item={item}
                productName={products.find((product) => product.product_id === item.product_id)?.name ?? item.product_id}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
