import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Sparkles, RefreshCw, Plus, Pencil, Check, RotateCcw, ImagePlus, FileText, Maximize2 } from "lucide-react";
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
import { MatchFromImageDialog } from "@/components/MatchFromImageDialog";
import { FullscreenComposer } from "@/components/FullscreenComposer";
import { LeadCaptureDialog, getStoredLead } from "@/components/LeadCaptureDialog";

export const Route = createFileRoute("/moodboard")({
  component: MoodboardPage,
  head: () => ({
    meta: [
      { title: "Supermoods — Your Moodboard" },
      { name: "description", content: "Your curated moodboard — pieces, palette and room." },
    ],
  }),
});

function MoodboardPage() {
  const navigate = useNavigate();
  const {
    ids,
    paletteId,
    setPaletteId,
    sceneId,
    setSceneId,
    toggle,
    layout,
    setLayoutFor,
    resetLayoutFor,
    resetAllLayout,
  } = useSelection();
  const { products: userProducts } = useUserProducts();
  const [editMode, setEditMode] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);

  const handleFinish = () => {
    if (getStoredLead()) {
      navigate({ to: "/present" });
    } else {
      setLeadOpen(true);
    }
  };

  const items = useMemo(() => {
    const merged = [...userProducts, ...catalog];
    return ids
      .map((id) => merged.find((p) => p.id === id))
      .filter(Boolean) as typeof catalog;
  }, [ids, userProducts]);

  const aiPalette = useMemo(() => generateAIPalette(ids), [ids]);
  const [aiNonce, setAiNonce] = useState(0);

  const allPalettes: Palette[] = useMemo(
    () => [aiPalette, ...curatedPalettes],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aiPalette, aiNonce],
  );

  const activePalette: Palette =
    allPalettes.find((p) => p.id === paletteId) ?? aiPalette;

  const activeScene: Scene =
    scenes.find((s) => s.id === sceneId) ?? scenes[0];

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
            to compose your room.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={() => setMatchOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-rust px-5 py-2.5 text-sm text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              <ImagePlus size={16} /> Match from an image
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-background"
            >
              <ArrowLeft size={16} /> Back to catalog
            </Link>
          </div>
          <MatchFromImageDialog
            open={matchOpen}
            onOpenChange={setMatchOpen}
            onMatched={() => setEditMode(true)}
          />
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
            Supermoods
          </Link>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {items.length} {items.length === 1 ? "piece" : "pieces"}
          </div>
        </div>
      </header>

      {/* Title */}
      <section className="mx-auto max-w-[1500px] px-6 pb-6 pt-10 md:px-10 md:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-display text-muted-foreground">
              Your concept
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-[0.95] text-ink md:text-7xl">
              A room,
              <br />
              <em className="font-light italic text-rust">composed.</em>
            </h1>
          </div>
          <button
            onClick={() => setMatchOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-ink bg-ink px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-background transition-transform hover:scale-[1.02]"
          >
            <ImagePlus size={14} /> Match from an image
          </button>
        </div>
      </section>

      <MatchFromImageDialog
        open={matchOpen}
        onOpenChange={setMatchOpen}
        onMatched={() => setEditMode(true)}
      />

      {/* Composed Room Scene */}
      <section className="mx-auto max-w-[1500px] px-6 md:px-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-display text-muted-foreground">
            {editMode
              ? "Drag pieces to reposition · drag the corner handle to resize"
              : "Click Edit to rearrange and resize pieces"}
          </p>
          <div className="flex items-center gap-2">
            {editMode && (
              <button
                onClick={() => {
                  if (window.confirm("Reset all positions and sizes to defaults?")) {
                    resetAllLayout();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-foreground hover:bg-secondary"
              >
                <RotateCcw size={12} /> Reset all
              </button>
            )}
            <button
              onClick={() => setEditMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] transition ${
                editMode
                  ? "bg-rust text-primary-foreground hover:scale-[1.02]"
                  : "border border-ink bg-ink text-background hover:scale-[1.02]"
              }`}
            >
              {editMode ? (
                <>
                  <Check size={14} /> Save
                </>
              ) : (
                <>
                  <Pencil size={12} /> Edit
                </>
              )}
            </button>
            <button
              onClick={() => setFullOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-foreground hover:bg-secondary"
            >
              <Maximize2 size={12} /> Fullscreen
            </button>
          </div>
        </div>
        <RoomScene
          items={items}
          palette={activePalette}
          scene={activeScene}
          onRemove={toggle}
          editMode={editMode}
          layout={layout}
          onLayoutChange={setLayoutFor}
          onResetItem={resetLayoutFor}
        />
      </section>

      {/* Scene picker */}
      <section className="mx-auto mt-8 max-w-[1500px] px-6 md:px-10">
        <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-display text-muted-foreground">
                Backdrop
              </p>
              <h2 className="mt-2 font-serif text-2xl text-ink">
                Place it on a palette, or in a real room.
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {scenes.map((s) => {
              const active = activeScene.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSceneId(s.id)}
                  className={`group overflow-hidden rounded-2xl border text-left transition-all ${
                    active
                      ? "border-ink shadow-[var(--shadow-soft)]"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
                    {s.kind === "image" && s.src ? (
                      <img
                        src={s.src}
                        alt={s.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="h-full w-full"
                        style={{
                          background: `linear-gradient(180deg, ${colorMap[activePalette.colors[1] ?? "linen"]} 0%, ${colorMap[activePalette.colors[0] ?? "cream"]} 60%, ${colorMap[activePalette.colors[3] ?? "jute"]} 100%)`,
                        }}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-serif text-base text-ink">{s.name}</span>
                    {active && (
                      <span className="text-[10px] uppercase tracking-[0.2em] text-rust">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Palette picker */}
      <section className="mx-auto mt-8 max-w-[1500px] px-6 md:px-10">
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
          <button
            onClick={handleFinish}
            className="inline-flex items-center gap-2 rounded-full bg-rust px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            <FileText size={14} /> Finish
          </button>
        </div>
      </section>

      <FullscreenComposer open={fullOpen} onClose={() => setFullOpen(false)} />
      <LeadCaptureDialog
        open={leadOpen}
        onOpenChange={setLeadOpen}
        onSubmit={() => {
          setLeadOpen(false);
          navigate({ to: "/present" });
        }}
      />
    </main>
  );
}
