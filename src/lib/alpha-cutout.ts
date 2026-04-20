/**
 * Convert a returned "background-removed" image into one with TRUE alpha
 * transparency. Image generation models often paint a checkerboard pattern
 * (their visual shorthand for "transparent") into the actual pixels, or
 * leave a near-uniform light background. This walks the image from the
 * edges and floods out anything that matches the dominant edge color,
 * turning those pixels into real alpha=0.
 *
 * Returns a PNG data URL with a real alpha channel.
 */
export async function applyAlphaCutout(srcUrl: string): Promise<string> {
  const img = await loadImage(srcUrl);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return srcUrl;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return srcUrl;
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Sample edge pixels to learn the background color(s). Checkerboard
  // backgrounds give us TWO dominant colors (light + slightly darker grey),
  // plain backgrounds give us one. We collect both.
  const samples: Array<[number, number, number]> = [];
  const pushSample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (data[i + 3] < 10) return;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  };
  const step = Math.max(1, Math.floor(Math.min(w, h) / 60));
  for (let x = 0; x < w; x += step) {
    pushSample(x, 0);
    pushSample(x, h - 1);
  }
  for (let y = 0; y < h; y += step) {
    pushSample(0, y);
    pushSample(w - 1, y);
  }
  if (samples.length === 0) return srcUrl;

  // K-means with k=2 to capture checkerboard's two tones (or collapse to one).
  const centroids = kmeans2(samples);

  // Tolerance — generous so soft anti-aliased edges of the checker fade out.
  const tol = 38;

  const matches = (r: number, g: number, b: number) => {
    for (const c of centroids) {
      const dr = r - c[0];
      const dg = g - c[1];
      const db = b - c[2];
      if (dr * dr + dg * dg + db * db <= tol * tol) return true;
    }
    return false;
  };

  // Flood-fill from every edge pixel that matches a background centroid.
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const pushIfBg = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (matches(data[i], data[i + 1], data[i + 2])) {
      visited[idx] = 1;
      stack.push(x, y);
    }
  };
  for (let x = 0; x < w; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIfBg(0, y);
    pushIfBg(w - 1, y);
  }

  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    const i = (y * w + x) * 4;
    data[i + 3] = 0;
    pushIfBg(x + 1, y);
    pushIfBg(x - 1, y);
    pushIfBg(x, y + 1);
    pushIfBg(x, y - 1);
  }

  // Soften the alpha edge: any pixel that still has bg-like color but borders
  // a transparent pixel becomes partially transparent.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (visited[idx]) continue;
      const i = idx * 4;
      if (data[i + 3] === 0) continue;
      const neighborTransparent =
        data[((y - 1) * w + x) * 4 + 3] === 0 ||
        data[((y + 1) * w + x) * 4 + 3] === 0 ||
        data[(y * w + x - 1) * 4 + 3] === 0 ||
        data[(y * w + x + 1) * 4 + 3] === 0;
      if (neighborTransparent && matches(data[i], data[i + 1], data[i + 2])) {
        data[i + 3] = 0;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image for cutout."));
    img.src = src;
  });
}

function kmeans2(
  samples: Array<[number, number, number]>,
): Array<[number, number, number]> {
  // Initialize with the lightest and second-lightest sample to bias toward
  // typical checkerboard tones.
  const sorted = [...samples].sort(
    (a, b) => b[0] + b[1] + b[2] - (a[0] + a[1] + a[2]),
  );
  let c0: [number, number, number] = sorted[0];
  let c1: [number, number, number] =
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.4))];

  for (let iter = 0; iter < 8; iter++) {
    const sum0 = [0, 0, 0];
    const sum1 = [0, 0, 0];
    let n0 = 0;
    let n1 = 0;
    for (const s of samples) {
      const d0 =
        (s[0] - c0[0]) ** 2 + (s[1] - c0[1]) ** 2 + (s[2] - c0[2]) ** 2;
      const d1 =
        (s[0] - c1[0]) ** 2 + (s[1] - c1[1]) ** 2 + (s[2] - c1[2]) ** 2;
      if (d0 <= d1) {
        sum0[0] += s[0];
        sum0[1] += s[1];
        sum0[2] += s[2];
        n0++;
      } else {
        sum1[0] += s[0];
        sum1[1] += s[1];
        sum1[2] += s[2];
        n1++;
      }
    }
    if (n0) c0 = [sum0[0] / n0, sum0[1] / n0, sum0[2] / n0];
    if (n1) c1 = [sum1[0] / n1, sum1[1] / n1, sum1[2] / n1];
  }

  // If the two centroids ended up nearly identical, collapse to one — saves
  // unnecessary tolerance on plain backgrounds.
  const dist =
    (c0[0] - c1[0]) ** 2 + (c0[1] - c1[1]) ** 2 + (c0[2] - c1[2]) ** 2;
  return dist < 25 ? [c0] : [c0, c1];
}