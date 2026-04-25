import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Firecrawl from "@mendable/firecrawl-js";

const inputSchema = z.object({
  url: z.string().min(1),
});

const productSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "Product name / title" },
    maker: { type: "string", description: "Brand or maker name" },
    price: {
      type: "string",
      description:
        "Current price including currency symbol (e.g. '€ 1,099')",
    },
    description: {
      type: "string",
      description: "Short product description (1–3 sentences)",
    },
    category: {
      type: "string",
      enum: ["Seating", "Tables", "Lighting", "Storage", "Decor", "Textiles", "Art"],
      description: "Best-fit furniture category",
    },
    role: {
      type: "string",
      enum: ["floor", "ground", "surface", "hanging", "standing", "wall", "prop"],
      description:
        "Decorating role — 'floor'=rug, 'ground'=sofa/sideboard, 'surface'=side table/ottoman, 'hanging'=pendant, 'standing'=floor lamp, 'wall'=art/mirror, 'prop'=vase/books",
    },
    width_cm: { type: "number" },
    height_cm: { type: "number" },
    depth_cm: { type: "number" },
    image_url: {
      type: "string",
      description:
        "URL of the cleanest packshot / showcase image of the product — MUST be the version with a plain white, light grey or transparent background (no room scene, no model, no lifestyle context). Pick the one that looks like a catalog cutout. Avoid lifestyle / in-context shots here.",
    },
    gallery: {
      type: "array",
      items: { type: "string" },
      description:
        "Up to 4 additional product images — lifestyle / in-context shots are fine here.",
    },
  },
  required: ["name"],
};

type ScrapedProduct = {
  sourceUrl: string;
  name?: string;
  maker?: string;
  price?: string;
  description?: string;
  category?: string;
  role?: string;
  width_cm?: number;
  height_cm?: number;
  depth_cm?: number;
  image_url?: string;
  gallery?: string[];
};

const IMAGE_URL_RE = /https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|webp|avif)(?:\?[^\s"'<>]*)?/gi;
const IMAGE_ATTR_RE =
  /(?:src|data-src|data-zoom-image|data-image-large-src|data-large_image|data-srcset|srcset|href|content)=["']([^"']+\.(?:png|jpe?g|webp|avif)(?:\?[^"']*)?)["']/gi;
const META_OG_IMAGE_RE =
  /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]+content=["']([^"']+)["']/gi;
