import { removeBackground } from "@imgly/background-removal";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/**
 * Fetch an image through our same-origin edge proxy to bypass cross-origin
 * restrictions on the source site, returning a blob the cutout model can
 * read pixel data from.
 */
async function fetchViaProxy(srcUrl: string): Promise<Blob> {
  // Data URLs and same-origin URLs don't need proxying.
  if (srcUrl.startsWith("data:") || srcUrl.startsWith("blob:")) {
    const r = await fetch(srcUrl);
    return await r.blob();
  }
  if (!SUPABASE_URL) throw new Error("Supabase URL not configured");
  const proxied = `${SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(srcUrl)}`;
  const res = await fetch(proxied);
  if (!res.ok) throw new Error(`Image proxy failed: ${res.status}`);
  return await res.blob();
}

/**
 * Real, purpose-built background removal. Runs a U²-Net style segmentation
 * model in the browser via @imgly/background-removal and returns a PNG data
 * URL with a true alpha channel — no checkerboard pixels, no flood-fill
 * heuristics. The model weights are fetched from a CDN on first use and
 * cached by the browser, so subsequent calls are fast.
 */
export async function applyAlphaCutout(srcUrl: string): Promise<string> {
  // Fetch through our proxy first so the model gets a same-origin blob and
  // doesn't trip over the source site's CORS policy.
  const sourceBlob = await fetchViaProxy(srcUrl);
  const blob = await removeBackground(sourceBlob, {
    output: { format: "image/png", quality: 1 },
  });
  const dataUrl = await blobToDataUrl(blob);
  // Trim transparent padding so each piece's bounding box hugs the subject.
  // This keeps positioning/resizing predictable on the moodboard.
  try {
    return await trimTransparentEdges(dataUrl);
  } catch {
    return dataUrl;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read cutout result."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Crop a PNG data URL to the bounding box of its non-transparent pixels.
 * Uses an alpha threshold so faint shadow halos don't keep the box loose.
 */
export async function trimTransparentEdges(
  dataUrl: string,
  alphaThreshold = 8,
): Promise<string> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return dataUrl;
  }
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);

  let top = h, left = w, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > alphaThreshold) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (right < 0 || bottom < 0) return dataUrl;

  // Tiny 1px breathing room so anti-aliased edges don't get clipped.
  const pad = 1;
  const sx = Math.max(0, left - pad);
  const sy = Math.max(0, top - pad);
  const sw = Math.min(w, right + pad + 1) - sx;
  const sh = Math.min(h, bottom + pad + 1) - sy;

  if (sw === w && sh === h) return dataUrl;

  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  const octx = out.getContext("2d");
  if (!octx) return dataUrl;
  octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return out.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load cutout image"));
    img.src = src;
  });
}