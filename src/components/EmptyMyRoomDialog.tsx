import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, Sparkles, X, ImageIcon, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { emptyRoom } from "@/server/empty-room";
import { userRoomsStore } from "@/store/user-rooms";

type Status = "idle" | "reading" | "generating" | "done" | "error";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

/** Downscale so the upload to the AI is fast and well within payload limits. */
async function downscale(dataUrl: string, maxSide = 1280): Promise<string> {
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
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function EmptyMyRoomDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** called with the new scene id after the room is generated and saved */
  onCreated?: (sceneId: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [emptiedUrl, setEmptiedUrl] = useState<string | null>(null);
  const [name, setName] = useState<string>("My room");
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setStatus("idle");
    setError(null);
    setOriginalUrl(null);
    setEmptiedUrl(null);
    setName("My room");
    setDragOver(false);
  }

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please upload a JPG, PNG or WEBP image.");
      setStatus("error");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large — please use a photo under 8MB.");
      setStatus("error");
      return;
    }
    try {
      setStatus("reading");
      const raw = await fileToDataUrl(file);
      const compact = await downscale(raw, 1280);
      setOriginalUrl(compact);
      setStatus("generating");

      const result = await emptyRoom({ data: { imageDataUrl: compact } });
      setEmptiedUrl(result.imageDataUrl);
      setStatus("done");
    } catch (err) {
      console.error("empty-room failed", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong processing that photo.",
      );
      setStatus("error");
    }
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function saveAndUse() {
    if (!emptiedUrl) return;
    const room = userRoomsStore.add({
      name: name.trim() || "My room",
      src: emptiedUrl,
      originalSrc: originalUrl ?? undefined,
    });
    onCreated?.(room.id);
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl border-border bg-background p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="font-serif text-2xl text-ink">
            Use your own room as a backdrop
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Upload a photo of your living room or bedroom — our AI will quietly
            remove the furniture so you can see how new pieces would look in
            <em> your </em>actual space.
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
                    Drop a photo of your room
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG or WEBP · up to 8MB · landscape works best
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs uppercase tracking-[0.18em] text-background"
                >
                  <ImageIcon size={14} /> Choose photo
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
          ) : status === "reading" || status === "generating" ? (
            <div className="space-y-4">
              {originalUrl && (
                <div className="overflow-hidden rounded-2xl bg-secondary">
                  <img
                    src={originalUrl}
                    alt="Your room"
                    className="h-72 w-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                <Loader2 size={18} className="shrink-0 animate-spin text-rust" />
                <div className="text-sm text-ink">
                  {status === "reading"
                    ? "Reading your photo…"
                    : "Removing the furniture — this can take 20–60 seconds…"}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                We're keeping the floor, walls, ceiling, windows and stairs
                exactly where they are, and clearing out the movable pieces.
              </p>
            </div>
          ) : (
            // status === "done"
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {originalUrl && (
                  <div className="overflow-hidden rounded-2xl bg-secondary">
                    <p className="px-3 pt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Before
                    </p>
                    <img
                      src={originalUrl}
                      alt="Your room"
                      className="h-56 w-full object-cover"
                    />
                  </div>
                )}
                {emptiedUrl && (
                  <div className="overflow-hidden rounded-2xl bg-secondary ring-2 ring-rust/40">
                    <p className="px-3 pt-2 text-[10px] uppercase tracking-[0.2em] text-rust">
                      After
                    </p>
                    <img
                      src={emptiedUrl}
                      alt="Emptied room"
                      className="h-56 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                <Sparkles size={18} className="shrink-0 text-rust" />
                <div className="flex-1 text-sm text-ink">
                  Looks good? Save it as a backdrop and start placing pieces.
                </div>
              </div>

              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Name this room
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                  placeholder="My living room"
                />
              </label>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.18em] text-foreground hover:bg-secondary"
                >
                  <X size={14} /> Try another photo
                </button>
                <button
                  onClick={saveAndUse}
                  className="inline-flex items-center gap-2 rounded-full bg-rust px-5 py-2 text-xs uppercase tracking-[0.18em] text-primary-foreground hover:scale-[1.02]"
                >
                  <Check size={14} /> Use this backdrop
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}