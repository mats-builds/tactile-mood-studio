import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Search, ShoppingBag, Plus, Check } from "lucide-react";
import conceptRoom from "@/assets/concept-room.jpg";
import sofa from "@/assets/sofa.png";
import armchair from "@/assets/armchair.png";
import table from "@/assets/table.png";
import lamp from "@/assets/lamp.png";
import pendant from "@/assets/pendant.png";
import vase from "@/assets/vase.png";
import art from "@/assets/art.png";
import pillows from "@/assets/pillows.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "MOODS — Mid-Century Cozy Concept" },
      {
        name: "description",
        content:
          "Curated interior mood board: a welcoming blend of textures and tones. Discover warm hospitality and crafted comfort.",
      },
      { property: "og:title", content: "MOODS — Mid-Century Cozy" },
      {
        property: "og:description",
        content: "Curated interior mood board for in-store discovery.",
      },
      { property: "og:image", content: conceptRoom },
    ],
  }),
});

type Product = {
  id: string;
  name: string;
  maker: string;
  price: string;
  src: string;
  className: string;
};

const products: Product[] = [
  {
    id: "sofa",
    name: "Lina Curved Sofa",
    maker: "Studio Palerma",
    price: "€ 4,890",
    src: sofa,
    className: "col-span-7 row-span-3 -rotate-1",
  },
  {
    id: "art",
    name: "Figure I, Framed",
    maker: "Atelier Dion",
    price: "€ 1,240",
    src: art,
    className: "col-span-3 row-span-4 rotate-2",
  },
  {
    id: "armchair",
    name: "Cane Sling Chair",
    maker: "Hanssen Workshop",
    price: "€ 1,680",
    src: armchair,
    className: "col-span-3 row-span-3 -rotate-3",
  },
  {
    id: "table",
    name: "Oval Travertine Table",
    maker: "Casa Reni",
    price: "€ 2,150",
    src: table,
    className: "col-span-4 row-span-2 rotate-1",
  },
  {
    id: "pillows",
    name: "Linen Cushions, set of 2",
    maker: "Maison Cru",
    price: "€ 180",
    src: pillows,
    className: "col-span-3 row-span-2",
  },
  {
    id: "lamp",
    name: "Pleated Floor Lamp",
    maker: "Brass + Linen Co.",
    price: "€ 920",
    src: lamp,
    className: "col-span-2 row-span-4 rotate-2",
  },
  {
    id: "pendant",
    name: "Walnut Pendant 02",
    maker: "Northwood",
    price: "€ 740",
    src: pendant,
    className: "col-span-3 row-span-2 -rotate-2",
  },
  {
    id: "vase",
    name: "Onda Vase, Charcoal",
    maker: "Ceramica Vera",
    price: "€ 220",
    src: vase,
    className: "col-span-2 row-span-2 rotate-3",
  },
];

