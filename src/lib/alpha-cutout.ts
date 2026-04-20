import { removeBackground } from "@imgly/background-removal";

/**
 * Real, purpose-built background removal. Runs a U²-Net style segmentation
 * model in the browser via @imgly/background-removal and returns a PNG data
 * URL with a true alpha channel — no checkerboard pixels, no flood-fill
 * heuristics. The model weights are fetched from a CDN on first use and
 * cached by the browser, so subsequent calls are fast.
 */
export async function applyAlphaCutout(srcUrl: string): Promise<string> {
  const blob = await removeBackground(srcUrl, {
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