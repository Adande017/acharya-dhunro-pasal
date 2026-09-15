export const SHOP = {
  name: "Acharya Dhunro Pasal",
  product: "Corn Puff Pipes",
  tagline: "Pipe-shaped puffs from traditional maize.",
  city: "Kathmandu",
  country: "Nepal",
  phoneTel: "+9779845044572",
  phoneDisplay: "+977 984-5044572",
  email: "roms7291@gmail.com",
  whatsapp: "9779845044572",
  payNetwork: "Global IME",
  payName: "Roman Acharya",
} as const;

export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path.replace(/^\//, "")}`;
}

export const PACKS = [
  {
    id: "snack",
    name: "Snack bag",
    kicker: "Everyday",
    description:
      "A light bag for home and teatime. Crisp maize pipes, ready to share.",
    image: "product/closeup-bright.jpg",
    imageAlt: "Close-up of golden Corn Puff Pipes spilling from a bowl",
    suited: "Home, office, after-school",
  },
  {
    id: "party",
    name: "Party pack",
    kicker: "Gatherings",
    description:
      "A larger share for birthdays, puja, and gifting. Same handmade batch.",
    image: "product/basket-bright.jpg",
    imageAlt: "Woven basket filled with Corn Puff Pipes on a wooden table",
    suited: "Celebrations and gifting",
  },
  {
    id: "bulk",
    name: "Bulk order",
    kicker: "Wholesale",
    description:
      "Sacks for shops and events. Call to arrange pickup or delivery.",
    image: "product/bulk-bright.jpg",
    imageAlt: "Large sack of Corn Puff Pipes, bulk wholesale pack",
    suited: "Kirana, events, resale",
  },
] as const;

export type PackId = (typeof PACKS)[number]["id"];

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export function sanitizeLine(value: string, max = 120): string {
  return value.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function clampQty(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(99, Math.max(1, Math.floor(n)));
}

export function buildWhatsAppUrl(input: {
  name: string;
  phone: string;
  pack: PackId;
  qty: number;
  note: string;
}): string {
  const pack = PACKS.find((p) => p.id === input.pack)?.name ?? "Snack bag";
  const lines = [
    `Namaste, I would like to order ${SHOP.product} from ${SHOP.name}.`,
    `Name: ${sanitizeLine(input.name, 80) || "—"}`,
    `Phone: ${sanitizeLine(input.phone, 24) || "—"}`,
    `Pack: ${pack}`,
    `Quantity: ${clampQty(input.qty)}`,
  ];
  const note = sanitizeLine(input.note, 200);
  if (note) lines.push(`Note: ${note}`);
  return `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function buildMailtoUrl(input: {
  name: string;
  phone: string;
  pack: PackId;
  qty: number;
  note: string;
}): string {
  const pack = PACKS.find((p) => p.id === input.pack)?.name ?? "Snack bag";
  const subject = `${SHOP.product} order — ${pack}`;
  const body = [
    `Namaste,`,
    ``,
    `I would like to order ${SHOP.product} from ${SHOP.name}.`,
    `Name: ${sanitizeLine(input.name, 80) || "—"}`,
    `Phone: ${sanitizeLine(input.phone, 24) || "—"}`,
    `Pack: ${pack}`,
    `Quantity: ${clampQty(input.qty)}`,
    sanitizeLine(input.note, 200) ? `Note: ${sanitizeLine(input.note, 200)}` : "",
  ]
    .filter((line, i, arr) => line !== "" || arr[i - 1] !== "")
    .join("\n");
  return `mailto:${SHOP.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const telHref = `tel:${SHOP.phoneTel}`;
export const mailHref = `mailto:${SHOP.email}`;
export const waHref = `https://wa.me/${SHOP.whatsapp}`;
