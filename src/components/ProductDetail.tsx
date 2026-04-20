import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Check, Plus, ExternalLink, X } from "lucide-react";
import { type Product } from "@/data/catalog";

type Props = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: boolean;
  onToggle: (id: string) => void;
};

export function ProductDetail({ product, open, onOpenChange, selected, onToggle }: Props) {
  const [active, setActive] = useState(0);
  if (!product) return null;
  const images = [product.src, ...(product.gallery ?? [])];
  const current = images[active] ?? product.src;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setActive(0);
      }}
    >
      <DialogContent className="max-w-5xl gap-0 overflow-hidden border-border bg-background p-0 sm:rounded-3xl">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-background/95 text-ink ring-1 ring-border backdrop-blur transition-colors hover:bg-ink hover:text-background"
        >
          <X size={16} />
        </button>

        <div className="grid max-h-[88vh] grid-cols-1 overflow-hidden md:grid-cols-[1.15fr_1fr]">
          {/* GALLERY */}
          <div className="relative flex flex-col bg-secondary/40">
            <div className="relative flex flex-1 items-center justify-center p-8">
              <img
                key={current}
                src={current}
                alt={product.name}
                className="max-h-[58vh] w-full object-contain"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 border-t border-border/60 bg-background/40 px-6 py-4">
                {images.map((src, i) => (
                  <button
                    key={src + i}
                    onClick={() => setActive(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 transition-all ${
                      i === active
                        ? "ring-ink"
                        : "ring-border hover:ring-foreground/40"
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="flex flex-col overflow-y-auto px-8 py-10 md:px-10">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {product.category} · {product.maker}
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-ink">
              {product.name}
            </h2>
            <p className="mt-3 font-serif text-2xl text-rust">{product.price}</p>

            {product.description && (
              <p className="mt-6 text-sm leading-relaxed text-foreground/80">
                {product.description}
              </p>
            )}

            {product.details && (
              <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border/60 pt-6">
                {Object.entries(product.details).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {k}
                    </dt>
                    <dd className="mt-0.5 font-serif text-base text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-auto flex items-center gap-3 pt-8">
              <button
                onClick={() => onToggle(product.id)}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-transform hover:scale-[1.02] ${
                  selected
                    ? "bg-ink text-background"
                    : "bg-rust text-primary-foreground"
                }`}
              >
                {selected ? <Check size={16} /> : <Plus size={16} />}
                {selected ? "Added to board" : "Add to board"}
              </button>
              {product.sourceUrl && (
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View source"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-ink transition-colors hover:bg-secondary"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
