import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles, Star, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useUserProducts } from "@/store/user-products";
import { removeImageBackground } from "@/server/scrape-product";
import type { Product } from "@/data/catalog";

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { update, removeImage, error, clearError } = useUserProducts();
  const [name, setName] = useState("");
  const [maker, setMaker] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [bgBusy, setBgBusy] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setMaker(product.maker);
      setPrice(product.price);
      setDescription(product.description ?? "");
      setBgError(null);
    }
  }, [product]);

  if (!product) return null;

  const allImages = [product.src, ...(product.gallery ?? [])].filter(Boolean);

  function handleSave() {
    if (!product) return;
    update(product.id, {
      name: name.trim() || product.name,
      maker: maker.trim() || product.maker,
      price: price.trim() || product.price,
      description: description.trim() || undefined,
    });
    onOpenChange(false);
  }

  function makePrimary(url: string) {
    if (!product || url === product.src) return;
    const rest = allImages.filter((i) => i !== url);
    update(product.id, { src: url, gallery: rest });
  }

  async function rerunBackground(url: string) {
    if (!product) return;
    setBgBusy(url);
    setBgError(null);
    try {
      const { image } = await removeImageBackground({ data: { imageUrl: url } });
      if (!image) {
        setBgError("Couldn't remove the background. Try a different image.");
        return;
      }
      // Replace this image in src or gallery, preserving order.
      if (url === product.src) {
        update(product.id, { src: image });
      } else {
        const gallery = (product.gallery ?? []).map((g) => (g === url ? image : g));
        update(product.id, { gallery });
      }
    } catch (err) {
      console.error(err);
      setBgError(
        err instanceof Error ? err.message : "Background removal failed.",
      );
    } finally {
      setBgBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-background p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="font-serif text-2xl text-ink">
            Edit listing
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Adjust the text or remove images you don&rsquo;t want.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {(error || bgError) && (
            <div className="flex items-start justify-between gap-3 rounded-xl bg-rust/10 px-3 py-2 text-xs text-rust">
              <span>{bgError ?? error}</span>
              <button
                onClick={() => {
                  setBgError(null);
                  clearError();
                }}
                className="shrink-0 opacity-70 hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          )}
          {allImages.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Images · {allImages.length}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {allImages.map((src) => {
                  const isPrimary = src === product.src;
                  const isBusy = bgBusy === src;
                  return (
                    <div
                      key={src}
                      className={`group relative overflow-hidden rounded-xl bg-secondary ring-1 ${
                        isPrimary ? "ring-ink" : "ring-border"
                      }`}
                    >
                      <img
                        src={src}
                        alt=""
                        className="aspect-square w-full object-contain p-2"
                      />
                      {isBusy && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                          <Loader2 size={18} className="animate-spin text-ink" />
                        </div>
                      )}
                      {isPrimary && (
                        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-background">
                          <Star size={9} /> Main
                        </span>
                      )}
                      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title="Re-run background removal"
                          disabled={isBusy}
                          onClick={() => rerunBackground(src)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-ink shadow-sm hover:bg-ink hover:text-background disabled:opacity-50"
                        >
                          <Sparkles size={11} />
                        </button>
                        {!isPrimary && (
                          <button
                            type="button"
                            title="Set as main image"
                            onClick={() => makePrimary(src)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-ink shadow-sm hover:bg-ink hover:text-background"
                          >
                            <Star size={11} />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Delete image"
                          onClick={() => removeImage(product.id, src)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-rust shadow-sm hover:bg-rust hover:text-primary-foreground"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <Sparkles size={9} className="mr-1 inline" /> Re-run cutout · <Star size={9} className="mx-1 inline" /> Set main · <Trash2 size={9} className="mx-1 inline" /> Delete
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </Field>
            <Field label="Maker">
              <input
                value={maker}
                onChange={(e) => setMaker(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </Field>
            <Field label="Price">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border/60 px-6 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm text-ink hover:bg-secondary"
          >
            <X size={14} /> Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rust px-4 py-3 text-sm text-primary-foreground hover:scale-[1.01]"
          >
            <Check size={14} /> Save changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}