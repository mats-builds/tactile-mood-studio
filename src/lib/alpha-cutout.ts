import { removeBackground } from "@imgly/background-removal";
import { supabase } from "@/integrations/supabase/client";

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
  const res = await fetch(proxied, {
    headers: {
      apikey: (supabase as unknown as { supabaseKey?: string }).supabaseKey ?? "",
    },
  });
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
  return await blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read cutout result."));
    reader.readAsDataURL(blob);
  });
}