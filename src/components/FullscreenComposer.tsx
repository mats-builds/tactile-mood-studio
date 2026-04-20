import { useMemo, useState, useEffect } from "react";
import { X, Search, Sparkles, RefreshCw, Plus, Minus } from "lucide-react";
import {
  catalog,
  colorMap,
  curatedPalettes,
  generateAIPalette,
  scenes,
  type Palette,
  type Product,
  type Scene,
} from "@/data/catalog";
import { useSelection } from "@/store/selection";
import { useUserProducts } from "@/store/user-products";
import { RoomScene } from "@/components/RoomScene";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FullscreenComposer({ open, onClose }: Props) {
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
  } = useSelection();
  const { products: userProducts } = useUserProducts();
  const [query, setQuery] = useState("");
  const [aiNonce, setAiNonce] = useState(0);
  const [panel, setPanel] = useState<"library" | "scene" | "palette" | null>(
    "library",
  );

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const merged = useMemo(() => [...userProducts, ...catalog], [userProducts]);
  const items = useMemo(
    () =>
      ids.map((id) => merged.find((p) => p.id === id)).filter(Boolean) as Product[],
    [ids, merged],
  );

  const aiPalette = useMemo(() => generateAIPalette(ids), [ids]);
  const allPalettes: Palette[] = useMemo(
    () => [aiPalette, ...curatedPalettes],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aiPalette, aiNonce],
  );
  const activePalette: Palette =
    allPalettes.find((p) => p.id === paletteId) ?? aiPalette;
  const activeScene: Scene = scenes.find((s) => s.id === sceneId) ?? scenes[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.maker.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [merged, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex bg-background text-foreground">
      {/* Library sidebar */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-border/60 bg-background">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Library
          </p>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {filtered.length}
          </span>
        </div>
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-2">
            <Search size={13} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pieces"
              className="w-full bg-transparent text-xs text-ink placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <ul className="space-y-1">
            {filtered.map((p) => {
              const placed = ids.includes(p.id);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => toggle(p.id)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                      placed ? "bg-secondary" : "hover:bg-secondary/60"
                    }`}
                  >
                    <div className="h-12 w-12 shrink-0 rounded-md bg-secondary/60">
                      <img
                        src={p.src}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-contain p-1"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-ink">{p.name}</p>
                      <p className="truncate text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                        {p.category}
                      </p>
                    </div>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                        placed
                          ? "bg-rust text-primary-foreground"
                          : "bg-background text-ink ring-1 ring-border group-hover:bg-ink group-hover:text-background"
                      }`}
                    >
                      {placed ? <Minus size={12} /> : <Plus size={12} />}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-2 py-8 text-center text-xs text-muted-foreground">
                Nothing matches “{query}”.
              </li>
            )}
          </ul>
        </div>
      </aside>

      {/* Stage */}
      <div className="relative flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Composer · Fullscreen
            </span>
            <span className="h-3 w-px bg-border" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-ink">
              {items.length} {items.length === 1 ? "piece" : "pieces"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PanelToggle
              active={panel === "scene"}
              onClick={() => setPanel(panel === "scene" ? null : "scene")}
              label="Backdrop"
            />
            <PanelToggle
              active={panel === "palette"}
              onClick={() => setPanel(panel === "palette" ? null : "palette")}
              label="Palette"
            />
            <button
              onClick={onClose}
              className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-secondary"
              aria-label="Close fullscreen"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Stage area */}
        <div className="relative flex-1 overflow-hidden bg-background p-6">
          <div className="mx-auto h-full max-w-[1600px]">
            {items.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-sm text-muted-foreground">
                  Add pieces from the library on the left to start composing.
                </p>
              </div>
            ) : (
              <RoomScene
                items={items}
                palette={activePalette}
                scene={activeScene}
                onRemove={toggle}
                editMode={true}
                layout={layout}
                onLayoutChange={setLayoutFor}
                onResetItem={resetLayoutFor}
              />
            )}
          </div>
        </div>

        {/* Bottom panels */}
        {panel === "scene" && (
          <BottomPanel title="Backdrop" onClose={() => setPanel(null)}>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {scenes.map((s) => {
                const active = activeScene.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSceneId(s.id)}
                    className={`group w-[180px] shrink-0 overflow-hidden rounded-xl border text-left transition-all ${
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
                          className="h-full w-full object-cover"
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
                    <div className="px-2.5 py-1.5">
                      <span className="font-serif text-sm text-ink">{s.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </BottomPanel>
        )}

        {panel === "palette" && (
          <BottomPanel
            title="Palette"
            onClose={() => setPanel(null)}
            action={
              <button
                onClick={() => {
                  setPaletteId("ai");
                  setAiNonce((n) => n + 1);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-ink px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-background hover:scale-[1.02]"
              >
                <Sparkles size={11} />
                {activePalette.id === "ai" ? "Regenerate" : "AI"}
                {activePalette.id === "ai" && <RefreshCw size={10} />}
              </button>
            }
          >
            <div className="flex gap-3 overflow-x-auto pb-1">
              {allPalettes.map((p) => {
                const active = activePalette.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPaletteId(p.id)}
                    className={`w-[160px] shrink-0 rounded-xl border p-2.5 text-left transition-all ${
                      active
                        ? "border-ink bg-secondary shadow-[var(--shadow-soft)]"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <div className="flex h-8 overflow-hidden rounded-md">
                      {p.colors.map((c, i) => (
                        <div
                          key={`${p.id}-${c}-${i}`}
                          className="flex-1"
                          style={{ backgroundColor: colorMap[c] }}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-serif text-sm text-ink">{p.name}</span>
                      {p.id === "ai" && (
                        <Sparkles size={10} className="text-rust" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </BottomPanel>
        )}
      </div>
    </div>
  );
}

function PanelToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors ${
        active
          ? "bg-ink text-background"
          : "text-ink hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}

function BottomPanel({
  title,
  onClose,
  action,
  children,
}: {
  title: string;
  onClose: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border/60 bg-background/95 px-6 py-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {title}
        </p>
        <div className="flex items-center gap-2">
          {action}
          <button
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-ink hover:bg-secondary"
            aria-label="Close panel"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}