import { useMemo, useRef, useState, useEffect } from "react";
import { type Product, type Scene, colorMap, type Palette } from "@/data/catalog";
import type { LayoutMap, LayoutOverride } from "@/store/selection";

type Props = {
  items: Product[];
  palette: Palette;
  scene: Scene;
  onRemove?: (id: string) => void;
  editMode?: boolean;
  layout?: LayoutMap;
  onLayoutChange?: (id: string, patch: Partial<LayoutOverride>) => void;
  onResetItem?: (id: string) => void;
};

const ROOM_W_CM = 320;
const FRAME_AR = 16 / 10;
const ROOM_FRAME_H_CM = ROOM_W_CM / FRAME_AR;

function pctSize(
  dims: { w: number; h: number } | undefined,
  fallback: { w: number; h: number },
  scale = 1,
) {
  const w = (dims?.w ?? fallback.w) * scale;
  const h = (dims?.h ?? fallback.h) * scale;
  return {
    widthPct: (w / ROOM_W_CM) * 100,
    heightPct: (h / ROOM_FRAME_H_CM) * 100,
  };
}

type DefaultPos = { xPct: number; yPct: number };

/** Compute a sensible default position per role + index, in % from top-left */
function defaultPosition(p: Product, indexInGroup: number, totalInGroup: number): DefaultPos {
  const spread = (i: number, total: number, span = 40, center = 50) =>
    total === 1 ? center : center - span / 2 + (i * span) / Math.max(total - 1, 1);
  switch (p.role) {
    case "wall":
      return { xPct: spread(indexInGroup, totalInGroup, 40, 50), yPct: 18 };
    case "hanging":
      return { xPct: spread(indexInGroup, totalInGroup, 30, 50), yPct: 8 };
    case "floor":
      return { xPct: 50, yPct: 78 };
    case "ground":
      return { xPct: spread(indexInGroup, totalInGroup, 44, 50), yPct: 70 };
    case "standing": {
      const side = indexInGroup % 2 === 0 ? 12 : 88;
      return { xPct: side, yPct: 55 };
    }
    case "surface": {
      const side = indexInGroup % 2 === 0 ? 26 : 74;
      return { xPct: side, yPct: 75 };
    }
    case "prop":
    default: {
      const xs = [22, 38, 54, 70, 82];
      const ys = [70, 74, 68, 76, 72];
      return { xPct: xs[indexInGroup % xs.length], yPct: ys[indexInGroup % ys.length] };
    }
  }
}

const ROLE_FALLBACK: Record<string, { w: number; h: number }> = {
  wall: { w: 70, h: 90 },
  hanging: { w: 45, h: 60 },
  floor: { w: 300, h: 200 },
  ground: { w: 200, h: 80 },
  standing: { w: 40, h: 160 },
  surface: { w: 60, h: 50 },
  prop: { w: 25, h: 30 },
};

