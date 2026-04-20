import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Firecrawl from "@mendable/firecrawl-js";

const inputSchema = z.object({
  url: z.string().url(),
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
  required: ["name", "image_url"],
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
  /(?:src|data-src|data-zoom-image|data-image-large-src|href)=["']([^"']+\.(?:png|jpe?g|webp|avif)(?:\?[^"']*)?)["']/gi;

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
  if (lower.includes("default")) score += 16;
  if (lower.includes("product")) score += 8;
  if (lower.includes("gallery")) score -= 2;
  if (lower.includes("/wk/")) score -= 6;
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
    lower.includes("promo")
  ) {
    score -= 40;
  }

  return score;
}

function extractImageUrlsFromHtml(html: string, pageUrl: string) {
  const matches = new Set<string>();

  for (const match of html.matchAll(IMAGE_URL_RE)) {
    matches.add(match[0].replace(/&amp;/g, "&"));
  }

  for (const match of html.matchAll(IMAGE_ATTR_RE)) {
    try {
      matches.add(new URL(match[1].replace(/&amp;/g, "&"), pageUrl).toString());
    } catch {
      /* ignore invalid image urls */
    }
  }

  return Array.from(matches).filter((url) => scoreImageUrl(url) > -20);
}

async function fetchPageImages(url: string) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; MOODS/1.0)" },
    });
    if (!response.ok) return [];
    const html = await response.text();
    return extractImageUrlsFromHtml(html, url);
  } catch {
    return [];
  }
}

async function removeBackground(imageUrl: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return undefined;

  try {
    // Gemini image-edit is much more reliable when the source is sent inline
    // as a base64 data URL than as a remote URL (many CDNs block its fetcher).
    let inlineUrl = imageUrl;
    if (/^https?:\/\//i.test(imageUrl)) {
      try {
        const imgRes = await fetch(imageUrl, {
          headers: { "user-agent": "Mozilla/5.0 (compatible; MOODS/1.0)" },
        });
        if (imgRes.ok) {
          const buf = new Uint8Array(await imgRes.arrayBuffer());
          // base64 encode
          let binary = "";
          for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
          const b64 = btoa(binary);
          const mime =
            imgRes.headers.get("content-type")?.split(";")[0]?.trim() ||
            "image/jpeg";
          inlineUrl = `data:${mime};base64,${b64}`;
        }
      } catch {
        /* fall back to original URL */
      }
    }

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
      console.error("removeBackground failed", response.status, await response.text().catch(() => ""));
      return undefined;
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          images?: Array<{ image_url?: { url?: string } }>;
        };
      }>;
    };

    const cleaned = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return typeof cleaned === "string" ? cleaned : undefined;
  } catch (err) {
    console.error("removeBackground error", err);
    return undefined;
  }
}

export const scrapeProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ScrapedProduct> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }
    const firecrawl = new Firecrawl({ apiKey });
    const result = await firecrawl.scrape(data.url, {
      formats: [
        { type: "json", schema: productSchema } as never,
      ],
      onlyMainContent: true,
    });
    const json =
      (result as { json?: Record<string, unknown> }).json ??
      (result as { data?: { json?: Record<string, unknown> } }).data?.json;
    if (!json || !json.name || !json.image_url) {
      throw new Error("Could not extract product info from this page");
    }
    const str = (v: unknown): string | undefined =>
      typeof v === "string" ? v : undefined;
    const num = (v: unknown): number | undefined =>
      typeof v === "number" && Number.isFinite(v) ? v : undefined;
    const firecrawlShowcase = str(json.image_url);
    const firecrawlGallery = Array.isArray(json.gallery)
      ? (json.gallery as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const pageImages = await fetchPageImages(data.url);
    const allImages = uniqueStrings([...pageImages, firecrawlShowcase, ...firecrawlGallery]).sort(
      (a, b) => scoreImageUrl(b) - scoreImageUrl(a),
    );
    const showcaseImage = allImages[0] ?? firecrawlShowcase;
    const cleanedShowcase = showcaseImage
      ? await removeBackground(showcaseImage)
      : undefined;
    const gallery = uniqueStrings([
      ...firecrawlGallery,
      ...allImages.filter((url) => url !== showcaseImage),
    ]).slice(0, 8);

    return {
      sourceUrl: data.url,
      name: str(json.name),
      maker: str(json.maker),
      price: str(json.price),
      description: str(json.description),
      category: str(json.category),
      role: str(json.role),
      width_cm: num(json.width_cm),
      height_cm: num(json.height_cm),
      depth_cm: num(json.depth_cm),
      image_url: cleanedShowcase ?? showcaseImage,
      gallery: gallery.length > 0 ? gallery : undefined,
    };
  });
