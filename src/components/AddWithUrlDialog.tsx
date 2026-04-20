import { useState } from "react";
import { Loader2, Link2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { scrapeProduct } from "@/server/scrape-product";
import { useUserProducts } from "@/store/user-products";
import type { Product, Category, Role } from "@/data/catalog";

type Status = "idle" | "loading" | "preview" | "error";

const VALID_CATEGORIES: Category[] = [
  "Seating",
  "Tables",
  "Lighting",
  "Storage",
  "Decor",
  "Textiles",
  "Art",
];
const VALID_ROLES: Role[] = [
  "floor",
  "ground",
  "surface",
  "hanging",
  "standing",
  "wall",
  "prop",
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function AddWithUrlDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { add } = useUserProducts();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Product | null>(null);

  function reset() {
    setUrl("");
    setStatus("idle");
    setError(null);
    setDraft(null);
  }

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setStatus("loading");
    setError(null);
    try {
      const raw = await scrapeProduct({ data: { url: url.trim() } });
      const name = raw.name ?? "Untitled piece";
      const cat = (raw.category as Category) || "Decor";
      const role = (raw.role as Role) || "ground";
      const product: Product = {
        id: `user-${slugify(name)}-${Date.now().toString(36)}`,
        name,
        maker: raw.maker ?? "—",
        price: raw.price ?? "—",
        category: VALID_CATEGORIES.includes(cat) ? cat : "Decor",
        role: VALID_ROLES.includes(role) ? role : "ground",
        src: raw.image_url ?? "",
        colors: ["linen", "cream"],
        description: raw.description,
        gallery: raw.gallery,
        sourceUrl: raw.sourceUrl ?? url.trim(),
        dims:
          raw.width_cm !== undefined || raw.height_cm !== undefined
            ? {
                w: raw.width_cm ?? 100,
                h: raw.height_cm ?? 80,
                d: raw.depth_cm,
              }
            : undefined,
      };
      setDraft(product);
      setStatus("preview");
    } catch (err) {
      console.error("scrape failed", err);
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't read that page. Try another URL.",
      );
      setStatus("error");
    }
  }

  function handleConfirm() {
    if (!draft) return;
    add(draft);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg border-border bg-background p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="font-serif text-2xl text-ink">
            Add with URL
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Paste a product page from any furniture site — we'll fetch the image,
            specs and details.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          {(status === "idle" || status === "loading" || status === "error") && (
            <form onSubmit={handleScrape} className="space-y-3">
              <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 focus-within:border-ink">
                <Link2 size={16} className="text-muted-foreground" />
                <input
                  type="url"
                  required
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.sklum.com/..."
                  className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-foreground focus:outline-none"
                  disabled={status === "loading"}
                />
              </label>
              <button
                type="submit"
                disabled={status === "loading" || !url.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm text-background transition-opacity disabled:opacity-50"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Reading the page…
                  </>
                ) : (
                  "Fetch product"
                )}
              </button>
              {error && (
                <p className="rounded-xl bg-rust/10 px-3 py-2 text-xs text-rust">
                  {error}
                </p>
              )}
            </form>
          )}

          {status === "preview" && draft && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl bg-secondary">
                {draft.src ? (
                  <img
                    src={draft.src}
                    alt={draft.name}
                    className="h-56 w-full object-contain p-4"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                    No image found
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {draft.category} · {draft.maker}
                </p>
                <h3 className="mt-1 font-serif text-xl text-ink">{draft.name}</h3>
                <p className="mt-1 text-sm text-rust">{draft.price}</p>
                {draft.description && (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {draft.description}
                  </p>
                )}
                {draft.dims && (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {draft.dims.w}cm × {draft.dims.h}cm
                    {draft.dims.d ? ` × ${draft.dims.d}cm` : ""}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm text-ink transition-colors hover:bg-secondary"
                >
                  <X size={14} /> Try another
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rust px-4 py-3 text-sm text-primary-foreground transition-transform hover:scale-[1.01]"
                >
                  <Check size={14} /> Add to catalog
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
