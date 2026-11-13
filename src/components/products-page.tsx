import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { asset, PACKS, SHOP, telHref, type PackId } from "@/lib/shop";
import { resetTilt, updateTilt } from "@/lib/tilt";

const PRODUCT_FILTERS: Array<{ id: "all" | PackId; label: string }> = [
  { id: "all", label: "All products" },
  { id: "snack", label: "Everyday" },
  { id: "party", label: "Gatherings" },
  { id: "bulk", label: "Wholesale" },
];

export function ProductsPage({
  onHome,
  onOrder,
}: {
  onHome: () => void;
  onOrder: (pack: PackId) => void;
}) {
  const [productFilter, setProductFilter] = useState<"all" | PackId>("all");
  const [productSearch, setProductSearch] = useState("");
  const search = productSearch.trim().toLocaleLowerCase();
  const visiblePacks = PACKS.filter((item) => {
    const matchesFilter = productFilter === "all" || item.id === productFilter;
    const matchesSearch =
      !search ||
      `${item.name} ${item.kicker} ${item.description} ${item.suited}`
        .toLocaleLowerCase()
        .includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="page-transition pasal-watermark relative min-h-dvh bg-bg text-fg">
      <div
        className="watermark-layer"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(rgba(243, 238, 228, 0.94), rgba(243, 238, 228, 0.94)), url("${asset("product/basket-bright.jpg")}")`,
        }}
      />
      <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:px-6">
          <button
            type="button"
            onClick={onHome}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <img
              src={asset("brand/acharya-dhunro-pasal-logo.png")}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-md object-cover"
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-base font-medium tracking-tight sm:text-lg">
                {SHOP.name}
              </span>
              <span className="hidden truncate text-xs text-muted sm:block">
                {SHOP.product} · {SHOP.city}
              </span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onHome}>
              <ArrowLeft />
              Shop home
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <a href={telHref}>
                Call to order
                <ArrowUpRight />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
                  Product library
                </p>
                <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                  Find your perfect pack.
                </h1>
                <p className="mt-3 max-w-xl text-muted">
                  Browse every product in one place. Choose a pack and we’ll help you complete
                  your order.
                </p>
              </div>
              <div className="w-full lg:max-w-xs">
                <Label htmlFor="product-search" className="sr-only">
                  Search products
                </Label>
                <Input
                  id="product-search"
                  type="search"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search products…"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Filter products">
              {PRODUCT_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={productFilter === filter.id}
                  onClick={() => setProductFilter(filter.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-180 ${
                    productFilter === filter.id
                      ? "border-accent bg-accent text-accent-foreground shadow-[var(--shadow-border)]"
                      : "border-border bg-surface/90 text-muted hover:-translate-y-0.5 hover:bg-surface hover:text-fg"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-sm text-muted" aria-live="polite">
                {visiblePacks.length} {visiblePacks.length === 1 ? "product" : "products"}
              </p>
              {(productFilter !== "all" || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setProductFilter("all");
                    setProductSearch("");
                  }}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {visiblePacks.length > 0 ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {visiblePacks.map((item) => (
                  <article
                    key={item.id}
                    className="pack-card-3d flex items-center gap-4 rounded-3xl bg-surface/90 p-3 shadow-[var(--shadow-border)] transition-[box-shadow] duration-180 ease-out hover:shadow-[var(--shadow-border-hover)] sm:gap-5 sm:p-4"
                    data-tilt-strength="4"
                    onPointerMove={updateTilt}
                    onPointerLeave={resetTilt}
                  >
                    <img
                      src={asset(item.image)}
                      alt={item.imageAlt}
                      width={96}
                      height={96}
                      loading="lazy"
                      decoding="async"
                      className="pack-card-visual size-16 shrink-0 rounded-2xl object-cover sm:size-20"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
                        {item.kicker}
                      </p>
                      <h2 className="mt-1 font-display text-xl font-medium tracking-tight sm:text-2xl">
                        {item.name}
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
                      <p className="mt-2 text-xs text-subtle">{item.suited}</p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-4"
                        onClick={() => onOrder(item.id)}
                      >
                        Choose this pack
                        <ArrowUpRight />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl bg-surface/90 p-8 text-center shadow-[var(--shadow-border)]">
                <p className="font-display text-xl font-medium">No products match that search.</p>
                <p className="mt-2 text-sm text-muted">Try another name or clear the filters.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                  onClick={() => {
                    setProductFilter("all");
                    setProductSearch("");
                  }}
                >
                  Show all products
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border bg-accent text-accent-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:px-6 sm:py-10">
          <p className="font-display text-lg font-medium">{SHOP.name}</p>
          <p className="text-accent-foreground/70">
            {SHOP.product} · traditional maize · {SHOP.city}
          </p>
        </div>
      </footer>
    </div>
  );
}
