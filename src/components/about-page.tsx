import { ArrowLeft, ArrowUpRight, MapPin, Sparkles, Users, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { asset, SHOP, telHref } from "@/lib/shop";

const DETAILS = [
  {
    category: "Our story",
    title: "A familiar teatime favorite.",
    description:
      "Acharya Dhunro Pasal makes Corn Puff Pipes for families, gatherings, and neighborhood shops in Kathmandu.",
    icon: Sparkles,
  },
  {
    category: "Ingredients",
    title: "Traditional, non-hybrid maize.",
    description:
      "We puff traditional maize into light, airy pipes with a clean crunch and a naturally golden finish.",
    icon: Wheat,
  },
  {
    category: "How we make it",
    title: "Small batches, handmade with care.",
    description:
      "Keeping each run small helps us maintain an even crunch. Choose a bag for home, a pack for a gathering, or a sack for your shop.",
    icon: Sparkles,
  },
  {
    category: "Community",
    title: "Good snacks bring people together.",
    description:
      "Meet other pasal members, share a moment, and stay in touch through profiles, a community feed, and messages.",
    icon: Users,
  },
  {
    category: "Find us",
    title: "Made in Kathmandu, Nepal.",
    description:
      "Call to confirm your order. We’ll arrange pickup or delivery and share payment details once everything is confirmed.",
    icon: MapPin,
  },
] as const;

export function AboutPage({
  onHome,
  onProducts,
  onCommunity,
  onAccount,
}: {
  onHome: () => void;
  onProducts: () => void;
  onCommunity?: () => void;
  onAccount?: () => void;
}) {
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
            {onAccount && (
              <Button type="button" variant="ghost" size="sm" onClick={onAccount}>
                Account
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onHome}>
              <ArrowLeft />
              Shop home
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
                About the pasal
              </p>
              <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                The story behind the snack.
              </h1>
              <p className="mt-3 max-w-xl text-muted">
                A little more about our ingredients, our craft, and the community around us.
              </p>
            </div>
            <Button type="button" onClick={onProducts}>
              Browse products
              <ArrowUpRight />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DETAILS.map((detail) => {
              const Icon = detail.icon;
              return (
                <article key={detail.category} className="glass-card rounded-3xl p-6 sm:p-7">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-surface/70 text-primary shadow-[var(--shadow-border)]">
                    <Icon className="size-5" />
                  </div>
                  <p className="mt-6 text-xs font-medium tracking-[0.16em] text-muted uppercase">
                    {detail.category}
                  </p>
                  <h2 className="mt-2 font-display text-xl font-medium tracking-tight sm:text-2xl">
                    {detail.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{detail.description}</p>
                </article>
              );
            })}
          </div>

          <div className="glass-card mt-6 flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">
                Questions or ready to order?
              </p>
              <p className="mt-2 font-display text-xl font-medium tracking-tight">
                We’d love to hear from you.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {onCommunity && (
                <Button type="button" variant="outline" onClick={onCommunity}>
                  <Users />
                  Community
                </Button>
              )}
              <Button asChild>
                <a href={telHref}>
                  Call {SHOP.phoneDisplay}
                  <ArrowUpRight />
                </a>
              </Button>
              {onAccount && (
                <Button type="button" variant="outline" onClick={onAccount}>
                  Join the community
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
