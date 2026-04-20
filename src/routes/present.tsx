import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import {
  catalog,
  colorMap,
  curatedPalettes,
  generateAIPalette,
  scenes,
  type Palette,
  type Scene,
} from "@/data/catalog";
import { useSelection } from "@/store/selection";
import { useUserProducts } from "@/store/user-products";
import { RoomScene } from "@/components/RoomScene";

export const Route = createFileRoute("/present")({
  component: PresentPage,
  head: () => ({
    meta: [
      { title: "Supermoods — Presentation" },
      { name: "description", content: "Your moodboard, presented." },
    ],
  }),
});

function PresentPage() {
  const { ids, paletteId, sceneId, layout } = useSelection();
  const { products: userProducts } = useUserProducts();

  const items = useMemo(() => {
    const merged = [...userProducts, ...catalog];
    return ids
      .map((id) => merged.find((p) => p.id === id))
      .filter(Boolean) as typeof catalog;
  }, [ids, userProducts]);

  const aiPalette = useMemo(() => generateAIPalette(ids), [ids]);
  const allPalettes: Palette[] = useMemo(
    () => [aiPalette, ...curatedPalettes],
    [aiPalette],
  );
  const activePalette: Palette =
    allPalettes.find((p) => p.id === paletteId) ?? aiPalette;
  const activeScene: Scene = scenes.find((s) => s.id === sceneId) ?? scenes[0];

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <h1 className="font-serif text-4xl text-ink">Nothing to present yet.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Add a few pieces to your moodboard first.
          </p>
          <Link
            to="/moodboard"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-background"
          >
            <ArrowLeft size={16} /> Back to moodboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[oklch(0.78_0.02_85)] py-10 print:bg-white print:py-0">
      {/* Toolbar — hidden on print */}
      <div className="mx-auto mb-8 flex max-w-[900px] items-center justify-between px-6 print:hidden">
        <Link
          to="/moodboard"
          className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-background px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-ink hover:bg-secondary"
        >
          <ArrowLeft size={14} /> Back to editor
        </Link>
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink/70">
          Your presentation
        </p>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-rust px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <div className="mx-auto flex max-w-[900px] flex-col items-center gap-8 px-6 print:max-w-none print:gap-0 print:px-0">
        {/* === PAGE 1 — Furniture Selection === */}
        <Page>
          <PageHeader left="Page 01" center="Furniture Selection" date={today} />
          <div className="mt-6 grid grid-cols-4 gap-x-4 gap-y-6">
            {items.map((p) => (
              <div key={p.id} className="flex flex-col items-center text-center">
                <div className="flex h-24 w-full items-end justify-center">
                  <img
                    src={p.src}
                    alt={p.name}
                    className="max-h-24 max-w-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
                <p className="mt-3 text-[10px] font-medium tracking-wide text-ink">
                  {p.name}
                </p>
                <p className="mt-0.5 text-[8px] italic text-muted-foreground">
                  {p.maker}
                </p>
              </div>
            ))}
          </div>
          <PageFooter />
        </Page>

        {/* === PAGE 2 — Concept Board === */}
        <Page>
          <PageHeader left="Page 02" center="Concept Board" date={today} />
          <div className="mt-5 flex flex-col gap-5">
            {/* Composition — full width */}
            <div>
              <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Your composition
              </p>
              <div className="overflow-hidden rounded-md">
                <RoomScene
                  items={items}
                  palette={activePalette}
                  scene={activeScene}
                  layout={layout}
                />
              </div>
            </div>

            {/* Key pieces — full width */}
            <div>
              <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Key pieces
              </p>
              <div className="grid grid-cols-6 gap-2 rounded-md bg-[oklch(0.93_0.012_85)] p-3">
                {items.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="flex aspect-square items-center justify-center rounded-sm bg-background p-2"
                  >
                    <img
                      src={p.src}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain"
                      crossOrigin="anonymous"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Palette */}
            <div>
              <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                Palette · {activePalette.name}
              </p>
              <div className="flex gap-3">
                {activePalette.colors.map((c, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div
                      className="h-10 w-10 rounded-full ring-1 ring-ink/10"
                      style={{ backgroundColor: colorMap[c] }}
                    />
                    <span className="mt-1 text-[7px] uppercase tracking-wider text-muted-foreground">
                      {c}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <PageFooter />
        </Page>

        {/* === PAGE 3 — Shopping List === */}
        <Page>
          <PageHeader left="Page 03" center="Shopping List" date={today} />
          <table className="mt-6 w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-ink/30 text-[9px] uppercase tracking-[0.15em] text-ink">
                <th className="w-16 py-2 text-left font-medium">Image</th>
                <th className="py-2 text-left font-medium">Item</th>
                <th className="py-2 text-left font-medium">Maker</th>
                <th className="py-2 text-left font-medium">Category</th>
                <th className="py-2 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-ink/10">
                  <td className="py-2">
                    <div className="flex h-10 w-12 items-center justify-center">
                      <img
                        src={p.src}
                        alt=""
                        className="max-h-10 max-w-full object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-2 font-serif text-[12px] text-ink">
                    {p.name}
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">{p.maker}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{p.category}</td>
                  <td className="py-2 text-right font-medium text-ink">
                    {p.price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-baseline justify-between border-t border-ink/30 pt-3">
            <p className="text-[9px] italic text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"} · prepared{" "}
              {today}
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink">
              Total ·{" "}
              <span className="font-serif text-[16px] not-italic tracking-normal">
                €{items
                  .reduce((sum, p) => {
                    const n = Number(String(p.price).replace(/[^0-9.,]/g, "").replace(",", "."));
                    return sum + (isFinite(n) ? n : 0);
                  }, 0)
                  .toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>
          <PageFooter />
        </Page>
      </div>

      {/* Print rules */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: white !important; }
        }
      `}</style>
    </main>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="relative flex w-full flex-col bg-[oklch(0.95_0.012_85)] p-6 shadow-[var(--shadow-soft)] print:break-after-page print:shadow-none"
      style={{ aspectRatio: "1 / 1.414" }}
    >
      {children}
    </section>
  );
}

function PageHeader({
  left,
  center,
  date,
}: {
  left: string;
  center: string;
  date: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-ink/15 pb-3">
      <span className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
        {left}
      </span>
      <h2 className="font-serif text-xl italic text-ink">
        {center.split(" ").slice(0, -1).join(" ")}{" "}
        <span className="not-italic font-medium uppercase tracking-wider">
          {center.split(" ").slice(-1)}
        </span>
      </h2>
      <span className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
        {date}
      </span>
    </div>
  );
}

function PageFooter() {
  return (
    <div className="absolute inset-x-6 bottom-4 border-t border-ink/15 pt-2 text-center text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
      Supermoods · Project Presentation
    </div>
  );
}
