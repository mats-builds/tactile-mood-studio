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
        "URL of the cleanest product image, preferably on a white or transparent background",
    },
    gallery: {
      type: "array",
      items: { type: "string" },
      description: "Up to 4 additional product images (in-context / lifestyle)",
    },
  },
  required: ["name", "image_url"],
};

export const scrapeProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
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
    return {
      ...json,
      sourceUrl: data.url,
    } as Record<string, unknown>;
  });
