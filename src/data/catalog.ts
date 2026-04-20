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

export const catalog: Product[] = [
  { id: "sofa", name: "Lina Curved Sofa", maker: "Studio Palerma", price: "€ 4,890", category: "Seating", src: sofa, colors: ["rust", "walnut"], role: "ground", dims: { w: 240, h: 82 } },
  {
    id: "sofa-cataline",
    name: "Cataline 3-piece Modular Sofa",
    maker: "SKLUM",
    price: "€ 1,099",
    category: "Seating",
    src: sofaCataline,
    colors: ["cream", "linen", "bone"],
    role: "ground",
    dims: { w: 302, h: 79 },
    gallery: [sofaCataline2, sofaCataline3],
    description:
      "A 3-piece modular sofa with manually adjustable headrests, upholstered in soft beige chenille (water-repellent polyester) over a pine and poplar plywood frame. Dual-density foam (36 + 30 kg/m³) and synthetic fibres deliver an enveloping yet resilient seat. Built for everyday life — modules anchor together, cushion covers unzip, and plastic feet protect the floor.",
    details: {
      Width: "302 cm",
      Depth: "105 cm",
      Height: "79 cm",
      "Seat height": "42 cm",
      Seats: "4",
      Frame: "Pine & poplar plywood",
      Upholstery: "Beige chenille polyester",
      Collection: "Cataline",
    },
    sourceUrl:
      "https://www.sklum.com/nl/kopen-modulaire-vierzitsbanken/219682-3-delige-modulaire-bank-in-chenille-cataline.html",
  },
  {
    id: "sofa-fogler",
    name: "Fogler 4-piece Modular Sofa with Pouf",
    maker: "SKLUM",
    price: "€ 1,109",
    category: "Seating",
    src: sofaFogler,
    colors: ["cream", "linen", "bone"],
    role: "ground",
    dims: { w: 320, h: 75 },
    gallery: [sofaFogler1, sofaFogler2],
    description:
      "A generous 4-piece modular sofa with matching pouf, upholstered in cream beige chenille. Configure the layout to suit your space — the pouf doubles as a chaise extension or standalone seat. Soft, deep seats with a relaxed silhouette built for daily lounging.",
    details: {
      Seats: "4 + pouf",
      Frame: "Pine & poplar plywood",
      Upholstery: "Cream beige chenille",
      Collection: "Fogler",
    },
    sourceUrl:
      "https://www.sklum.com/nl/kopen-modulaire-vierzitsbanken/157258-4-delige-modulaire-bank-met-poef-fogler.html",
  },
  { id: "armchair", name: "Cane Sling Chair", maker: "Hanssen Workshop", price: "€ 1,680", category: "Seating", src: armchair, colors: ["walnut", "clay"], role: "ground", dims: { w: 78, h: 90 } },
  {
    id: "chair-olea",
    name: "Olea Oak Armchair",
    maker: "SKLUM",
    price: "€ 380",
    category: "Seating",
    src: chairOlea,
    colors: ["walnut", "cream", "linen"],
    role: "ground",
    dims: { w: 80, h: 76 },
    gallery: [chairOlea1, chairOlea2],
    description:
      "A sculptural armchair with a solid dark oak frame cradling a plush cream bouclé seat and curved back. The exposed wood structure pairs warm tones with soft texture — a tactile statement piece for a reading nook or living room.",
    details: {
      Frame: "Solid oak (dark stain)",
      Upholstery: "Cream bouclé",
      Style: "Contemporary sculptural",
      Collection: "Olea",
    },
    sourceUrl:
      "https://www.sklum.com/nl/kopen-fauteuils/215348-fauteuil-van-eikenhout-bekleed-met-olea.html",
  },
  {
    id: "chair-jolie",
    name: "Jolie Chenille Armchair",
    maker: "SKLUM",
    price: "€ 245",
    category: "Seating",
    src: chairJolie,
    colors: ["clay", "jute", "walnut"],
    role: "ground",
    dims: { w: 78, h: 72 },
    gallery: [chairJolie1, chairJolie2],
    description:
      "A rounded, enveloping armchair in wheat brown chenille on a natural wood frame. The barrel-back silhouette and slim wooden legs give it a soft, organic presence that works in modern and rustic interiors alike.",
    details: {
      Frame: "Natural wood",
      Upholstery: "Wheat brown chenille",
      Style: "Barrel-back, organic",
      Collection: "Jolie",
    },
    sourceUrl:
      "https://www.sklum.com/nl/kopen-fauteuils/191900-jolie-chenille-stoffen-fauteuil.html",
  },
  { id: "loungechair", name: "Bouclé Lounge", maker: "Maison Cru", price: "€ 1,420", category: "Seating", src: loungechair, colors: ["cream", "linen"], role: "ground", dims: { w: 75, h: 78 } },
  { id: "ottoman", name: "Linen Pouf", maker: "Maison Cru", price: "€ 320", category: "Seating", src: ottoman, colors: ["linen", "bone"], role: "surface", dims: { w: 50, h: 42 } },
  { id: "table", name: "Oval Travertine Table", maker: "Casa Reni", price: "€ 2,150", category: "Tables", src: table, colors: ["travertine", "bone"], role: "surface", dims: { w: 130, h: 35 } },
  { id: "sidetable", name: "Stone Side Table", maker: "Casa Reni", price: "€ 690", category: "Tables", src: sidetable, colors: ["travertine", "cream"], role: "surface", dims: { w: 45, h: 50 } },
  { id: "sideboard", name: "Walnut Sideboard", maker: "Northwood", price: "€ 3,240", category: "Storage", src: sideboard, colors: ["walnut", "rust"], role: "ground", dims: { w: 200, h: 75 } },
  { id: "shelf", name: "Slim Walnut Shelf", maker: "Northwood", price: "€ 1,980", category: "Storage", src: shelf, colors: ["walnut"], role: "ground", dims: { w: 80, h: 200 } },
  { id: "lamp", name: "Pleated Floor Lamp", maker: "Brass + Linen Co.", price: "€ 920", category: "Lighting", src: lamp, colors: ["linen", "brass"], role: "standing", dims: { w: 40, h: 160 } },
  { id: "pendant", name: "Walnut Pendant 02", maker: "Northwood", price: "€ 740", category: "Lighting", src: pendant, colors: ["walnut", "brass"], role: "hanging", dims: { w: 45, h: 60 } },
  { id: "candles", name: "Brass Candle Trio", maker: "Atelier Dion", price: "€ 240", category: "Lighting", src: candles, colors: ["brass", "gold"], role: "prop", dims: { w: 25, h: 30 } },
  { id: "vase", name: "Onda Vase, Charcoal", maker: "Ceramica Vera", price: "€ 220", category: "Decor", src: vase, colors: ["charcoal", "ink"], role: "prop", dims: { w: 18, h: 32 } },
  { id: "pampas", name: "Pampas Arrangement", maker: "Ceramica Vera", price: "€ 180", category: "Decor", src: pampas, colors: ["bone", "jute"], role: "standing", dims: { w: 60, h: 140 } },
  { id: "books", name: "Linen Library, set of 4", maker: "Atelier Dion", price: "€ 140", category: "Decor", src: books, colors: ["cream", "clay"], role: "prop", dims: { w: 28, h: 22 } },
  { id: "mirror", name: "Halo Brass Mirror", maker: "Atelier Dion", price: "€ 880", category: "Decor", src: mirror, colors: ["brass", "gold"], role: "wall", dims: { w: 80, h: 80 } },
  { id: "pillows", name: "Linen Cushions, pair", maker: "Maison Cru", price: "€ 180", category: "Textiles", src: pillows, colors: ["linen", "cream"], role: "prop", dims: { w: 50, h: 40 } },
  { id: "rug", name: "Hand-woven Jute Rug", maker: "Hanssen Workshop", price: "€ 1,260", category: "Textiles", src: rug, colors: ["jute", "cream"], role: "floor", dims: { w: 300, h: 200 } },
  { id: "art", name: "Figure I, Framed", maker: "Atelier Dion", price: "€ 1,240", category: "Art", src: art, colors: ["bone", "gold", "ink"], role: "wall", dims: { w: 60, h: 90 } },
  { id: "art2", name: "Earthforms II", maker: "Atelier Dion", price: "€ 680", category: "Art", src: art2, colors: ["terracotta", "cream", "clay"], role: "wall", dims: { w: 70, h: 50 } },
];

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
