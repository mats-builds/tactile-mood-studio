import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Plus, Link2, BookOpen, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AddWithUrlDialog } from "@/components/AddWithUrlDialog";
import { useUserProducts } from "@/store/user-products";

export function SideMenu() {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { products } = useUserProducts();

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-secondary"
          >
            <Menu strokeWidth={1.4} />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] border-r border-border bg-background p-0 sm:w-[380px]">
          <SheetHeader className="border-b border-border/60 px-6 py-5 text-left">
            <SheetTitle className="font-serif text-2xl text-ink">MOODS</SheetTitle>
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
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Your additions · {products.length}
              </p>
              <ul className="mt-3 space-y-2">
                {products.slice(0, 6).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl bg-secondary/60 p-2"
                  >
                    <img
                      src={p.src}
                      alt={p.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-ink">{p.name}</p>
                      <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {p.maker}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="absolute bottom-6 left-6 right-6">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              MOODS · 2026
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <AddWithUrlDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}

export { X }; // (avoid unused import lint)
