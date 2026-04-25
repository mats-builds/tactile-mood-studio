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
import type { Product } from "./catalog";

/** Mockup catalog used only in guest/demo mode. */
export const demoCatalog: Product[] = [
  { id: "demo-sofa", name: "Lina Curved Sofa", maker: "Studio Palerma", price: "€ 4,890", category: "Seating", src: sofa, colors: ["rust", "walnut"], role: "ground" },
  { id: "demo-sofa-cataline", name: "Cataline 3-piece Modular Sofa", maker: "SKLUM", price: "€ 1,099", category: "Seating", src: sofaCataline, colors: ["cream", "linen", "bone"], role: "ground" },
  { id: "demo-armchair", name: "Cane Sling Chair", maker: "Hanssen Workshop", price: "€ 1,680", category: "Seating", src: armchair, colors: ["walnut", "clay"], role: "ground" },
  { id: "demo-loungechair", name: "Bouclé Lounge", maker: "Maison Cru", price: "€ 1,420", category: "Seating", src: loungechair, colors: ["cream", "linen"], role: "ground" },
  { id: "demo-ottoman", name: "Linen Pouf", maker: "Maison Cru", price: "€ 320", category: "Seating", src: ottoman, colors: ["linen", "bone"], role: "surface" },
  { id: "demo-table", name: "Oval Travertine Table", maker: "Casa Reni", price: "€ 2,150", category: "Tables", src: table, colors: ["travertine", "bone"], role: "surface" },
  { id: "demo-sidetable", name: "Stone Side Table", maker: "Casa Reni", price: "€ 690", category: "Tables", src: sidetable, colors: ["travertine", "cream"], role: "surface" },
  { id: "demo-sideboard", name: "Walnut Sideboard", maker: "Northwood", price: "€ 3,240", category: "Storage", src: sideboard, colors: ["walnut", "rust"], role: "ground" },
  { id: "demo-shelf", name: "Slim Walnut Shelf", maker: "Northwood", price: "€ 1,980", category: "Storage", src: shelf, colors: ["walnut"], role: "ground" },
  { id: "demo-lamp", name: "Pleated Floor Lamp", maker: "Brass + Linen Co.", price: "€ 920", category: "Lighting", src: lamp, colors: ["linen", "brass"], role: "standing" },
  { id: "demo-pendant", name: "Walnut Pendant 02", maker: "Northwood", price: "€ 740", category: "Lighting", src: pendant, colors: ["walnut", "brass"], role: "hanging" },
  { id: "demo-candles", name: "Brass Candle Trio", maker: "Atelier Dion", price: "€ 240", category: "Lighting", src: candles, colors: ["brass", "gold"], role: "prop" },
  { id: "demo-vase", name: "Onda Vase, Charcoal", maker: "Ceramica Vera", price: "€ 220", category: "Decor", src: vase, colors: ["charcoal", "ink"], role: "prop" },
  { id: "demo-pampas", name: "Pampas Arrangement", maker: "Ceramica Vera", price: "€ 180", category: "Decor", src: pampas, colors: ["bone", "jute"], role: "standing" },
  { id: "demo-books", name: "Linen Library, set of 4", maker: "Atelier Dion", price: "€ 140", category: "Decor", src: books, colors: ["cream", "clay"], role: "prop" },
  { id: "demo-mirror", name: "Halo Brass Mirror", maker: "Atelier Dion", price: "€ 880", category: "Decor", src: mirror, colors: ["brass", "gold"], role: "wall" },
  { id: "demo-pillows", name: "Linen Cushions, pair", maker: "Maison Cru", price: "€ 180", category: "Textiles", src: pillows, colors: ["linen", "cream"], role: "prop" },
  { id: "demo-rug", name: "Hand-woven Jute Rug", maker: "Hanssen Workshop", price: "€ 1,260", category: "Textiles", src: rug, colors: ["jute", "cream"], role: "floor" },
  { id: "demo-art", name: "Figure I, Framed", maker: "Atelier Dion", price: "€ 1,240", category: "Art", src: art, colors: ["bone", "gold", "ink"], role: "wall" },
  { id: "demo-art2", name: "Earthforms II", maker: "Atelier Dion", price: "€ 680", category: "Art", src: art2, colors: ["terracotta", "cream", "clay"], role: "wall" },
];