const META_OG_IMAGE_ALT_RE =
  /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["']/gi;
const JSONLD_RE =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const TITLE_TAG_RE = /<title[^>]*>([^<]+)<\/title>/i;
const META_OG_TITLE_RE =
  /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i;
const META_OG_DESC_RE =
  /<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i;
const META_OG_SITE_RE =
  /<meta[^>]+(?:property|name)=["']og:site_name["'][^>]+content=["']([^"']+)["']/i;

const BACKGROUND_REMOVAL_CREDITS_ERROR =
  "Background removal is unavailable right now because the image credits are exhausted.";

// ---------- Paint colours (Farrow & Ball) ----------

function isFarrowBallUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)farrow-ball\.com$/i.test(u.hostname) && /\/paint\//i.test(u.pathname);
  } catch {
    return false;
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

function isLightColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // perceived luminance
  return 0.299 * r + 0.587 * g + 0.114 * b > 165;
}

function paintSwatchSvgDataUrl(hex: string, name: string, number?: string): string {
  const ink = isLightColor(hex) ? "#1a1a1a" : "#ffffff";
  const muted = isLightColor(hex) ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.7)";
  const safeName = name.replace(/[<>&]/g, "");
  const safeNum = (number ?? "").replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="${hex}"/>
  <rect x="20" y="20" width="560" height="560" fill="none" stroke="${muted}" stroke-width="1"/>
  <text x="40" y="520" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="${ink}">${safeName}</text>
  ${safeNum ? `<text x="40" y="560" font-family="Inter, system-ui, sans-serif" font-size="22" letter-spacing="2" fill="${muted}">No. ${safeNum} · FARROW &amp; BALL</text>` : `<text x="40" y="560" font-family="Inter, system-ui, sans-serif" font-size="22" letter-spacing="2" fill="${muted}">FARROW &amp; BALL</text>`}
  <text x="560" y="80" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="20" letter-spacing="3" fill="${muted}">${hex}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Extract paint colour info from a Farrow & Ball product page HTML. */
function extractFarrowBallPaint(html: string, url: string): {
  name: string;
  number?: string;
  hex: string;
  description?: string;
} | null {
  // Name: try og:title, then <title>, then derive from URL slug.
  const meta = metaFromHtml(html);
  let name = meta.title?.split("|")[0].split("·")[0].split("—")[0].trim();
  if (name) name = name.replace(/\s*[-–—]\s*Farrow.*/i, "").trim();
  if (!name) {
    try {
      const slug = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
      name = slug
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } catch {
      /* ignore */
    }
  }

  // Number: e.g. "No. 267"
  const numMatch = html.match(/No\.?\s*(\d{1,4})/i);
  const number = numMatch ? numMatch[1] : undefined;

  // Hex extraction — Farrow & Ball pages render the actual paint colour as the
  // background-color of an element with class "paint-page". That is the
  // authoritative source. We try in priority order:
  //   1. background-color on the .paint-page element (rgb or hex)
  //   2. any background-color on a "paint-*" / "product-top" element
  //   3. first non-trivial rgb() in the document
  //   4. first non-trivial #hex in inline styles
  const isMeaningfulRgb = (r: number, g: number, b: number) =>
    !(r === 255 && g === 255 && b === 255) &&
    !(r === 0 && g === 0 && b === 0) &&
    !(r === 1 && g === 1 && b === 1);

  const tryParseColor = (raw: string): string | undefined => {
    const rgbM = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(raw);
    if (rgbM) {
      const r = Number(rgbM[1]), g = Number(rgbM[2]), b = Number(rgbM[3]);
      if (isMeaningfulRgb(r, g, b)) return rgbToHex(r, g, b);
    }
    const hexM = /#([0-9a-fA-F]{6})\b/.exec(raw);
    if (hexM) {
      const v = hexM[1].toUpperCase();
      if (v !== "FFFFFF" && v !== "000000" && v !== "010101") return `#${v}`;
    }
    return undefined;
  };

  let hex: string | undefined;

  // 1) Find any element whose class includes "paint-page" and read its style.
  //    Be tolerant of attribute order: scan opening tags that mention paint-page.
  const tagRe = /<[a-z][^>]*\bclass=["'][^"']*\bpaint-page\b[^"']*["'][^>]*>/gi;
  for (const m of html.matchAll(tagRe)) {
    const tag = m[0];
    const styleM = /style=["']([^"']+)["']/i.exec(tag);
    if (!styleM) continue;
    const bgM = /background(?:-color)?\s*:\s*([^;"']+)/i.exec(styleM[1]);
    if (!bgM) continue;
    const c = tryParseColor(bgM[1]);
    if (c) { hex = c; break; }
  }

  // 2) Other likely product-hero containers as fallback.
  if (!hex) {
    const heroRe = /<[a-z][^>]*\bclass=["'][^"']*\b(?:product-top-info|product-info-main|paint-color|color-swatch-main)\b[^"']*["'][^>]*>/gi;
    for (const m of html.matchAll(heroRe)) {
      const styleM = /style=["']([^"']+)["']/i.exec(m[0]);
      if (!styleM) continue;
      const bgM = /background(?:-color)?\s*:\s*([^;"']+)/i.exec(styleM[1]);
      if (!bgM) continue;
      const c = tryParseColor(bgM[1]);
      if (c) { hex = c; break; }
    }
  }

  // 3) First non-trivial rgb(...) in the whole document.
  if (!hex) {
    const rgbRe = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi;
    for (const m of html.matchAll(rgbRe)) {
      const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
      if (!isMeaningfulRgb(r, g, b)) continue;
      hex = rgbToHex(r, g, b);
      break;
    }
  }

  // 4) Finally fall back to first non-trivial #hex.
  if (!hex) {
    const hexRe = /#([0-9a-fA-F]{6})\b/g;
    for (const m of html.matchAll(hexRe)) {
      const v = m[1].toUpperCase();
      if (v === "FFFFFF" || v === "000000" || v === "010101") continue;
      hex = `#${v}`;
      break;
    }
  }

  console.log("[farrow-ball] extracted", { name, number, hex, urlHost: (() => { try { return new URL(url).host; } catch { return ""; } })() });

  if (!hex || !name) return null;
  return {
    name,
    number,
    hex,
    description: meta.description,
  };
}

function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!url) throw new Error("Please paste a product URL.");
  // Strip surrounding angle brackets / quotes some users paste.
  url = url.replace(/^[<"']+|[>"']+$/g, "");
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    throw new Error("That doesn't look like a valid URL — check for typos.");
  }
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function scoreImageUrl(url: string) {
  const lower = url.toLowerCase();
  let score = 0;

  if (lower.includes("transparent") || lower.includes("packshot") || lower.includes("cutout")) {
    score += 40;
  }
  if (lower.includes("white") || lower.includes("plain")) score += 10;
  if (lower.includes("large_default")) score += 35;
  if (lower.includes("zoom") || lower.includes("_xl") || lower.includes("2048") || lower.includes("1500") || lower.includes("1200")) score += 20;
  if (lower.includes("default")) score += 16;
  if (lower.includes("product")) score += 8;
  if (lower.includes("og-image") || lower.includes("og_image") || lower.includes("share")) score += 12;
  if (lower.includes("gallery")) score -= 2;
  if (
    lower.includes("room") ||
    lower.includes("lifestyle") ||
    lower.includes("ambience") ||
    lower.includes("inspiration")
  ) {
    score -= 30;
  }
  if (
    lower.includes("thumb") ||
    lower.includes("thumbnail") ||
    lower.includes("icon") ||
    lower.includes("favicon") ||
    lower.includes("logo") ||
    lower.includes("swatch") ||
    lower.includes("sprite") ||
    lower.includes("placeholder") ||
    lower.includes("blank") ||
    lower.includes("loading")
  ) {
    score -= 60;
  }

  return score;
}

function absoluteUrl(maybeRelative: string, base: string): string | undefined {
  try {
    return new URL(decodeEntities(maybeRelative), base).toString();
  } catch {
    return undefined;
  }
}

function extractImageUrlsFromHtml(html: string, pageUrl: string) {
  const matches = new Set<string>();

  for (const match of html.matchAll(IMAGE_URL_RE)) {
    matches.add(decodeEntities(match[0]));
  }
  for (const match of html.matchAll(IMAGE_ATTR_RE)) {
    // srcset can contain multiple URLs separated by commas; grab each.
    const raw = match[1];
    for (const piece of raw.split(",")) {
      const u = piece.trim().split(/\s+/)[0];
      const abs = absoluteUrl(u, pageUrl);
      if (abs) matches.add(abs);
    }
  }
  for (const match of html.matchAll(META_OG_IMAGE_RE)) {
    const abs = absoluteUrl(match[1], pageUrl);
    if (abs) matches.add(abs);
  }
  for (const match of html.matchAll(META_OG_IMAGE_ALT_RE)) {
    const abs = absoluteUrl(match[1], pageUrl);
    if (abs) matches.add(abs);
  }

  return Array.from(matches).filter((url) => scoreImageUrl(url) > -50);
}

type JsonLdProduct = {
  name?: string;
  brand?: string;
  description?: string;
  image?: string[];
  price?: string;
};

function walkJsonLd(node: unknown, out: JsonLdProduct[]) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) walkJsonLd(item, out);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  const isProduct =
    t === "Product" ||
    (Array.isArray(t) && t.includes("Product")) ||
    typeof obj.sku === "string" ||
    typeof obj.gtin === "string";
  if (isProduct) {
    const images: string[] = [];
    const img = obj.image;
    if (typeof img === "string") images.push(img);
    else if (Array.isArray(img)) {
      for (const i of img) {
        if (typeof i === "string") images.push(i);
        else if (i && typeof i === "object" && typeof (i as { url?: unknown }).url === "string") {
          images.push((i as { url: string }).url);
        }
      }
    } else if (img && typeof img === "object" && typeof (img as { url?: unknown }).url === "string") {
      images.push((img as { url: string }).url);
    }
    let brand: string | undefined;
    const b = obj.brand;
    if (typeof b === "string") brand = b;
    else if (b && typeof b === "object" && typeof (b as { name?: unknown }).name === "string") {
      brand = (b as { name: string }).name;
    }
    let price: string | undefined;
    const offers = obj.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const firstOffer = Array.isArray(offers) ? offers[0] : offers;
    if (firstOffer && typeof firstOffer === "object") {
      const p = firstOffer.price ?? firstOffer.lowPrice;
      const cur = firstOffer.priceCurrency;
      if (p !== undefined) price = `${cur ? `${cur} ` : ""}${p}`.trim();
    }
    out.push({
      name: typeof obj.name === "string" ? obj.name : undefined,
      brand,
      description: typeof obj.description === "string" ? obj.description : undefined,
      image: images,
      price,
    });
  }
  for (const v of Object.values(obj)) walkJsonLd(v, out);
}

function extractJsonLdProducts(html: string): JsonLdProduct[] {
  const products: JsonLdProduct[] = [];
  for (const m of html.matchAll(JSONLD_RE)) {
    const raw = m[1].trim();
    try {
      const parsed = JSON.parse(raw);
      walkJsonLd(parsed, products);
    } catch {
      /* malformed JSON-LD — skip */
    }
  }
  return products;
}

type FetchedPage = { html: string; finalUrl: string };

async function fetchPage(url: string): Promise<FetchedPage | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { html, finalUrl: response.url || url };
  } catch {
    return null;
  }
}

function metaFromHtml(html: string) {
  const title =
    html.match(META_OG_TITLE_RE)?.[1] ||
    html.match(TITLE_TAG_RE)?.[1] ||
    undefined;
  const desc = html.match(META_OG_DESC_RE)?.[1];
  const site = html.match(META_OG_SITE_RE)?.[1];
  return {
    title: title ? decodeEntities(title).trim() : undefined,
    description: desc ? decodeEntities(desc).trim() : undefined,
    site: site ? decodeEntities(site).trim() : undefined,
  };
}

async function removeBackground(imageUrl: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return undefined;

  const candidates: string[] = [];
  if (/^data:/i.test(imageUrl)) {
    candidates.push(imageUrl);
  } else if (/^https?:\/\//i.test(imageUrl)) {
    try {
      const imgRes = await fetch(imageUrl, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
        },
      });
      if (imgRes.ok) {
        const buf = new Uint8Array(await imgRes.arrayBuffer());
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < buf.length; i += chunk) {
          binary += String.fromCharCode(...buf.subarray(i, i + chunk));
        }
        const b64 = btoa(binary);
        const ct =
          imgRes.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ||
          "";
        let mime = ct || "image/jpeg";
        if (buf[0] === 0xff && buf[1] === 0xd8) mime = "image/jpeg";
        else if (buf[0] === 0x89 && buf[1] === 0x50) mime = "image/png";
        else if (buf[0] === 0x52 && buf[1] === 0x49) mime = "image/webp";
        candidates.push(`data:${mime};base64,${b64}`);
        if (mime === "image/webp") {
          candidates.push(`data:image/png;base64,${b64}`);
          candidates.push(`data:image/jpeg;base64,${b64}`);
        }
      }
    } catch {
      /* ignore — will fall back to remote url */
    }
    candidates.push(imageUrl);
  } else {
    return undefined;
  }

  for (const inlineUrl of candidates) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    "Isolate the main furniture product in this image and place it on a fully transparent background. Erase EVERYTHING else: the floor, walls, room, props, shadows, gradients and any backdrop colour. Keep the product pixel-accurate — same shape, proportions, materials, colours, perspective and lighting. Do not redraw, restyle or add elements. Return a clean catalog packshot PNG with an alpha channel.",
                },
                {
                  type: "image_url",
                  image_url: { url: inlineUrl },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error(BACKGROUND_REMOVAL_CREDITS_ERROR);
        }
        console.error(
          "removeBackground http error",
          response.status,
          await response.text().catch(() => ""),
        );
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            images?: Array<{ image_url?: { url?: string } }>;
          };
        }>;
      };

      const cleaned = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (typeof cleaned === "string" && cleaned.length > 0) {
        return cleaned;
      }
      console.warn("removeBackground returned no image, trying next candidate");
    } catch (err) {
      console.error("removeBackground error", err);
    }
  }
  return undefined;
}

