import { demoCatalog } from "./demo-catalog";
import type { Product } from "./catalog";
import maisonNord from "@/assets/brand-maison-nord.jpg";
import studioPalerma from "@/assets/brand-studio-palerma.jpg";
import atelierDion from "@/assets/brand-atelier-dion.jpg";
import northwood from "@/assets/brand-northwood.jpg";
import casaReni from "@/assets/brand-casa-reni.jpg";
import ceramicaVera from "@/assets/brand-ceramica-vera.jpg";

export type Brand = {
  slug: string;
  name: string;
  /** category line shown above the name on the tile, mimicking the catalog card style */
  tagline: string;
  /** city · country */
  origin: string;
  /** short editorial blurb shown on the brand detail page */
  description: string;
  /** wordmark image used as the tile artwork */
  logo: string;
  /** number of pieces line shown on the tile (e.g. "EUR 850" placement) */
  pieceCount: number;
  /** which makers from demoCatalog count as this brand's stock */
  makers: string[];
  /** id-prefix used to clone demoCatalog items into branded SKUs */
  brandPrefix: string;
};

const RAW_BRANDS: Omit<Brand, "pieceCount">[] = [
  {
    slug: "maison-nord",
    name: "Maison Nord",
    tagline: "Lighting · France",
    origin: "Paris, FR",
    description:
      "Editorial lighting and brass objects, hand-finished in the Marais. A Supermoods preferred partner — pieces are stocked and shipped within 5 working days across the EU.",
    logo: maisonNord,
    makers: ["Brass + Linen Co.", "Atelier Dion"],
    brandPrefix: "maison-nord",
  },
  {
    slug: "studio-palerma",
    name: "Studio Palerma",
    tagline: "Seating · Italy",
    origin: "Milano, IT",
    description:
      "Curved upholstered seating with a 1970s riviera sensibility. Trade pricing available for interior designers via your Supermoods account.",
    logo: studioPalerma,
    makers: ["Studio Palerma", "Maison Cru"],
    brandPrefix: "studio-palerma",
  },
  {
    slug: "atelier-dion",
    name: "Atelier Dion",
    tagline: "Decor & Art · France",
    origin: "Lyon, FR",
    description:
      "Limited-edition art, brass mirrors and library objects. Each piece is numbered and ships with a certificate of authenticity.",
    logo: atelierDion,
    makers: ["Atelier Dion"],
    brandPrefix: "atelier-dion",
  },
  {
    slug: "northwood",
    name: "Northwood",
    tagline: "Storage & Lighting · Denmark",
    origin: "Copenhagen, DK",
    description:
      "Solid walnut storage, pendants and shelving by a third-generation Danish workshop. FSC-certified and built to last a lifetime.",
    logo: northwood,
    makers: ["Northwood"],
    brandPrefix: "northwood",
  },
  {
    slug: "casa-reni",
    name: "Casa Reni",
    tagline: "Tables & Stone · Italy",
    origin: "Carrara, IT",
    description:
      "Travertine and marble tables sourced and cut from the Carrara quarries. Custom dimensions available for trade clients.",
    logo: casaReni,
    makers: ["Casa Reni"],
    brandPrefix: "casa-reni",
  },
  {
    slug: "ceramica-vera",
    name: "Ceramica Vera",
    tagline: "Decor & Botanicals · Portugal",
    origin: "Lisbon, PT",
    description:
      "Hand-thrown vases and dried botanical arrangements. Small batch, restocked monthly — reserve from the Supermoods catalog.",
    logo: ceramicaVera,
    makers: ["Ceramica Vera", "Hanssen Workshop"],
    brandPrefix: "ceramica-vera",
  },
];

/** Build a branded SKU clone of a base demo product so brand catalogs feel distinct. */
function clone(p: Product, brand: Omit<Brand, "pieceCount">): Product {
  return {
    ...p,
    id: `brand-${brand.brandPrefix}-${p.id}`,
    maker: brand.name,
  };
}

/** Map of brand slug → products available in that brand catalog. */
export const brandProducts: Record<string, Product[]> = Object.fromEntries(
  RAW_BRANDS.map((b) => [
    b.slug,
    demoCatalog
      .filter((p) => b.makers.includes(p.maker))
      .map((p) => clone(p, b)),
  ]),
);

export const brands: Brand[] = RAW_BRANDS.map((b) => ({
  ...b,
  pieceCount: brandProducts[b.slug].length,
}));

export function getBrand(slug: string): Brand | undefined {
  return brands.find((b) => b.slug === slug);
}

/** Flat list of every brand product — used so selections from brand pages
 *  can be resolved to a Product on the moodboard. */
export const allBrandProducts: Product[] = Object.values(brandProducts).flat();