import sofa from "@/assets/sofa.png";
import armchair from "@/assets/armchair.png";
import table from "@/assets/table.png";
import lamp from "@/assets/lamp.png";
import pendant from "@/assets/pendant.png";
import vase from "@/assets/vase.png";
import art from "@/assets/art.png";
import pillows from "@/assets/pillows.png";
import rug from "@/assets/rug.png";
import sideboard from "@/assets/sideboard.png";
import mirror from "@/assets/mirror.png";
import sidetable from "@/assets/sidetable.png";
import loungechair from "@/assets/loungechair.png";
import books from "@/assets/books.png";
import candles from "@/assets/candles.png";
import pampas from "@/assets/pampas.png";
import ottoman from "@/assets/ottoman.png";
import shelf from "@/assets/shelf.png";
import art2 from "@/assets/art2.png";
import sofaCataline from "@/assets/sofa-cataline.png";
import sofaCataline2 from "@/assets/sofa-cataline-2.jpg";
import sofaCataline3 from "@/assets/sofa-cataline-3.jpg";
import sofaFogler from "@/assets/sofa-fogler.png";
import sofaFogler1 from "@/assets/sofa-fogler-1.jpg";
import sofaFogler2 from "@/assets/sofa-fogler-2.jpg";
import chairOlea from "@/assets/chair-olea.png";
import chairOlea1 from "@/assets/chair-olea-1.jpg";
import chairOlea2 from "@/assets/chair-olea-2.jpg";
import chairJolie from "@/assets/chair-jolie.png";
import chairJolie1 from "@/assets/chair-jolie-1.jpg";
import chairJolie2 from "@/assets/chair-jolie-2.jpg";

export type Category =
  | "Seating"
  | "Tables"
  | "Lighting"
  | "Storage"
  | "Decor"
  | "Textiles"
  | "Art";

/** Decorating role — drives where the piece sits in the composed room.
 *  floor   = rug, large floor textile (lowest, widest)
 *  ground  = sofa, sideboard, shelf, big seating placed on the rug/floor
 *  surface = side table, ottoman, low table (placed near ground furniture)
 *  hanging = pendant lamp, dropped from ceiling
 *  standing = floor lamp, pampas — taller than ground, against wall
 *  wall    = art, mirror — hung on the back wall
 *  prop    = vase, books, candles, pillows — small props on surfaces
 */
export type Role =
  | "floor"
  | "ground"
  | "surface"
  | "hanging"
  | "standing"
  | "wall"
  | "prop";

export type Product = {
  id: string;
  name: string;
  maker: string;
  price: string;
  category: Category;
  src: string;
  /** dominant color tags used by the AI palette algorithm */
  colors: string[];
  /** decorating role for room composition */
  role: Role;
  /** optional product detail content for the overlay */
  description?: string;
  /** additional gallery images (in-context, lifestyle, alternate angles) */
  gallery?: string[];
  /** key/value spec table */
  details?: Record<string, string>;
  /** original product page URL */
  sourceUrl?: string;
  /** real-world dimensions in cm (used to scale the piece on the moodboard) */
  dims?: { w: number; h: number; d?: number };
};

/** Color names map to oklch values (used for palette generation) */
export const colorMap: Record<string, string> = {
  rust: "oklch(0.55 0.14 40)",
  walnut: "oklch(0.34 0.05 50)",
  travertine: "oklch(0.86 0.025 75)",
  linen: "oklch(0.94 0.018 80)",
  cream: "oklch(0.96 0.015 85)",
  brass: "oklch(0.74 0.09 80)",
  charcoal: "oklch(0.28 0.01 60)",
  ink: "oklch(0.22 0.02 50)",
  jute: "oklch(0.7 0.07 70)",
  terracotta: "oklch(0.62 0.13 40)",
  sage: "oklch(0.72 0.04 145)",
  bone: "oklch(0.92 0.012 85)",
  gold: "oklch(0.78 0.11 85)",
  clay: "oklch(0.65 0.1 50)",
};

export const catalog: Product[] = [];


/** Background scene options for the room composer */
export type Scene = {
  id: string;
  name: string;
  /** "palette" means render the active palette as a gradient */
  kind: "palette" | "image";
  src?: string;
};

import roomLiving from "@/assets/room-living.jpg";
import roomKitchen from "@/assets/room-kitchen.jpg";
import roomBedroom from "@/assets/room-bedroom.jpg";

export const scenes: Scene[] = [
  { id: "palette", name: "Palette", kind: "palette" },
  { id: "living", name: "Living Room", kind: "image", src: roomLiving },
  { id: "kitchen", name: "Kitchen", kind: "image", src: roomKitchen },
  { id: "bedroom", name: "Bedroom", kind: "image", src: roomBedroom },
];

export const categories: Category[] = [
  "Seating",
  "Tables",
  "Lighting",
  "Storage",
  "Decor",
  "Textiles",
  "Art",
];

export type Palette = {
  id: string;
  name: string;
  colors: string[]; // color keys from colorMap
};

export const curatedPalettes: Palette[] = [
  { id: "rust-walnut", name: "Rust & Walnut", colors: ["rust", "walnut", "travertine", "linen", "brass"] },
  { id: "coastal", name: "Coastal Calm", colors: ["bone", "linen", "sage", "travertine", "jute"] },
  { id: "mono-warm", name: "Warm Mono", colors: ["cream", "linen", "bone", "jute", "ink"] },
  { id: "terracotta", name: "Terracotta Sun", colors: ["terracotta", "clay", "cream", "brass", "walnut"] },
  { id: "noir", name: "Noir Editorial", colors: ["ink", "charcoal", "linen", "brass", "bone"] },
];

/** Smart local algorithm: derive a palette from selected products */
export function generateAIPalette(productIds: string[]): Palette {
  if (productIds.length === 0) {
    return curatedPalettes[0];
  }
  const tally = new Map<string, number>();
  for (const id of productIds) {
    const p = catalog.find((c) => c.id === id);
    if (!p) continue;
    p.colors.forEach((c, i) => {
      // first color in a product weighs most
      tally.set(c, (tally.get(c) ?? 0) + (3 - i));
    });
  }
  let ranked = Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  // ensure neutrals & accents present for harmony
  const neutrals = ["linen", "cream", "bone", "travertine"];
  const accents = ["brass", "gold", "rust", "terracotta"];
  if (!ranked.some((c) => neutrals.includes(c))) ranked.push("linen");
  if (!ranked.some((c) => accents.includes(c))) ranked.push("brass");

  return { id: "ai", name: "AI Curated", colors: ranked.slice(0, 5) };
}
