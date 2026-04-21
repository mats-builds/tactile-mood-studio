import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus, Check, X, ArrowRight } from "lucide-react";
import { catalog, categories, type Category, type Product } from "@/data/catalog";
import { useSelection } from "@/store/selection";
import { ProductDetail } from "@/components/ProductDetail";
import { SideMenu } from "@/components/SideMenu";
import { useUserProducts } from "@/store/user-products";
import { OwnerButton } from "@/components/OwnerButton";

export const Route = createFileRoute("/")({
  component: CatalogPage,
  head: () => ({
    meta: [
      { title: "Supermoods — Catalog" },
      {
        name: "description",
        content:
          "Browse curated furniture, lighting and decor. Add pieces to your board and create a personalized moodboard.",
      },
      { property: "og:title", content: "Supermoods — Catalog" },
      {
        property: "og:description",
        content: "Curated furniture catalog for building your moodboard.",
      },
    ],
  }),
});

function CatalogPage() {
  const { has, toggle, count, clear } = useSelection();
  const { products: userProducts } = useUserProducts();
  const [filter, setFilter] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState<Product | null>(null);

  const items = useMemo(() => {
    const merged = [...userProducts, ...catalog];
    return merged.filter((p) => {
      const matchCat = filter === "All" || p.category === filter;
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.maker.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [filter, query, userProducts]);

  return (
    <main className="min-h-screen bg-background pb-32 text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5 md:px-10">
          <SideMenu />
          <Link to="/" className="font-serif text-2xl tracking-display text-ink md:text-3xl">
            Supermoods
          </Link>
          <div className="flex items-center gap-2">
            <button
              aria-label="Search"
              onClick={() => setSearchOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-secondary"
            >
              <Search size={18} strokeWidth={1.6} />
            </button>
            <Link
              to="/moodboard"
              aria-label="View board"
              className="relative flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-background transition-transform hover:scale-[1.02]"
            >
              <span className="text-sm font-medium tabular-nums">{count}</span>
              <span className="text-[11px] uppercase tracking-[0.18em]">Board</span>
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-border/60 px-6 py-3 md:px-10">
            <div className="mx-auto flex max-w-[1500px] items-center gap-3">
              <Search size={16} className="text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the catalog…"
                className="flex-1 bg-transparent py-1 font-serif text-xl text-ink placeholder:text-muted-foreground focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search">
                  <X size={16} className="text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1500px] px-6 pb-8 pt-12 md:px-10 md:pt-16">
        <p className="text-xs uppercase tracking-display text-muted-foreground">
          The catalog · 2026 collection
        </p>
        <div className="mt-3 flex items-end justify-between gap-6">
          <h1 className="font-serif text-5xl leading-[0.95] text-ink md:text-7xl">
            Choose your
            <br />
            <em className="font-light italic text-rust">pieces.</em>
          </h1>
          <p className="hidden max-w-sm text-sm leading-relaxed text-muted-foreground md:block">
            Tap the <span className="inline-flex h-5 w-5 translate-y-1 items-center justify-center rounded-full bg-ink text-background"><Plus size={12} /></span> on
            anything you love. When you're ready, generate a moodboard tuned to
            your selection — colors and all.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="mx-auto max-w-[1500px] px-6 md:px-10">
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-5">
          {(["All", ...categories] as const).map((cat) => {
            const active = filter === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] transition-colors ${
                  active
                    ? "bg-ink text-background"
                    : "border border-border text-foreground/70 hover:bg-secondary"
                }`}
              >
                {cat}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "piece" : "pieces"}
          </span>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto mt-10 max-w-[1500px] px-6 md:px-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => {
            const selected = has(p.id);
            return (
              <article key={p.id} className="group relative">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-secondary/40">
                  <button
                    type="button"
                    onClick={() => setActive(p)}
                    aria-label={`View ${p.name}`}
                    className="absolute inset-0 block text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  >
                  <img
                    src={p.src}
                    alt={p.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(p.id);
                    }}
                    aria-pressed={selected}
                    aria-label={selected ? `Remove ${p.name}` : `Add ${p.name}`}
                    className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full ring-1 transition-all ${
                      selected
                        ? "bg-rust text-primary-foreground ring-rust"
                        : "bg-background/95 text-ink ring-border backdrop-blur hover:bg-ink hover:text-background"
                    }`}
                  >
                    {selected ? <Check size={16} strokeWidth={2.4} /> : <Plus size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setActive(p)}
                  className="mt-4 flex w-full items-start justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {p.category} · {p.maker}
                    </p>
                    <h3 className="mt-1 font-serif text-xl leading-tight text-ink">
                      {p.name}
                    </h3>
                  </div>
                  <p className="shrink-0 font-serif text-base text-ink/80">{p.price}</p>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* Sticky footer CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-6">
        <div
          className={`pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-full border border-border bg-card/95 px-3 py-3 pl-6 shadow-[var(--shadow-soft)] backdrop-blur-md transition-all ${
            count === 0 ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-serif text-sm text-background tabular-nums">
              {count}
            </span>
            <span className="text-sm text-foreground/80">
              {count === 1 ? "piece selected" : "pieces selected"}
            </span>
            <button
              onClick={clear}
              className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <Link
            to="/moodboard"
            className="inline-flex items-center gap-2 rounded-full bg-rust px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Create moodboard
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <ProductDetail
        product={active}
        open={active !== null}
        onOpenChange={(o) => !o && setActive(null)}
        selected={active ? has(active.id) : false}
        onToggle={toggle}
      />
      <OwnerButton />
    </main>
  );
}
