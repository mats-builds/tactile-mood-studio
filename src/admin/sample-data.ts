import { catalog, type Product } from "@/data/catalog";

export type Lead = {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO
  magicLinkOpens: number;
  totalEditMinutes: number;
  lastActivity: string; // ISO
  lastActivityLabel: string;
  source: "In Store" | "At Home";
};

export type BoardItem = {
  productId: string;
  x: number; // 0..1
  y: number; // 0..1
  scale: number; // visual scale
};

export type Moodboard = {
  id: string;
  leadId: string;
  title: string;
  createdAt: string;
  items: BoardItem[];
  paletteColors: string[]; // oklch strings
};

export type ActivityEvent = {
  id: string;
  leadId: string;
  at: string; // ISO
  label: string;
  detail?: string;
  kind: "create" | "open" | "edit" | "swap" | "share";
};

const pick = <T,>(arr: T[], n: number, seed: number): T[] => {
  const out: T[] = [];
  let s = seed;
  const pool = [...arr];
  for (let i = 0; i < n && pool.length; i++) {
    s = (s * 9301 + 49297) % 233280;
    const idx = Math.floor((s / 233280) * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
};

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

export const leads: Lead[] = [
  {
    id: "l1",
    name: "Eva van der Linden",
    email: "eva.vdl@protonmail.com",
    createdAt: iso(1000 * 60 * 60 * 26),
    magicLinkOpens: 5,
    totalEditMinutes: 42,
    lastActivity: iso(1000 * 60 * 10),
    lastActivityLabel: "Edited at home",
    source: "In Store",
  },
  {
    id: "l2",
    name: "Jasper Bakker",
    email: "jasper@bakkerstudio.nl",
    createdAt: iso(1000 * 60 * 60 * 50),
    magicLinkOpens: 2,
    totalEditMinutes: 8,
    lastActivity: iso(1000 * 60 * 60 * 3),
    lastActivityLabel: "Opened on mobile",
    source: "In Store",
  },
  {
    id: "l3",
    name: "Noa de Vries",
    email: "noa.devries@gmail.com",
    createdAt: iso(1000 * 60 * 60 * 72),
    magicLinkOpens: 7,
    totalEditMinutes: 64,
    lastActivity: iso(1000 * 60 * 32),
    lastActivityLabel: "Swapped sofa for sectional",
    source: "In Store",
  },
  {
    id: "l4",
    name: "Mees Janssen",
    email: "mees.j@me.com",
    createdAt: iso(1000 * 60 * 60 * 18),
    magicLinkOpens: 1,
    totalEditMinutes: 4,
    lastActivity: iso(1000 * 60 * 60 * 18),
    lastActivityLabel: "Created in store",
    source: "In Store",
  },
  {
    id: "l5",
    name: "Sophie Aalders",
    email: "sophie.aalders@outlook.com",
    createdAt: iso(1000 * 60 * 60 * 96),
    magicLinkOpens: 4,
    totalEditMinutes: 22,
    lastActivity: iso(1000 * 60 * 60 * 6),
    lastActivityLabel: "Edited at home",
    source: "At Home",
  },
  {
    id: "l6",
    name: "Lars Hofman",
    email: "lars.hofman@kpnmail.nl",
    createdAt: iso(1000 * 60 * 60 * 120),
    magicLinkOpens: 6,
    totalEditMinutes: 31,
    lastActivity: iso(1000 * 60 * 90),
    lastActivityLabel: "Shared with partner",
    source: "In Store",
  },
  {
    id: "l7",
    name: "Iris Mulder",
    email: "iris@mulderdesign.com",
    createdAt: iso(1000 * 60 * 60 * 200),
    magicLinkOpens: 3,
    totalEditMinutes: 18,
    lastActivity: iso(1000 * 60 * 60 * 24),
    lastActivityLabel: "Opened on desktop",
    source: "In Store",
  },
  {
    id: "l8",
    name: "Tim Visser",
    email: "t.visser@ziggo.nl",
    createdAt: iso(1000 * 60 * 60 * 6),
    magicLinkOpens: 1,
    totalEditMinutes: 2,
    lastActivity: iso(1000 * 60 * 60 * 6),
    lastActivityLabel: "Created in store",
    source: "In Store",
  },
];

function buildBoard(leadId: string, productIds: string[], seed: number): Moodboard {
  const items: BoardItem[] = productIds.map((pid, i) => {
    const s = (seed + i * 31) % 100;
    return {
      productId: pid,
      x: 0.1 + ((s * 7) % 80) / 100,
      y: 0.15 + ((s * 13) % 70) / 100,
      scale: 0.7 + ((s * 3) % 60) / 100,
    };
  });
  const colors = productIds
    .flatMap((pid) => catalog.find((c) => c.id === pid)?.colors ?? [])
    .slice(0, 5);
  return {
    id: `mb-${leadId}-${seed}`,
    leadId,
    title: `Board ${seed}`,
    createdAt: iso(1000 * 60 * 60 * (24 + seed * 8)),
    items,
    paletteColors: colors,
  };
}

export const moodboards: Moodboard[] = [
  buildBoard("l1", ["sofa-cataline", "table", "lamp", "rug", "art2", "vase"], 1),
  buildBoard("l1", ["sofa-fogler", "sidetable", "pendant", "rug", "art", "books"], 2),
  buildBoard("l2", ["loungechair", "sidetable", "lamp", "vase"], 1),
  buildBoard("l3", ["sofa", "table", "rug", "art", "pillows", "candles", "mirror"], 1),
  buildBoard("l3", ["chair-olea", "ottoman", "sideboard", "art2"], 2),
  buildBoard("l4", ["chair-jolie", "sidetable", "lamp"], 1),
  buildBoard("l5", ["sofa-cataline", "rug", "pendant", "pampas", "books"], 1),
  buildBoard("l6", ["sofa", "table", "loungechair", "lamp", "rug", "art"], 1),
  buildBoard("l6", ["sideboard", "mirror", "vase", "candles"], 2),
  buildBoard("l7", ["loungechair", "sidetable", "pampas", "art2"], 1),
  buildBoard("l8", ["chair-olea", "ottoman", "vase"], 1),
];

export const activity: ActivityEvent[] = [
  { id: "a1", leadId: "l1", at: iso(1000 * 60 * 60 * 26), label: "Created in store", kind: "create" },
  { id: "a2", leadId: "l1", at: iso(1000 * 60 * 60 * 20), label: "Opened magic link on mobile", kind: "open" },
  { id: "a3", leadId: "l1", at: iso(1000 * 60 * 60 * 4), label: "Opened on desktop", kind: "open" },
  { id: "a4", leadId: "l1", at: iso(1000 * 60 * 30), label: "Swapped Lina Sofa for Cataline", detail: "Replaced ground piece", kind: "swap" },
  { id: "a5", leadId: "l1", at: iso(1000 * 60 * 10), label: "Added Halo Mirror", kind: "edit" },
  { id: "a6", leadId: "l3", at: iso(1000 * 60 * 60 * 72), label: "Created in store", kind: "create" },
  { id: "a7", leadId: "l3", at: iso(1000 * 60 * 60 * 48), label: "Opened on mobile", kind: "open" },
  { id: "a8", leadId: "l3", at: iso(1000 * 60 * 60 * 12), label: "Edited palette to Terracotta", kind: "edit" },
  { id: "a9", leadId: "l3", at: iso(1000 * 60 * 32), label: "Swapped Velvet Sofa for Bouclé Sectional", kind: "swap" },
  { id: "a10", leadId: "l6", at: iso(1000 * 60 * 60 * 120), label: "Created in store", kind: "create" },
  { id: "a11", leadId: "l6", at: iso(1000 * 60 * 60 * 60), label: "Shared board with partner", kind: "share" },
  { id: "a12", leadId: "l6", at: iso(1000 * 60 * 90), label: "Added Walnut Sideboard", kind: "edit" },
];

export function parsePrice(p: string): number {
  const n = parseFloat(p.replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function boardValue(board: Moodboard): number {
  return board.items.reduce((sum, it) => {
    const p = catalog.find((c) => c.id === it.productId);
    return sum + (p ? parsePrice(p.price) : 0);
  }, 0);
}

export function leadBoardValue(leadId: string): number {
  return moodboards
    .filter((b) => b.leadId === leadId)
    .reduce((sum, b) => sum + boardValue(b), 0);
}

export function isHighIntent(lead: Lead): boolean {
  return lead.magicLinkOpens > 3 || lead.totalEditMinutes > 15;
}

export function getProduct(id: string): Product | undefined {
  return catalog.find((c) => c.id === id);
}

/** 30-day in-store vs at-home sessions (deterministic) */
export function sessionsLast30Days(): Array<{ day: string; inStore: number; atHome: number }> {
  const arr: Array<{ day: string; inStore: number; atHome: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const seed = d.getDate() + d.getMonth() * 31;
    const inStore = 2 + ((seed * 7) % 9);
    const atHome = 1 + ((seed * 13) % 11);
    arr.push({
      day: `${d.getMonth() + 1}/${d.getDate()}`,
      inStore,
      atHome,
    });
  }
  return arr;
}

export function formatEUR(n: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

// keep pick exported for potential future use
export { pick };