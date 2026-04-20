import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, Sparkles, X, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { matchFromImage } from "@/server/match-from-image";
import { catalog } from "@/data/catalog";
import { useUserProducts } from "@/store/user-products";
import { useSelection } from "@/store/selection";

type Status = "idle" | "reading" | "analyzing" | "error";

const MAX_BYTES = 6 * 1024 * 1024; // 6MB

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

/** Downscale an image data URL so the upload to the AI is fast. */
async function downscale(dataUrl: string, maxSide = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function MatchFromImageDialog({
  open,
  onOpenChange,
  onMatched,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** called after the moodboard has been seeded with matched ids */
  onMatched?: () => void;
}) {
  const { products: userProducts } = useUserProducts();
  const { setAll } = useSelection();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [vibe, setVibe] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setStatus("idle");
    setError(null);
    setPreviewUrl(null);
    setVibe("");
    setDragOver(false);
  }

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Please upload a JPG, PNG or WEBP image.");
        setStatus("error");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Image is too large — please use an image under 6MB.");
        setStatus("error");
        return;
      }
      try {
        setStatus("reading");
        const raw = await fileToDataUrl(file);
        const compact = await downscale(raw, 1024);
        setPreviewUrl(compact);
        setStatus("analyzing");
        setVibe("Analyzing the vibe…");

        const candidates = [
          ...userProducts.map((p) => ({
            id: p.id,
            name: p.name,
            maker: p.maker,
            category: p.category,
            role: p.role,
            colors: p.colors,
          })),
          ...catalog.map((p) => ({
            id: p.id,
            name: p.name,
            maker: p.maker,
            category: p.category,
            role: p.role,
            colors: p.colors,
          })),
        ];

        const result = await matchFromImage({
          data: { imageDataUrl: compact, candidates },
        });

        setVibe(result.vibe || "Matched.");
        setAll(result.ids);
        // Small UX beat so the user sees the vibe text before navigating
        setTimeout(() => {
          onMatched?.();
          onOpenChange(false);
          reset();
        }, 600);
      } catch (err) {
        console.error("match-from-image failed", err);
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong analyzing that image.",
        );
        setStatus("error");
      }
    },
    [userProducts, setAll, onMatched, onOpenChange],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
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
            Match from an image
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Upload a Pinterest or Instagram screenshot — our AI reads the vibe
            and composes a moodboard from real products you can buy.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          {status === "idle" || status === "error" ? (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragOver
                    ? "border-ink bg-secondary"
                    : "border-border hover:border-foreground/40"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <Upload size={20} className="text-foreground/70" />
                </div>
                <div>
                  <p className="font-serif text-lg text-ink">
                    Drop a reference image
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG or WEBP · up to 6MB
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs uppercase tracking-[0.18em] text-background"
                >
                  <ImageIcon size={14} /> Choose image
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
              {error && (
                <p className="mt-3 rounded-xl bg-rust/10 px-3 py-2 text-xs text-rust">
                  {error}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {previewUrl && (
                <div className="overflow-hidden rounded-2xl bg-secondary">
                  <img
                    src={previewUrl}
                    alt="Reference"
                    className="h-56 w-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                {status === "analyzing" || status === "reading" ? (
                  <Loader2 size={18} className="shrink-0 animate-spin text-rust" />
                ) : (
                  <Sparkles size={18} className="shrink-0 text-rust" />
                )}
                <div className="text-sm text-ink">
                  {status === "reading"
                    ? "Reading your image…"
                    : status === "analyzing"
                      ? vibe || "Matching products to the vibe…"
                      : vibe}
                </div>
              </div>
              <button
                onClick={() => {
                  reset();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm text-ink hover:bg-secondary"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}