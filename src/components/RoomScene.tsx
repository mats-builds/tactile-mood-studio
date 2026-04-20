import { useMemo } from "react";
import { type Product, type Scene, colorMap, type Palette } from "@/data/catalog";

type Props = {
  items: Product[];
  palette: Palette;
  scene: Scene;
  onRemove?: (id: string) => void;
};

/**
 * Composes selected pieces into a believable room scene.
 * Decorating rules:
 *  - rug (floor) sits centered on the floor, widest element
 *  - sofa / large seating sits ON the rug, slightly above it
 *  - side tables / ottomans flank the sofa
 *  - floor lamps stand to the side, taller
 *  - pendants hang from the top
 *  - art / mirrors hang on the back wall
 *  - props (vase, books, candles, pillows) sit on top surfaces
 */
export function RoomScene({ items, palette, scene, onRemove }: Props) {
  const groups = useMemo(() => {
    const by = (role: Product["role"]) => items.filter((i) => i.role === role);
    return {
      floor: by("floor"),
      ground: by("ground"),
      surface: by("surface"),
      hanging: by("hanging"),
      standing: by("standing"),
      wall: by("wall"),
      prop: by("prop"),
    };
  }, [items]);

  // background — palette gradient or empty room photo
  const bgStyle =
    scene.kind === "palette"
      ? {
          background: `linear-gradient(180deg, ${colorMap[palette.colors[1] ?? "linen"]} 0%, ${colorMap[palette.colors[0] ?? "cream"]} 55%, ${colorMap[palette.colors[2] ?? "travertine"]} 100%)`,
        }
      : undefined;

  // wall/floor split for palette mode (subtle horizon line)
  const floorBand =
    scene.kind === "palette"
      ? `linear-gradient(180deg, transparent 0%, transparent 62%, ${colorMap[palette.colors[3] ?? "jute"]}55 62%, ${colorMap[palette.colors[3] ?? "jute"]}88 100%)`
      : undefined;

  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl shadow-[var(--shadow-soft)]"
      style={bgStyle}
    >
      {/* room background image */}
      {scene.kind === "image" && scene.src && (
        <img
          src={scene.src}
          alt={`${scene.name} background`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {/* subtle floor tint band for palette mode */}
      {floorBand && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: floorBand }}
        />
      )}

      {/* warm vignette to ground the scene */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 110%, oklch(0.22 0.02 50 / 0.28) 0%, transparent 55%)",
        }}
      />

      {/* corner palette swatches */}
      <div className="absolute right-5 top-5 z-30 flex gap-1">
        {palette.colors.map((c, i) => (
          <div
            key={i}
            className="h-6 w-6 rounded-full ring-1 ring-ink/10 shadow-sm"
            style={{ backgroundColor: colorMap[c] }}
          />
        ))}
      </div>

      {/* scene label */}
      <div className="absolute left-5 top-5 z-30 rounded-full bg-background/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-ink backdrop-blur">
        {scene.name} · {palette.name}
      </div>

      {/* ============ DECOR LAYERS ============ */}

      {/* WALL: art & mirrors — back wall, upper third */}
      {groups.wall.map((p, i, arr) => {
        const total = arr.length;
        // distribute evenly across center of wall
        const left = total === 1 ? 50 : 30 + (i * 40) / Math.max(total - 1, 1);
        return (
          <Piece
            key={p.id}
            product={p}
            onRemove={onRemove}
            style={{
              left: `${left}%`,
              top: "14%",
              width: "16%",
              transform: "translateX(-50%)",
              zIndex: 10,
            }}
          />
        );
      })}

      {/* HANGING: pendants drop from top */}
      {groups.hanging.map((p, i, arr) => {
        const total = arr.length;
        const left = total === 1 ? 50 : 35 + (i * 30) / Math.max(total - 1, 1);
        return (
          <Piece
            key={p.id}
            product={p}
            onRemove={onRemove}
            style={{
              left: `${left}%`,
              top: "0%",
              width: "11%",
              transform: "translateX(-50%)",
              zIndex: 11,
            }}
          />
        );
      })}

      {/* FLOOR: rug — flat on the floor, squashed via Y-scale to simulate perspective */}
      {groups.floor.map((p) => (
        <div
          key={p.id}
          className="group/piece absolute"
          style={{
            left: "50%",
            bottom: "2%",
            width: "55%",
            height: "22%",
            transform: "translateX(-50%)",
            zIndex: 20,
          }}
        >
          <img
            src={p.src}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover object-center drop-shadow-[0_18px_18px_oklch(0.22_0.02_50_/_0.35)]"
            style={{ transform: "perspective(800px) rotateX(58deg)" }}
          />
          {onRemove && (
            <button
              onClick={() => onRemove(p.id)}
              aria-label={`Remove ${p.name}`}
              className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background/95 text-[11px] text-ink opacity-0 ring-1 ring-border backdrop-blur transition-opacity hover:bg-rust hover:text-primary-foreground group-hover/piece:opacity-100"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* GROUND: sofa, sideboards, big seating — sit ON the rug */}
      {groups.ground.map((p, i, arr) => {
        const total = arr.length;
        const left =
          total === 1 ? 50 : 28 + (i * 44) / Math.max(total - 1, 1);
        const isPrimary = total === 1 || i === Math.floor(total / 2);
        return (
          <Piece
            key={p.id}
            product={p}
            onRemove={onRemove}
            style={{
              left: `${left}%`,
              bottom: "8%",
              width: isPrimary ? "32%" : "22%",
              maxHeight: "42%",
              transform: "translateX(-50%)",
              zIndex: 30 + i,
            }}
          />
        );
      })}

      {/* STANDING: floor lamps, pampas — taller, sides */}
      {groups.standing.map((p, i) => {
        // alternate sides
        const side = i % 2 === 0 ? "left" : "right";
        const offset = 6 + Math.floor(i / 2) * 8;
        return (
          <Piece
            key={p.id}
            product={p}
            onRemove={onRemove}
            style={{
              [side]: `${offset}%`,
              bottom: "10%",
              width: "13%",
              zIndex: 25,
            }}
          />
        );
      })}

      {/* SURFACE: side tables, ottomans, low tables — flanking sofa */}
      {groups.surface.map((p, i) => {
        const side = i % 2 === 0 ? "left" : "right";
        const offset = 22 + Math.floor(i / 2) * 6;
        return (
          <Piece
            key={p.id}
            product={p}
            onRemove={onRemove}
            style={{
              [side]: `${offset}%`,
              bottom: "10%",
              width: "15%",
              zIndex: 35,
            }}
          />
        );
      })}

      {/* PROPS: vases, books, candles, pillows — small, scattered on surfaces */}
      {groups.prop.map((p, i, arr) => {
        const total = arr.length;
        // arrange across the middle band
        const left = 18 + (i * 64) / Math.max(total, 1);
        const bottoms = ["22%", "18%", "26%", "20%", "24%"];
        return (
          <Piece
            key={p.id}
            product={p}
            onRemove={onRemove}
            style={{
              left: `${left}%`,
              bottom: bottoms[i % bottoms.length],
              width: "8%",
              zIndex: 40 + i,
            }}
          />
        );
      })}
    </div>
  );
}

function Piece({
  product,
  style,
  onRemove,
}: {
  product: Product;
  style: React.CSSProperties;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="group/piece absolute flex items-end justify-center" style={style}>
      <img
        src={product.src}
        alt={product.name}
        loading="lazy"
        className="h-full max-h-full w-full object-contain object-bottom drop-shadow-[0_22px_22px_oklch(0.22_0.02_50_/_0.35)] transition-transform duration-500 group-hover/piece:-translate-y-1 group-hover/piece:scale-[1.04]"
      />
      {onRemove && (
        <button
          onClick={() => onRemove(product.id)}
          aria-label={`Remove ${product.name}`}
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/95 text-[11px] text-ink opacity-0 ring-1 ring-border backdrop-blur transition-opacity hover:bg-rust hover:text-primary-foreground group-hover/piece:opacity-100"
        >
          ×
        </button>
      )}
      <div className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/90 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-background opacity-0 transition-opacity group-hover/piece:opacity-100">
        {product.name}
      </div>
    </div>
  );
}
