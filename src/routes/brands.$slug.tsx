import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";
import { SideMenu } from "@/components/SideMenu";
import { ProductDetail } from "@/components/ProductDetail";
import { brandProducts, getBrand } from "@/data/brands";
import { categories, type Category, type Product } from "@/data/catalog";
import { useSelection } from "@/store/selection";

export const Route = createFileRoute("/brands/$slug")({
  component: BrandDetailPage,
  loader: ({ params }) => {
    const brand = getBrand(params.slug);
    if (!brand) throw notFound();
    return { brand };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.brand.name ?? "Brand";
    return {
      meta: [
        { title: `${name} — Supermoods brand catalog` },
        {
          name: "description",
          content: `${name} stock available on Supermoods. Drop pieces into a moodboard for clients.`,
        },
        { property: "og:title", content: `${name} — Supermoods` },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-3 font-serif text-4xl text-ink">Brand not found</h1>
        <Link
          to="/brands"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-background"
        >
          <ArrowLeft size={14} /> Back to brand catalogs
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <p className="text-sm text-rust">{error.message}</p>
        <Link
          to="/brands"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-background"
        >
          <ArrowLeft size={14} /> Back to brand catalogs
        </Link>
      </div>
    </div>
  ),
});

function BrandDetailPage() {
  const { brand } = Route.useLoaderData();
  const { has, toggle, count, clear } = useSelection();
  const products = brandProducts[brand.slug] ?? [];

  const [filter, setFilter] = useState<Category | "All">("All");
  const [active, setActive] = useState<Product | null>(null);

  const items = useMemo(
    () =>
      products.filter((p) => filter === "All" || p.category === filter),
    [products, filter],
  );

  const usedCategories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return categories.filter((c) => set.has(c));
  }, [products]);

  return (
    <main className="min-h-screen bg-background pb-32 text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5 md:px-10">
          <SideMenu />
          <Link
            to="/"
            className="font-serif text-2xl tracking-display text-ink md:text-3xl"
          >
            Supermoods
          </Link>
          <Link
            to="/moodboard"
            aria-label="View board"
            className="relative flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-background transition-transform hover:scale-[1.02]"
          >
            <span className="text-sm font-medium tabular-nums">{count}</span>
            <span className="text-[11px] uppercase tracking-[0.18em]">
              Board
            </span>
          </Link>
        </div>
      </header>

      {/* Brand hero */}
      <section className="mx-auto max-w-[1500px] px-6 pb-8 pt-10 md:px-10 md:pt-14">
        <Link
          to="/brands"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-ink"
        >
          <ArrowLeft size={12} /> All brands
        </Link>
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr] md:items-end">
          <div className="aspect-square overflow-hidden rounded-2xl bg-secondary/40">
            <img
              src={brand.logo}
              alt={`${brand.name} logo`}
              width={768}
              height={768}
              className={`h-full w-full ${
                brand.logoFit === "contain" ? "object-contain p-6" : "object-cover"
              }`}
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-display text-muted-foreground">
              {brand.tagline} · {brand.origin}
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-[0.95] text-ink md:text-6xl">
              {brand.name}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {brand.description}
            </p>
            <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-rust">
              In stock · ready to compose
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      {usedCategories.length > 1 && (
        <section className="mx-auto max-w-[1500px] px-6 md:px-10">
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-5">
            {(["All", ...usedCategories] as const).map((cat) => {
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
      )}

      {/* Grid */}
      <section className="mx-auto mt-10 max-w-[1500px] px-6 md:px-10">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center text-sm text-muted-foreground">
            No pieces in this category yet.
          </p>
        ) : (
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
                      {selected ? (
                        <Check size={16} strokeWidth={2.4} />
                      ) : (
                        <Plus size={16} />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActive(p)}
                    className="mt-4 flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {p.category} · {brand.name}
                      </p>
                      <h3 className="mt-1 font-serif text-xl leading-tight text-ink">
                        {p.name}
                      </h3>
                    </div>
                    <p className="shrink-0 font-serif text-base text-ink/80">
                      {p.price}
                    </p>
                  </button>
                </article>
              );
            })}
          </div>
        )}
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
    </main>
  );
}