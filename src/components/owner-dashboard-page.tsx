import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  History,
  Package,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SHOP } from "@/lib/shop";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type OwnerView = "accounts" | "orders" | "inventory" | "activity";
type OwnerAccount =
  Database["public"]["Functions"]["owner_list_accounts"]["Returns"][number];
type CustomerOrder = Database["public"]["Tables"]["customer_orders"]["Row"];
type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
type InventoryProduct = Database["public"]["Tables"]["inventory_products"]["Row"];
type InventoryTransaction =
  Database["public"]["Tables"]["inventory_transactions"]["Row"];
type InventoryStaff =
  Database["public"]["Tables"]["inventory_staff_emails"]["Row"];
type InventoryAuditEvent =
  Database["public"]["Tables"]["inventory_audit_log"]["Row"];

const PAGE_SIZE = 500;
const OWNER_VIEWS: Array<{ id: OwnerView; label: string; icon: typeof Users }> = [
  { id: "accounts", label: "Accounts", icon: Users },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "activity", label: "Staff & activity", icon: History },
];

type PageResponse<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

async function loadAll<T>(
  getPage: (from: number, to: number) => PromiseLike<PageResponse<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await getPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function formatTime(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function EmptyRows({ children }: { children: string }) {
  return (
    <p className="rounded-2xl bg-bg p-5 text-sm text-muted">{children}</p>
  );
}

export function OwnerDashboardPage({
  onInventory,
  onSignOut,
}: {
  onInventory: () => void;
  onSignOut: () => void;
}) {
  const [view, setView] = useState<OwnerView>("accounts");
  const [accounts, setAccounts] = useState<OwnerAccount[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [staff, setStaff] = useState<InventoryStaff[]>([]);
  const [audit, setAudit] = useState<InventoryAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const client = supabase;
    if (!client) {
      setNotice("The owner dashboard service is unavailable.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotice("");
    try {
      const [
        accountRows,
        orderRows,
        inventoryRows,
        productRows,
        transactionRows,
        staffRows,
        auditRows,
      ] = await Promise.all([
        loadAll<OwnerAccount>((from, to) =>
          client
            .rpc("owner_list_accounts")
            .order("created_at", { ascending: false })
            .range(from, to),
        ),
        loadAll<CustomerOrder>((from, to) =>
          client
            .from("customer_orders")
            .select("*")
            .order("created_at", { ascending: false })
            .range(from, to),
        ),
        loadAll<InventoryItem>((from, to) =>
          client
            .from("inventory_items")
            .select("*")
            .order("product_id")
            .range(from, to),
        ),
        loadAll<InventoryProduct>((from, to) =>
          client
            .from("inventory_products")
            .select("*")
            .order("sort_order")
            .order("name")
            .range(from, to),
        ),
        loadAll<InventoryTransaction>((from, to) =>
          client
            .from("inventory_transactions")
            .select("*")
            .order("created_at", { ascending: false })
            .range(from, to),
        ),
        loadAll<InventoryStaff>((from, to) =>
          client
            .from("inventory_staff_emails")
            .select("*")
            .order("created_at", { ascending: false })
            .range(from, to),
        ),
        loadAll<InventoryAuditEvent>((from, to) =>
          client
            .from("inventory_audit_log")
            .select("*")
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to),
        ),
      ]);
      setAccounts(accountRows);
      setOrders(orderRows);
      setItems(inventoryRows);
      setProducts(productRows);
      setTransactions(transactionRows);
      setStaff(staffRows);
      setAudit(auditRows);
    } catch (error: unknown) {
      setNotice(
        error instanceof Error
          ? `Couldn’t load owner data: ${error.message}`
          : "Couldn’t load owner data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const productNames = new Map(
    products.map((product) => [product.product_id, product.name]),
  );

  return (
    <main className="page-transition min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="font-display text-base font-semibold">{SHOP.name}</p>
              <p className="text-xs text-muted">Owner dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onInventory}>
              <ArrowLeft />
              <span className="hidden sm:inline">Inventory</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : undefined} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
            Private owner view
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            Shop records
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Review member accounts, customer orders, inventory, staff access, and
            change history. Private messages and authentication credentials are
            not included.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Member accounts", accounts.length],
            ["Customer orders", orders.length],
            ["Products", products.length],
            ["Staff accounts", staff.length],
          ].map(([label, count]) => (
            <div
              key={label}
              className="rounded-2xl border border-border/70 bg-surface p-4 shadow-[var(--shadow-border)]"
            >
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {loading ? "…" : count}
              </p>
            </div>
          ))}
        </div>

        {notice && (
          <p
            className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary"
            role="alert"
          >
            {notice}
          </p>
        )}

        <nav
          className="flex gap-2 overflow-x-auto rounded-2xl bg-surface p-2 shadow-[var(--shadow-border)]"
          aria-label="Owner records"
        >
          {OWNER_VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-current={view === id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
                view === id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:bg-surface-muted hover:text-fg"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="rounded-3xl bg-surface p-8 text-sm text-muted shadow-[var(--shadow-border)]">
            Loading all owner records…
          </div>
        ) : (
          <>
            {view === "accounts" && (
              <section className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
                <h2 className="font-display text-xl font-semibold">Member accounts</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted">
                        <th className="py-2 pr-4 font-medium">Username</th>
                        <th className="py-2 pr-4 font-medium">Display name</th>
                        <th className="py-2 pr-4 font-medium">Email</th>
                        <th className="py-2 pr-4 font-medium">Joined</th>
                        <th className="py-2 pr-4 font-medium">Last sign-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((account) => (
                        <tr key={account.user_id} className="border-b border-border/60 align-top">
                          <td className="py-3 pr-4 font-mono">@{account.username ?? "—"}</td>
                          <td className="py-3 pr-4">{account.display_name ?? "—"}</td>
                          <td className="py-3 pr-4">{account.email ?? "—"}</td>
                          <td className="py-3 pr-4">{formatTime(account.created_at)}</td>
                          <td className="py-3 pr-4">{formatTime(account.last_sign_in_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!accounts.length && <EmptyRows>No member accounts yet.</EmptyRows>}
                </div>
              </section>
            )}

            {view === "orders" && (
              <section className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
                <h2 className="font-display text-xl font-semibold">Customer orders</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted">
                        <th className="py-2 pr-4 font-medium">Customer</th>
                        <th className="py-2 pr-4 font-medium">Phone</th>
                        <th className="py-2 pr-4 font-medium">Product</th>
                        <th className="py-2 pr-4 font-medium">Qty</th>
                        <th className="py-2 pr-4 font-medium">Note</th>
                        <th className="py-2 pr-4 font-medium">Placed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-border/60 align-top">
                          <td className="py-3 pr-4">{order.customer_name}</td>
                          <td className="py-3 pr-4">{order.customer_phone}</td>
                          <td className="py-3 pr-4">
                            {productNames.get(order.product_id) ?? order.product_id}
                          </td>
                          <td className="py-3 pr-4">{order.quantity}</td>
                          <td className="max-w-64 whitespace-pre-wrap py-3 pr-4">{order.note || "—"}</td>
                          <td className="py-3 pr-4">{formatTime(order.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!orders.length && <EmptyRows>No customer orders yet.</EmptyRows>}
                </div>
              </section>
            )}

            {view === "inventory" && (
              <section className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
                <h2 className="font-display text-xl font-semibold">Inventory and products</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted">
                        <th className="py-2 pr-4 font-medium">Product</th>
                        <th className="py-2 pr-4 font-medium">Product ID</th>
                        <th className="py-2 pr-4 font-medium">Barcode</th>
                        <th className="py-2 pr-4 font-medium">On hand</th>
                        <th className="py-2 pr-4 font-medium">Low-stock alert</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => {
                        const item = items.find(
                          (candidate) => candidate.product_id === product.product_id,
                        );
                        return (
                          <tr key={product.product_id} className="border-b border-border/60 align-top">
                            <td className="py-3 pr-4">{product.name}</td>
                            <td className="py-3 pr-4 font-mono">{product.product_id}</td>
                            <td className="py-3 pr-4 font-mono">{item?.barcode ?? "—"}</td>
                            <td className="py-3 pr-4">{item?.quantity_on_hand ?? 0}</td>
                            <td className="py-3 pr-4">{item?.low_stock_threshold ?? "—"}</td>
                            <td className="py-3 pr-4">{product.active ? "Active" : "Archived"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!products.length && <EmptyRows>No products found.</EmptyRows>}
                </div>
              </section>
            )}

            {view === "activity" && (
              <div className="space-y-6">
                <section className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
                  <h2 className="font-display text-xl font-semibold">Approved staff</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted">
                          <th className="py-2 pr-4 font-medium">Email</th>
                          <th className="py-2 pr-4 font-medium">Approved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff.map((member) => (
                          <tr key={member.email} className="border-b border-border/60">
                            <td className="py-3 pr-4">{member.email}</td>
                            <td className="py-3 pr-4">{formatTime(member.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!staff.length && <EmptyRows>No additional staff are approved.</EmptyRows>}
                  </div>
                </section>

                <section className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
                  <h2 className="font-display text-xl font-semibold">Stock transactions</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted">
                          <th className="py-2 pr-4 font-medium">Type</th>
                          <th className="py-2 pr-4 font-medium">Product</th>
                          <th className="py-2 pr-4 font-medium">Quantity</th>
                          <th className="py-2 pr-4 font-medium">Stock after</th>
                          <th className="py-2 pr-4 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b border-border/60">
                            <td className="py-3 pr-4 capitalize">{transaction.transaction_type}</td>
                            <td className="py-3 pr-4">
                              {productNames.get(transaction.product_id) ?? transaction.product_id}
                            </td>
                            <td className="py-3 pr-4">{transaction.quantity}</td>
                            <td className="py-3 pr-4">{transaction.stock_after}</td>
                            <td className="py-3 pr-4">{formatTime(transaction.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!transactions.length && <EmptyRows>No stock transactions yet.</EmptyRows>}
                  </div>
                </section>

                <section className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
                  <h2 className="font-display text-xl font-semibold">Owner activity log</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted">
                          <th className="py-2 pr-4 font-medium">Time</th>
                          <th className="py-2 pr-4 font-medium">Actor</th>
                          <th className="py-2 pr-4 font-medium">Action</th>
                          <th className="py-2 pr-4 font-medium">Record</th>
                          <th className="py-2 pr-4 font-medium">Before / after</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audit.map((entry) => (
                          <tr key={entry.id} className="border-b border-border/60 align-top">
                            <td className="py-3 pr-4">{formatTime(entry.created_at)}</td>
                            <td className="py-3 pr-4">{entry.actor_email ?? "—"}</td>
                            <td className="py-3 pr-4">
                              {entry.operation} {entry.entity_type}
                            </td>
                            <td className="py-3 pr-4 font-mono">{entry.entity_id}</td>
                            <td className="max-w-96 whitespace-pre-wrap py-3 pr-4 font-mono text-xs">
                              {JSON.stringify(entry.details)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!audit.length && <EmptyRows>No owner activity recorded yet.</EmptyRows>}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