export function RoomScene({
  items,
  palette,
  scene,
  onRemove,
  editMode = false,
  layout = {},
  onLayoutChange,
  onResetItem,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Clear selection when leaving edit mode
  useEffect(() => {
    if (!editMode) setSelectedId(null);
  }, [editMode]);

  // Compute per-item index within its role group for default placement
  const placement = useMemo(() => {
    const counters: Record<string, number> = {};
    const totals: Record<string, number> = {};
    items.forEach((it) => {
      totals[it.role] = (totals[it.role] ?? 0) + 1;
    });
    return items.map((it) => {
      const idx = counters[it.role] ?? 0;
      counters[it.role] = idx + 1;
      return { item: it, idx, total: totals[it.role] };
    });
  }, [items]);

  const bgStyle =
    scene.kind === "palette"
      ? {
          background: `linear-gradient(180deg, ${colorMap[palette.colors[1] ?? "linen"]} 0%, ${colorMap[palette.colors[0] ?? "cream"]} 55%, ${colorMap[palette.colors[2] ?? "travertine"]} 100%)`,
        }
      : undefined;

  const floorBand =
    scene.kind === "palette"
      ? `linear-gradient(180deg, transparent 0%, transparent 62%, ${colorMap[palette.colors[3] ?? "jute"]}55 62%, ${colorMap[palette.colors[3] ?? "jute"]}88 100%)`
      : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[16/10] w-full overflow-hidden rounded-3xl shadow-[var(--shadow-soft)] ${
        editMode ? "ring-2 ring-rust/60" : ""
      }`}
      style={bgStyle}
      onPointerDown={(e) => {
        // click on empty area clears selection
        if (editMode && e.target === e.currentTarget) setSelectedId(null);
      }}
    >
      {scene.kind === "image" && scene.src && (
        <img
          src={scene.src}
          alt={`${scene.name} background`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {floorBand && (
        <div className="pointer-events-none absolute inset-0" style={{ background: floorBand }} />
      )}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 110%, oklch(0.22 0.02 50 / 0.28) 0%, transparent 55%)",
        }}
      />

      {/* edit-mode grid overlay */}
      {editMode && (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0.22 0.02 50 / 0.15) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.22 0.02 50 / 0.15) 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />
      )}

      <div className="absolute right-5 top-5 z-30 flex gap-1">
        {palette.colors.map((c, i) => (
          <div
            key={i}
            className="h-6 w-6 rounded-full ring-1 ring-ink/10 shadow-sm"
            style={{ backgroundColor: colorMap[c] }}
          />
        ))}
      </div>

      <div className="absolute left-5 top-5 z-30 rounded-full bg-background/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-ink backdrop-blur">
        {scene.name} · {palette.name} {editMode && <span className="ml-2 text-rust">· editing</span>}
      </div>

      {placement.map(({ item, idx, total }) => {
        const fallback = ROLE_FALLBACK[item.role] ?? { w: 60, h: 60 };
        const override = layout[item.id] ?? {};
        const def = defaultPosition(item, idx, total);
        const xPct = override.xPct ?? def.xPct;
        const yPct = override.yPct ?? def.yPct;
        const scale = override.scale ?? 1;
        const { widthPct, heightPct } = pctSize(item.dims, fallback, scale);

        return (
          <Piece
            key={item.id}
            product={item}
            xPct={xPct}
            yPct={yPct}
            widthPct={widthPct}
            heightPct={heightPct}
            scale={scale}
            flipX={override.flipX ?? false}
            zOrder={override.z ?? 0}
            locked={override.locked ?? false}
            editMode={editMode}
            selected={selectedId === item.id}
            onSelect={() => setSelectedId(item.id)}
            containerRef={containerRef}
            onRemove={onRemove}
            onLayoutChange={onLayoutChange}
            onReset={onResetItem}
            isFloor={item.role === "floor"}
          />
        );
      })}
    </div>
  );
}

type PieceProps = {
  product: Product;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  scale: number;
  flipX: boolean;
  zOrder: number;
  locked: boolean;
  editMode: boolean;
  selected: boolean;
  onSelect: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRemove?: (id: string) => void;
  onLayoutChange?: (id: string, patch: Partial<LayoutOverride>) => void;
  onReset?: (id: string) => void;
  isFloor?: boolean;
};

function Piece({
  product,
  xPct,
  yPct,
  widthPct,
  heightPct,
  scale,
  flipX,
  zOrder,
  editMode,
  selected,
  onSelect,
  containerRef,
  onRemove,
  onLayoutChange,
  onReset,
  isFloor,
}: PieceProps) {
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  // Live local position/scale so the piece follows the cursor smoothly,
  // committed to the store on pointer-up.
  const [localX, setLocalX] = useState(xPct);
  const [localY, setLocalY] = useState(yPct);
  const [localScale, setLocalScale] = useState(scale);

  useEffect(() => {
    if (!dragging) setLocalX(xPct);
  }, [xPct, dragging]);
  useEffect(() => {
    if (!dragging) setLocalY(yPct);
  }, [yPct, dragging]);
  useEffect(() => {
    if (!resizing) setLocalScale(scale);
  }, [scale, resizing]);

  const startDrag = (e: React.PointerEvent) => {
    if (!editMode || !containerRef.current) return;
    // First click selects; subsequent drags move.
    if (!selected) {
      e.stopPropagation();
      onSelect();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startXPct = localX;
    const startYPct = localY;
    setDragging(true);

    const move = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      setLocalX(Math.max(0, Math.min(100, startXPct + dxPct)));
      setLocalY(Math.max(0, Math.min(100, startYPct + dyPct)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragging(false);
      // Use the latest values via functional setState read
      setLocalX((x) => {
        setLocalY((y) => {
          onLayoutChange?.(product.id, { xPct: x, yPct: y });
          return y;
        });
        return x;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startResize = (e: React.PointerEvent) => {
    if (!editMode || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startScale = localScale;
    const baseWidthPx = (widthPct / 100) * rect.width / startScale; // unscaled px width
    setResizing(true);

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const newWidth = baseWidthPx * startScale + dx;
      const next = Math.max(0.2, Math.min(4, newWidth / baseWidthPx));
      setLocalScale(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setResizing(false);
      setLocalScale((s) => {
        onLayoutChange?.(product.id, { scale: s });
        return s;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const liveWidth = (widthPct / scale) * localScale;
  const liveHeight = (heightPct / scale) * localScale;

  return (
    <div
      className={`group/piece absolute inline-flex items-end justify-center ${
        editMode ? (selected ? "cursor-move" : "cursor-pointer") : ""
      } ${dragging || resizing ? "z-50" : ""}`}
      style={{
        left: `${localX}%`,
        top: `${localY}%`,
        width: "auto",
        height: `${liveHeight}%`,
        transform: "translate(-50%, -100%)",
        zIndex:
          dragging || resizing ? 1000 : selected ? 500 + zOrder : 10 + zOrder,
        touchAction: editMode ? "none" : undefined,
      }}
      onPointerDown={editMode ? startDrag : undefined}
    >
      <img
        src={product.src}
        alt={product.name}
        loading="lazy"
        draggable={false}
        className={`h-full w-auto max-w-none object-contain object-bottom drop-shadow-[0_22px_22px_oklch(0.22_0.02_50_/_0.35)] transition-transform duration-300 ${
          !editMode ? "group-hover/piece:-translate-y-1 group-hover/piece:scale-[1.04]" : ""
        } ${isFloor ? "" : ""}`}
        style={
          isFloor
            ? {
                transform: `perspective(800px) rotateX(58deg)${flipX ? " scaleX(-1)" : ""}`,
                objectFit: "cover",
              }
            : flipX
              ? { transform: "scaleX(-1)" }
              : undefined
        }
      />

      {/* edit-mode frame */}
      {editMode && selected && (
        <div className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-rust/70" />
      )}

      {/* edit-mode toolbar (top) */}
      {editMode && selected && (
        <div
          className="absolute -top-9 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-md bg-background/95 px-1 py-1 shadow ring-1 ring-border backdrop-blur"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLayoutChange?.(product.id, { flipX: !flipX });
            }}
            title="Flip horizontally"
            aria-label={`Flip ${product.name} horizontally`}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-[12px] text-ink hover:bg-muted"
          >
            ⇋
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLayoutChange?.(product.id, { z: (zOrder ?? 0) + 1 });
            }}
            title="Bring to front"
            aria-label={`Bring ${product.name} to front`}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-[12px] text-ink hover:bg-muted"
          >
            ▲
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLayoutChange?.(product.id, { z: (zOrder ?? 0) - 1 });
            }}
            title="Send to back"
            aria-label={`Send ${product.name} to back`}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-[12px] text-ink hover:bg-muted"
          >
            ▼
          </button>
        </div>
      )}

      {/* resize handle (bottom-right) */}
      {editMode && selected && (
        <button
          aria-label={`Resize ${product.name}`}
          onPointerDown={startResize}
          className="absolute -bottom-2 -right-2 z-10 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-sm bg-rust text-[10px] text-primary-foreground shadow ring-1 ring-background"
        >
          ⤡
        </button>
      )}

      {/* reset handle (bottom-left) */}
      {editMode && selected && onReset && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReset(product.id);
          }}
          aria-label={`Reset ${product.name}`}
          className="absolute -bottom-2 -left-2 z-10 flex h-5 w-5 items-center justify-center rounded-sm bg-background text-[10px] text-ink shadow ring-1 ring-border"
          title="Reset to default"
        >
          ↺
        </button>
      )}

      {onRemove && !editMode && (
        <button
          onClick={() => onRemove(product.id)}
          aria-label={`Remove ${product.name}`}
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/95 text-[11px] text-ink opacity-0 ring-1 ring-border backdrop-blur transition-opacity hover:bg-rust hover:text-primary-foreground group-hover/piece:opacity-100"
        >
          ×
        </button>
      )}
      {onRemove && editMode && selected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(product.id);
          }}
          aria-label={`Remove ${product.name}`}
          className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-sm bg-ink text-[11px] text-background shadow"
        >
          ×
        </button>
      )}

      <div className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/90 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-background opacity-0 transition-opacity group-hover/piece:opacity-100">
        {product.name}
        {editMode && <span className="ml-1 text-rust-foreground/80">· {Math.round(localScale * 100)}%</span>}
      </div>
    </div>
  );
}