async function tryFirecrawlJson(url: string, apiKey: string) {
  const firecrawl = new Firecrawl({ apiKey });
  try {
    const result = await firecrawl.scrape(url, {
      formats: [{ type: "json", schema: productSchema } as never],
      onlyMainContent: true,
    });
    const json =
      (result as { json?: Record<string, unknown> }).json ??
      (result as { data?: { json?: Record<string, unknown> } }).data?.json;
    return (json as Record<string, unknown>) ?? null;
  } catch (err) {
    console.warn("firecrawl json scrape failed", err);
    return null;
  }
}

async function tryFirecrawlHtml(url: string, apiKey: string) {
  const firecrawl = new Firecrawl({ apiKey });
  try {
    // rawHtml preserves inline styles (e.g. background-color on .paint-page)
    // which the cleaned `html` format strips out.
    const result = await firecrawl.scrape(url, {
      formats: ["rawHtml", "html"],
    });
    const raw =
      (result as { rawHtml?: string }).rawHtml ??
      (result as { data?: { rawHtml?: string } }).data?.rawHtml;
    const html =
      (result as { html?: string }).html ??
      (result as { data?: { html?: string } }).data?.html;
    return (typeof raw === "string" && raw) || (typeof html === "string" ? html : null);
  } catch (err) {
    console.warn("firecrawl html scrape failed", err);
    return null;
  }
}

