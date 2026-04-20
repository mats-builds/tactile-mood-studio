import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Sparkles, RefreshCw, Plus, Check } from "lucide-react";
import { catalog, colorMap, curatedPalettes, generateAIPalette, type Palette } from "@/data/catalog";
import { useSelection } from "@/store/selection";

export const Route = createFileRoute("/moodboard")({
  component: MoodboardPage,
  head: () => ({
    meta: [
      { title: "MOODS — Your Moodboard" },
      { name: "description", content: "Your curated moodboard — pieces, palette and feel." },
    ],
  }),
});

// asymmetric collage classes assigned by index for visual interest
const tileClasses = [
  "col-span-7 row-span-3 -rotate-1",
  "col-span-3 row-span-4 rotate-2",
  "col-span-3 row-span-3 -rotate-2",
  "col-span-4 row-span-2 rotate-1",
  "col-span-3 row-span-2",
  "col-span-2 row-span-4 rotate-2",
  "col-span-3 row-span-2 -rotate-2",
  "col-span-2 row-span-2 rotate-3",
  "col-span-3 row-span-2 -rotate-1",
  "col-span-4 row-span-2 rotate-1",
];

function MoodboardPage() {
  const navigate = useNavigate();
  const { ids, paletteId, setPaletteId, toggle } = useSelection();

  const items = useMemo(
    () => ids.map((id) => catalog.find((p) => p.id === id)).filter(Boolean) as typeof catalog,
    [ids],
  );

  const aiPalette = useMemo(() => generateAIPalette(ids), [ids]);
  const [aiNonce, setAiNonce] = useState(0);

  const allPalettes: Palette[] = useMemo(
    () => [aiPalette, ...curatedPalettes],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aiPalette, aiNonce],
  );

  const activePalette: Palette =
    allPalettes.find((p) => p.id === paletteId) ?? aiPalette;

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <p className="text-[11px] uppercase tracking-display text-muted-foreground">
            Your board is empty
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-[0.95] text-ink">
            Pick a few <em className="italic text-rust">pieces</em> first.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Browse the catalog and tap the + on anything you love. Then come back
            to compose your moodboard.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-background"
          >
            <ArrowLeft size={16} /> Back to catalog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-20 text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5 md:px-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-foreground/70 hover:text-foreground"
          >
            <ArrowLeft size={14} /> Catalog
          </Link>
          <Link to="/" className="font-serif text-2xl tracking-display text-ink md:text-3xl">
            MOODS
          </Link>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {items.length} {items.length === 1 ? "piece" : "pieces"}
          </div>
        </div>
      </header>

      {/* Title */}
      <section className="mx-auto max-w-[1500px] px-6 pb-6 pt-10 md:px-10 md:pt-14">
        <p className="text-xs uppercase tracking-display text-muted-foreground">
          Your concept
        </p>
        <h1 className="mt-3 font-serif text-5xl leading-[0.95] text-ink md:text-7xl">
          A room,
          <br />
          <em className="font-light italic text-rust">composed.</em>
        </h1>
      </section>

      {/* Palette picker */}
      <section className="mx-auto max-w-[1500px] px-6 md:px-10">
        <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-display text-muted-foreground">
                Color palette
              </p>
              <h2 className="mt-2 font-serif text-2xl text-ink">
                Choose a palette, or let our AI compose one.
              </h2>
            </div>
            <button
              onClick={() => {
                setPaletteId("ai");
                setAiNonce((n) => n + 1);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-ink bg-ink px-4 py-2 text-xs uppercase tracking-[0.18em] text-background transition-transform hover:scale-[1.02]"
            >
              <Sparkles size={14} />
              {activePalette.id === "ai" ? "Regenerate" : "Let AI choose"}
              {activePalette.id === "ai" && <RefreshCw size={12} />}
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {allPalettes.map((p) => {
              const active = activePalette.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPaletteId(p.id)}
                  className={`group rounded-2xl border p-3 text-left transition-all ${
                    active
                      ? "border-ink bg-secondary shadow-[var(--shadow-soft)]"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  <div className="flex h-10 overflow-hidden rounded-md">
                    {p.colors.map((c, i) => (
                      <div
                        key={`${p.id}-${c}-${i}`}
                        className="flex-1"
                        style={{ backgroundColor: colorMap[c] }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-serif text-base text-ink">{p.name}</span>
                    {p.id === "ai" && <Sparkles size={12} className="text-rust" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mood board collage tinted by palette */}
      <section className="mx-auto mt-8 max-w-[1500px] px-6 md:px-10">
        <div
          className="relative overflow-hidden rounded-3xl p-6 shadow-[var(--shadow-soft)] md:p-12"
          style={{
            background: `linear-gradient(135deg, ${colorMap[activePalette.colors[1] ?? "linen"]} 0%, ${colorMap[activePalette.colors[0] ?? "cream"]} 60%, ${colorMap[activePalette.colors[2] ?? "travertine"]} 100%)`,
          }}
        >
          {/* corner palette strip */}
          <div className="absolute right-6 top-6 hidden gap-1 md:flex">
            {activePalette.colors.map((c, i) => (
              <div
                key={i}
                className="h-8 w-8 rounded-full ring-1 ring-ink/10"
                style={{ backgroundColor: colorMap[c] }}
              />
            ))}
          </div>

          <p className="text-[11px] uppercase tracking-display text-ink/60">
            Concept · {activePalette.name}
          </p>

          <div className="mt-6 grid auto-rows-[68px] grid-cols-10 gap-3 md:gap-4">
            {items.map((p, i) => (
              <div
                key={p.id}
                className={`group relative ${tileClasses[i % tileClasses.length]}`}
              >
                <img
                  src={p.src}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-contain drop-shadow-[0_25px_30px_oklch(0.22_0.02_50_/_0.18)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.03]"
                />
                <button
                  onClick={() => toggle(p.id)}
                  aria-label={`Remove ${p.name}`}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-ink opacity-0 ring-1 ring-border backdrop-blur transition-opacity hover:bg-rust hover:text-primary-foreground group-hover:opacity-100"
                >
                  <Check size={14} strokeWidth={2.4} />
                </button>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="mx-auto w-fit rounded-full bg-ink/90 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-background backdrop-blur">
                    {p.name} · {p.price}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Itemized list */}
      <section className="mx-auto mt-12 max-w-[1500px] px-6 md:px-10">
        <p className="text-[11px] uppercase tracking-display text-muted-foreground">
          On this board
        </p>
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-5 py-4">
              <div className="h-16 w-16 shrink-0 rounded-md bg-secondary/40">
                <img src={p.src} alt="" className="h-full w-full object-contain p-1" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {p.category} · {p.maker}
                </p>
                <p className="font-serif text-lg text-ink">{p.name}</p>
              </div>
              <p className="font-serif text-base text-ink/80">{p.price}</p>
              <button
                onClick={() => toggle(p.id)}
                aria-label={`Remove ${p.name}`}
                className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground/60 hover:border-rust hover:text-rust"
              >
                <Plus size={14} className="rotate-45" />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => navigate({ to: "/" })}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-foreground hover:bg-secondary"
          >
            <ArrowLeft size={16} /> Add more pieces
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-rust px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]">
            Send to designer
          </button>
        </div>
      </section>
    </main>
  );
}
