import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Plus, Link2, BookOpen, Sparkles, Pencil, X, ArrowLeft, Crop, Loader2, LogOut, Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AddWithUrlDialog } from "@/components/AddWithUrlDialog";
import { EditProductDialog } from "@/components/EditProductDialog";
import { useUserProducts } from "@/store/user-products";
import type { Product } from "@/data/catalog";
import { trimTransparentEdges } from "@/lib/alpha-cutout";
import { toast } from "sonner";
import { useAuth, signOut } from "@/store/auth";
import { guestMode } from "@/store/guest";
import { useEffect } from "react";

export function SideMenu() {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<"menu" | "all">("menu");
  const [editing, setEditing] = useState<Product | null>(null);
  const { products, remove, update } = useUserProducts();
  const { user } = useAuth();
  const [, force] = useState(0);
  useEffect(() => guestMode.subscribe(() => force((n) => n + 1)), []);
  const isGuest = guestMode.isGuest();
  const accountLabel = isGuest ? "Guest demo" : user?.email ?? "Account";
  const accountSub = isGuest ? "Exit demo" : "Sign out";

  // Keep the editing draft in sync if the underlying product mutates (e.g. image deleted).
  const liveEditing = editing
    ? products.find((p) => p.id === editing.id) ?? null
    : null;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setView("menu");
        }}
      >
        <SheetTrigger asChild>
          <button
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-secondary"
          >
            <Menu strokeWidth={1.4} />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] border-r border-border bg-background p-0 sm:w-[380px]">
          {view === "all" ? (
            <AllAdditionsView
              products={products}
              onRemove={remove}
              onEdit={(p) => setEditing(p)}
              onBack={() => setView("menu")}
              onUpdate={update}
            />
          ) : (
            <>
          <SheetHeader className="border-b border-border/60 px-6 py-5 text-left">
            <SheetTitle className="font-serif text-2xl text-ink">Supermoods</SheetTitle>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Compose. Curate. Collect.
            </p>
          </SheetHeader>

          <nav className="flex flex-col px-2 py-4">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-ink transition-colors hover:bg-secondary"
            >
              <BookOpen size={16} strokeWidth={1.6} />
              The catalog
            </Link>
            <Link
              to="/moodboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-ink transition-colors hover:bg-secondary"
            >
              <Sparkles size={16} strokeWidth={1.6} />
              Your moodboard
            </Link>

            {user && !isGuest && (
              <Link
                to="/admin/import"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-ink transition-colors hover:bg-secondary"
              >
                <Settings size={16} strokeWidth={1.6} />
                Settings · Bulk import
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                // small delay so the sheet animation finishes
                setTimeout(() => setAddOpen(true), 150);
              }}
              className="mt-3 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-left text-sm text-background transition-transform hover:scale-[1.01]"
            >
              <Link2 size={16} strokeWidth={1.6} />
              Add with URL
              <Plus size={14} className="ml-auto" />
            </button>
          </nav>

          {products.length > 0 && (
            <div className="mt-2 border-t border-border/60 px-6 py-5">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Your additions · {products.length}
                </p>
                {products.length > 3 && (
                  <button
                    onClick={() => setView("all")}
                    className="text-[10px] uppercase tracking-[0.22em] text-rust hover:underline"
                  >
                    See all
                  </button>
                )}
              </div>
              <ul className="mt-3 space-y-2">
                {products.slice(0, 3).map((p) => (
                  <AdditionRow
                    key={p.id}
                    product={p}
                    onRemove={remove}
                    onEdit={() => setEditing(p)}
                  />
                ))}
              </ul>
            </div>
          )}

          <div className="absolute bottom-6 left-6 right-6">
            {(user || isGuest) && (
              <button
                type="button"
                onClick={() => {
                  if (isGuest) {
                    guestMode.disable();
                    setOpen(false);
                    setTimeout(() => window.location.reload(), 100);
                  } else {
                    signOut();
                    setOpen(false);
                  }
                }}
                className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-3 py-2.5 text-left transition-colors hover:bg-secondary"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-ink">
                  <LogOut size={14} strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-ink">{accountLabel}</p>
                  <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {accountSub}
                  </p>
                </div>
              </button>
            )}
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Supermoods · 2026
            </p>
          </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AddWithUrlDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditProductDialog
        product={liveEditing}
        open={editing !== null && liveEditing !== null}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
      />
    </>
  );
}

function AdditionRow({
  product,
  onRemove,
  onEdit,
}: {
  product: { id: string; name: string; maker: string; src: string };
  onRemove: (id: string) => void;
  onEdit: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 rounded-xl bg-secondary/60 p-2">
      <img
        src={product.src}
        alt={product.name}
        className="h-10 w-10 rounded-lg bg-background object-contain"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-ink">{product.name}</p>
        <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {product.maker}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-background text-ink transition-colors hover:bg-ink hover:text-background"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          title="Remove"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-background text-rust transition-colors hover:bg-rust hover:text-primary-foreground"
        >
          <X size={12} />
        </button>
      </div>
    </li>
  );
}

function AllAdditionsView({
  products,
  onRemove,
  onEdit,
  onBack,
  onUpdate,
}: {
  products: Product[];
  onRemove: (id: string) => void;
  onEdit: (p: Product) => void;
  onBack: () => void;
  onUpdate: (id: string, patch: Partial<Product>) => boolean;
}) {
  const [retightening, setRetightening] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handleRetightenAll() {
    if (retightening || products.length === 0) return;
    setRetightening(true);
    setProgress({ done: 0, total: products.length });
    let trimmed = 0;
    let skipped = 0;
    try {
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        // Only re-trim PNG cutouts we own (data URLs). Remote/JPG showcases stay as-is.
        if (p.src && p.src.startsWith("data:image/png")) {
          try {
            const next = await trimTransparentEdges(p.src);
            if (next !== p.src) {
              onUpdate(p.id, { src: next });
              trimmed++;
            }
          } catch {
            skipped++;
          }
        } else {
          skipped++;
        }
        setProgress({ done: i + 1, total: products.length });
      }
      toast.success(
        `Re-tightened ${trimmed} ${trimmed === 1 ? "piece" : "pieces"}` +
          (skipped ? ` · ${skipped} skipped` : ""),
      );
    } finally {
      setRetightening(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b border-border/60 px-6 py-5 text-left">
        <button
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-ink"
        >
          <ArrowLeft size={12} /> Back
        </button>
        <SheetTitle className="font-serif text-2xl text-ink">
          Your additions
        </SheetTitle>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {products.length} {products.length === 1 ? "piece" : "pieces"} added by you
        </p>
        {products.length > 0 && (
          <button
            type="button"
            onClick={handleRetightenAll}
            disabled={retightening}
            className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {retightening ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Re-tightening {progress ? `${progress.done}/${progress.total}` : "…"}
              </>
            ) : (
              <>
                <Crop size={12} /> Re-tighten all
              </>
            )}
          </button>
        )}
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {products.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">
            Nothing here yet. Add a piece with a URL to start your own catalog.
          </p>
        ) : (
          <ul className="space-y-2">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3"
              >
                <img
                  src={p.src}
                  alt={p.name}
                  className="h-14 w-14 rounded-lg bg-background object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{p.name}</p>
                  <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {p.maker}
                  </p>
                  {p.price && (
                    <p className="mt-0.5 text-xs text-rust">{p.price}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => onEdit(p)}
                    className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink hover:text-background"
                  >
                    <Pencil size={10} /> Edit
                  </button>
                  <button
                    onClick={() => onRemove(p.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-rust transition-colors hover:bg-rust hover:text-primary-foreground"
                  >
                    <X size={10} /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