export const scrapeProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ScrapedProduct> => {
    const sourceUrl = normalizeUrl(data.url);
    const apiKey = process.env.FIRECRAWL_API_KEY;

    // ---- Farrow & Ball paint colour fast-path ----
    if (isFarrowBallUrl(sourceUrl)) {
      // Try both direct fetch and Firecrawl rawHtml in parallel — whichever
      // contains the .paint-page inline-style swatch wins.
      const [direct, fcHtml] = await Promise.all([
        fetchPage(sourceUrl),
        apiKey ? tryFirecrawlHtml(sourceUrl, apiKey) : Promise.resolve(null),
      ]);
      const candidates: Array<{ html: string; finalUrl: string; source: string }> = [];
      if (direct?.html) candidates.push({ html: direct.html, finalUrl: direct.finalUrl, source: "direct" });
      if (fcHtml) candidates.push({ html: fcHtml, finalUrl: sourceUrl, source: "firecrawl" });

      // Score: prefer candidates that actually contain "paint-page".
      candidates.sort((a, b) => {
        const aHas = /paint-page/i.test(a.html) ? 1 : 0;
        const bHas = /paint-page/i.test(b.html) ? 1 : 0;
        return bHas - aHas;
      });

      for (const cand of candidates) {
        const paint = extractFarrowBallPaint(cand.html, cand.finalUrl);
        if (paint) {
          console.log("[farrow-ball] using source", cand.source);
          const swatch = paintSwatchSvgDataUrl(paint.hex, paint.name, paint.number);
          const fullName = paint.number ? `${paint.name} · No. ${paint.number}` : paint.name;
          return {
            sourceUrl: cand.finalUrl,
            name: fullName,
            maker: "Farrow & Ball",
            price: paint.hex,
            description:
              paint.description ??
              `Farrow & Ball paint colour ${paint.name}${paint.number ? ` (No. ${paint.number})` : ""} — ${paint.hex}.`,
            category: "Decor",
            role: "wall",
            width_cm: 60,
            height_cm: 60,
            image_url: swatch,
            gallery: undefined,
          };
        }
      }
      // If extraction failed, fall through to generic flow below.
    }

    // Run direct fetch and Firecrawl JSON in parallel — direct fetch gives us
    // og:image / JSON-LD even if Firecrawl times out or extracts nothing.
    const [directPage, firecrawlJson] = await Promise.all([
      fetchPage(sourceUrl),
      apiKey ? tryFirecrawlJson(sourceUrl, apiKey) : Promise.resolve(null),
    ]);

    let html = directPage?.html ?? "";
    const finalUrl = directPage?.finalUrl ?? sourceUrl;

    // If direct fetch was blocked (403/empty), try Firecrawl HTML as fallback.
    if (!html && apiKey) {
      const fc = await tryFirecrawlHtml(sourceUrl, apiKey);
      if (fc) html = fc;
    }

    const jsonLd = html ? extractJsonLdProducts(html) : [];
    const meta = html ? metaFromHtml(html) : { title: undefined, description: undefined, site: undefined };
    const pageImages = html ? extractImageUrlsFromHtml(html, finalUrl) : [];
    const ldImages = jsonLd.flatMap((p) => p.image ?? []);

    const str = (v: unknown): string | undefined =>
      typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
    const num = (v: unknown): number | undefined =>
      typeof v === "number" && Number.isFinite(v) ? v : undefined;

    // Merge sources with priority: Firecrawl JSON > JSON-LD > meta tags > URL host.
    const fcJson = firecrawlJson ?? {};
    const firstLd = jsonLd[0];
    const hostname = (() => {
      try { return new URL(finalUrl).hostname.replace(/^www\./, ""); } catch { return undefined; }
    })();

    const name =
      str(fcJson.name) ?? str(firstLd?.name) ?? str(meta.title);
    const maker =
      str(fcJson.maker) ?? str(firstLd?.brand) ?? str(meta.site) ?? hostname;
    const description =
      str(fcJson.description) ?? str(firstLd?.description) ?? str(meta.description);
    const price = str(fcJson.price) ?? str(firstLd?.price);

    const firecrawlShowcase = str(fcJson.image_url);
    const firecrawlGallery = Array.isArray(fcJson.gallery)
      ? (fcJson.gallery as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

    const allImages = uniqueStrings([
      firecrawlShowcase,
      ...ldImages,
      ...firecrawlGallery,
      ...pageImages,
    ])
      .map((u) => absoluteUrl(u, finalUrl) ?? u)
      .sort((a, b) => scoreImageUrl(b) - scoreImageUrl(a));

    const showcaseImage = allImages[0];

    if (!name && !showcaseImage) {
      throw new Error(
        "Couldn't read that page. It may require login, block scrapers, or not be a product page. Try a different URL.",
      );
    }
    if (!name) {
      throw new Error(
        "Found images but no product name on that page. Try the main product page URL.",
      );
    }

    // Background removal is opt-in: the user triggers it per-image from the
    // edit dialog so they can choose which photo to clean up.
    const gallery = uniqueStrings([
      ...firecrawlGallery,
      ...allImages.filter((url) => url !== showcaseImage),
    ]).slice(0, 8);

    return {
      sourceUrl: finalUrl,
      name,
      maker,
      price,
      description,
      category: str(fcJson.category),
      role: str(fcJson.role),
      width_cm: num(fcJson.width_cm),
      height_cm: num(fcJson.height_cm),
      depth_cm: num(fcJson.depth_cm),
      image_url: showcaseImage,
      gallery: gallery.length > 0 ? gallery : undefined,
    };
  });

const removeBgInputSchema = z.object({
  imageUrl: z.string().url(),
});

export const removeImageBackground = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => removeBgInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ image: string | null }> => {
    const cleaned = await removeBackground(data.imageUrl);
    return { image: cleaned ?? null };
  });
