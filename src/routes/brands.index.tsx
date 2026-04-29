import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SideMenu } from "@/components/SideMenu";
import { brands } from "@/data/brands";
import { useSelection } from "@/store/selection";

export const Route = createFileRoute("/brands/")({
  component: BrandsPage,
  head: () => ({
    meta: [
      { title: "Supermoods — Brand catalogs for designers" },
      {
        name: "description",
        content:
          "Browse partner brand catalogs curated for interior designers. In-stock pieces, ready to drop into a moodboard.",
      },
      { property: "og:title", content: "Supermoods — Brand catalogs" },
      {
        property: "og:description",
        content:
          "Partner brand catalogs for interior designers — in-stock and ready to compose.",
      },
    ],
  }),
});

function BrandsPage() {
  const { count } = useSelection();

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

      {/* Hero */}
      <section className="mx-auto max-w-[1500px] px-6 pb-8 pt-12 md:px-10 md:pt-16">
        <p className="text-xs uppercase tracking-display text-muted-foreground">
          For interior designers · Trade program
        </p>
        <div className="mt-3 flex items-end justify-between gap-6">
          <h1 className="font-serif text-5xl leading-[0.95] text-ink md:text-7xl">
            Brand
            <br />
            <em className="font-light italic text-rust">catalogs.</em>
          </h1>
          <p className="hidden max-w-md text-sm leading-relaxed text-muted-foreground md:block">
            Partner brands with stock loaded into Supermoods. Pick a house, drop
            its pieces straight onto a moodboard — no scraping, no waiting,
            trade pricing where applicable.
          </p>
        </div>
      </section>

      {/* Brand tiles — same card geometry as the catalog product card */}
      <section className="mx-auto mt-10 max-w-[1500px] px-6 md:px-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((b) => (
            <Link
              key={b.slug}
              to="/brands/$slug"
              params={{ slug: b.slug }}
              className="group relative block focus:outline-none"
              aria-label={`Open ${b.name} catalog`}
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-secondary/40">
                <img
                  src={b.logo}
                  alt={`${b.name} logo`}
                  loading="lazy"
                  width={768}
                  height={768}
                  className={`absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.03] ${
                    b.logoFit === "contain" ? "object-contain p-6" : "object-cover"
                  }`}
                />
                <span
                  aria-hidden
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/95 text-ink ring-1 ring-border backdrop-blur transition-all group-hover:bg-ink group-hover:text-background"
                >
                  <ArrowRight size={16} />
                </span>
              </div>
              <div className="mt-4 flex w-full items-start justify-between gap-3 text-left">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {b.tagline}
                  </p>
                  <h3 className="mt-1 truncate font-serif text-xl leading-tight text-ink">
                    {b.name}
                  </h3>
                </div>
                <p className="shrink-0 font-serif text-base text-ink/80">
                  {b.pieceCount} {b.pieceCount === 1 ? "piece" : "pieces"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}