function Index() {
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5 md:px-10">
          <button
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-secondary"
          >
            <Menu strokeWidth={1.4} />
          </button>
          <h1 className="font-serif text-2xl tracking-display text-ink md:text-3xl">
            MOODS
          </h1>
          <div className="flex items-center gap-2">
            <button
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-secondary"
            >
              <Search size={18} strokeWidth={1.6} />
            </button>
            <button
              aria-label="Saved items"
              className="relative flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-background transition-transform hover:scale-[1.02]"
            >
              <ShoppingBag size={16} strokeWidth={1.6} />
              <span className="text-sm font-medium tabular-nums">{saved.size}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Editorial caption */}
      <section className="mx-auto max-w-[1500px] px-6 pb-6 pt-10 md:px-10 md:pt-16">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-display text-muted-foreground">
              Vol. 04 · Concept board
            </p>
            <h2 className="mt-3 font-serif text-5xl leading-[0.95] text-ink md:text-7xl">
              Mid-Century
              <br />
              <em className="font-light italic text-rust">Cozy.</em>
            </h2>
          </div>
          <p className="hidden max-w-xs text-sm leading-relaxed text-muted-foreground md:block">
            A welcoming blend of textures and tones. Discover warm hospitality and
            curated comfort — your room begins on this board.
          </p>
        </div>
      </section>

      {/* Mood board */}
      <section className="mx-auto max-w-[1500px] px-6 pb-20 md:px-10">
        <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)] md:p-10">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* LEFT — Concept */}
            <div className="lg:col-span-5">
              <p className="text-[11px] uppercase tracking-display text-muted-foreground">
                Concept · Living Room
              </p>
              <div className="mt-4 overflow-hidden rounded-xl">
                <img
                  src={conceptRoom}
                  alt="A mid-century cozy living room with a rust velvet sofa, walnut sideboard and travertine coffee table"
                  width={1280}
                  height={896}
                  className="h-[420px] w-full object-cover"
                />
              </div>

              <p className="mt-6 max-w-md text-base leading-relaxed text-foreground/80">
                Introducing a concept for the living room — a harmonious blend of
                modern sophistication and cozy comfort. Meticulously curated to
                evoke a sense of warmth and elegance, while providing an inviting
                and stylish gathering space for relaxation, entertainment, and
                cherished moments.
              </p>

              {/* Material swatches */}
              <div className="mt-8">
                <p className="text-[11px] uppercase tracking-display text-muted-foreground">
                  Materials
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Swatch
                    label="Rust velvet"
                    style={{ backgroundColor: "var(--rust)" }}
                  />
                  <Swatch
                    label="Walnut"
                    style={{ backgroundColor: "var(--walnut)" }}
                  />
                  <Swatch
                    label="Travertine"
                    style={{ backgroundColor: "var(--travertine)" }}
                  />
                  <Swatch
                    label="Linen"
                    style={{ backgroundColor: "var(--linen)" }}
                  />
                  <Swatch
                    label="Brass"
                    style={{ backgroundColor: "var(--brass)" }}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT — Product collage */}
            <div className="relative lg:col-span-7">
              <div
                className="absolute inset-0 -z-10 rounded-2xl opacity-70"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, oklch(0.55 0.04 60 / 0.18) 1px, transparent 0)",
                  backgroundSize: "12px 12px",
                }}
                aria-hidden
              />
              <div className="grid auto-rows-[64px] grid-cols-10 gap-3 p-4 md:gap-4 md:p-6">
                {products.map((p) => (
                  <ProductTile
                    key={p.id}
                    product={p}
                    saved={saved.has(p.id)}
                    onToggle={() => toggle(p.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Lower details */}
          <div className="mt-12 border-t border-border pt-10">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="grid grid-cols-3 gap-x-8 gap-y-6 sm:grid-cols-6">
                  <Spec label="Size" value="6,000 sqft" />
                  <Spec label="Location" value="Deià, Mallorca" />
                  <Spec label="Type" value="Finca" />
                  <Spec label="Bedrooms" value="5" />
                  <Spec label="Bathrooms" value="3" />
                  <Spec label="Garage" value="1" />
                </div>
                <div className="mt-8 grid gap-6 text-sm leading-relaxed text-foreground/75 md:grid-cols-2">
                  <p>
                    Nestled amidst Mallorca's scenic Tramuntana mountains, the
                    finca offers a tranquil escape. Surrounded by orange groves,
                    it's a haven to unwind and reconnect with nature.
                  </p>
                  <p>
                    From the moment they arrive, residents are greeted by the
                    fragrance of citrus blossoms and the gentle rustle of orange
                    branches — enveloping them in a sense of belonging.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-5">
                <p className="text-[11px] uppercase tracking-display text-muted-foreground">
                  Project layout
                </p>
                <div className="mt-3 rounded-xl border border-border bg-background p-5">
                  <FloorPlan />
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 flex items-center justify-between text-[11px] uppercase tracking-display text-muted-foreground">
          <span>Studio Palerma · Concept</span>
          <span>04 / Casa Reni</span>
        </p>
      </section>
    </main>
  );
}

function Swatch({
  label,
  style,
}: {
  label: string;
  style: React.CSSProperties;
}) {
  return (
    <div className="group flex flex-col items-center gap-1.5">
      <div
        className="h-12 w-12 rounded-full ring-1 ring-border transition-transform group-hover:scale-110"
        style={style}
      />
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function ProductTile({
  product,
  saved,
  onToggle,
}: {
  product: Product;
  saved: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`group relative ${product.className}`}>
      <div className="relative h-full w-full">
        <img
          src={product.src}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-contain drop-shadow-[0_25px_30px_oklch(0.22_0.02_50_/_0.18)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.03]"
        />

        <button
          onClick={onToggle}
          aria-label={saved ? `Remove ${product.name}` : `Save ${product.name}`}
          aria-pressed={saved}
          className={`absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-border transition-all ${
            saved
              ? "bg-rust text-primary-foreground ring-rust"
              : "bg-background/90 text-ink opacity-0 backdrop-blur group-hover:opacity-100"
          }`}
        >
          {saved ? <Check size={14} strokeWidth={2.4} /> : <Plus size={14} strokeWidth={2} />}
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="mx-auto w-fit rounded-full bg-ink/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-background backdrop-blur">
            {product.name} · {product.price}
          </div>
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 font-serif text-lg text-ink">{value}</p>
    </div>
  );
}

function FloorPlan() {
  return (
    <svg
      viewBox="0 0 320 180"
      className="h-auto w-full text-ink/70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <rect x="10" y="10" width="300" height="160" />
      <line x1="120" y1="10" x2="120" y2="100" />
      <line x1="10" y1="100" x2="220" y2="100" />
      <line x1="220" y1="10" x2="220" y2="170" />
      <line x1="120" y1="60" x2="220" y2="60" />
      <line x1="220" y1="120" x2="310" y2="120" />
      {/* doors */}
      <path d="M120 100 a 20 20 0 0 1 20 -20" />
      <path d="M220 60 a 18 18 0 0 1 -18 18" />
      {/* labels */}
      <text x="55" y="55" fill="currentColor" stroke="none" fontSize="7" letterSpacing="2">
        LIVING
      </text>
      <text x="155" y="40" fill="currentColor" stroke="none" fontSize="7" letterSpacing="2">
        KITCHEN
      </text>
      <text x="55" y="140" fill="currentColor" stroke="none" fontSize="7" letterSpacing="2">
        DINING
      </text>
      <text x="155" y="140" fill="currentColor" stroke="none" fontSize="7" letterSpacing="2">
        STUDY
      </text>
      <text x="245" y="95" fill="currentColor" stroke="none" fontSize="7" letterSpacing="2">
        SUITE
      </text>
      <text x="245" y="150" fill="currentColor" stroke="none" fontSize="7" letterSpacing="2">
        GARAGE
      </text>
    </svg>
  );
}
