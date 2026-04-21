// Bulk Import edge function
// 1) Uses Firecrawl /v2/map to discover product URLs under a category page
// 2) For each URL: scrape (markdown + html) and extract structured product details with Lovable AI (tool call)
// 3) Inserts/updates rows in public.products with status='pending'
// 4) Streams progress via the import_jobs row (counters update live; UI subscribes via Realtime)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

type ExtractedProduct = {
  name: string;
  maker?: string;
  price?: number;
  currency?: string;
  category?: string;
  image_url?: string;
  description?: string;
  specs?: Record<string, string>;
};

async function firecrawlMap(url: string, limit: number): Promise<string[]> {
  const res = await fetch("https://api.firecrawl.dev/v2/map", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      limit: Math.max(limit * 10, 200),
      includeSubdomains: false,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl map failed [${res.status}]: ${t}`);
  }
  const data = await res.json();
  // Firecrawl v2 may return links as strings or as { url, title, description } objects.
  const rawLinks: unknown[] =
    data?.links ?? data?.data?.links ?? data?.data ?? [];
  const links: string[] = rawLinks
    .map((l) => (typeof l === "string" ? l : (l as { url?: string })?.url))
    .filter((u): u is string => typeof u === "string");

  // Normalize the source URL so we can compare paths.
  let sourceUrl: URL | null = null;
  try {
    sourceUrl = new URL(url);
  } catch {
    /* ignore */
  }
  const sourcePath = sourceUrl?.pathname.replace(/\/+$/, "") ?? "";
  const sourceSegments = sourcePath.split("/").filter(Boolean);

  // Filter out obvious non-product URLs, then prefer links that go DEEPER
  // than the category page itself (a product detail page lives below the
  // category in the URL tree on most ecommerce sites).
  const candidates = links.filter((u) => {
    if (u === url) return false;
    let parsed: URL;
    try {
      parsed = new URL(u);
    } catch {
      return false;
    }
    if (sourceUrl && parsed.hostname !== sourceUrl.hostname) return false;
    const lower = parsed.pathname.toLowerCase();
    if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|zip|css|js|xml|ico)(\?|$)/.test(lower)) return false;
    // Skip common non-product sections.
    if (/\/(cart|checkout|account|login|register|wishlist|search|contact|about|blog|news|faq|service|customer|terms|privacy|policy|sitemap|inspiratie|merken?|brands?|stores?|winkels?)(\/|$)/.test(lower)) return false;
    return true;
  });

  // Prefer URLs that live UNDER the category path and have at least one
  // additional segment (the product slug).
  const deeper = candidates.filter((u) => {
    try {
      const p = new URL(u).pathname.replace(/\/+$/, "");
      const segs = p.split("/").filter(Boolean);
      if (sourceSegments.length > 0) {
        const startsWithSource = sourceSegments.every(
          (s, i) => segs[i]?.toLowerCase() === s.toLowerCase(),
        );
        return startsWithSource && segs.length > sourceSegments.length;
      }
      return segs.length >= 2;
    } catch {
      return false;
    }
  });

  const chosen = deeper.length > 0 ? deeper : candidates;
  return Array.from(new Set(chosen)).slice(0, limit);
}

async function firecrawlScrape(url: string): Promise<{ markdown: string; html: string; metadata: Record<string, unknown> }> {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html"],
      onlyMainContent: true,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Firecrawl scrape failed [${res.status}]: ${t}`);
  }
  const data = await res.json();
  const payload = data?.data ?? data;
  return {
    markdown: payload?.markdown ?? "",
    html: payload?.html ?? "",
    metadata: payload?.metadata ?? {},
  };
}

function pickHeroImage(html: string, metadata: Record<string, unknown>): string | undefined {
  const og = metadata?.["ogImage"] as string | undefined;
  if (og) return og;
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (m) return m[1];
  const img = html.match(/<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp))[^"']*["']/i);
  return img?.[1];
}

async function extractWithAI(args: {
  url: string;
  markdown: string;
  heroImage?: string;
}): Promise<ExtractedProduct | null> {
  const { url, markdown, heroImage } = args;
  const truncated = markdown.slice(0, 8000);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You extract structured furniture product information from scraped product pages. Return only the fields you can confidently determine. Use EUR if the page shows €.",
        },
        {
          role: "user",
          content: `Source URL: ${url}\nLikely hero image: ${heroImage ?? "(none)"}\n\nPage content:\n${truncated}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_product",
            description: "Save the extracted product details.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Product name" },
                maker: { type: "string", description: "Brand or designer" },
                price: { type: "number", description: "Numeric price (no currency symbol)" },
                currency: { type: "string", description: "ISO currency code, e.g. EUR" },
                category: {
                  type: "string",
                  enum: ["Seating", "Tables", "Lighting", "Storage", "Decor", "Textiles", "Art"],
                },
                image_url: { type: "string", description: "Best hero product image URL" },
                description: { type: "string", description: "Short marketing description, 1-3 sentences" },
                specs: {
                  type: "object",
                  description: "Key/value specs like { Material: 'Oak', Width: '220 cm' }",
                  additionalProperties: { type: "string" },
                },
              },
              required: ["name"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "save_product" } },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Lovable AI failed [${res.status}]: ${t}`);
  }
  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return null;
  try {
    const parsed = JSON.parse(call.function.arguments);
    if (!parsed.image_url && heroImage) parsed.image_url = heroImage;
    return parsed as ExtractedProduct;
  } catch {
    return null;
  }
}

async function updateJob(id: string, patch: Record<string, unknown>) {
  await supabase.from("import_jobs").update(patch).eq("id", id);
}

async function runJob(jobId: string, categoryUrl: string, limit: number) {
  try {
    await updateJob(jobId, { current_label: "Discovering product links…" });
    const urls = await firecrawlMap(categoryUrl, limit);
    if (urls.length === 0) {
      await updateJob(jobId, {
        status: "failed",
        error_message: "No product-like links discovered on that page.",
      });
      return;
    }
    await updateJob(jobId, { total: urls.length, current_label: `Found ${urls.length} pages` });

    let succeeded = 0;
    let failed = 0;
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      await updateJob(jobId, {
        current_label: `Processing ${i + 1} of ${urls.length}…`,
        processed: i,
      });
      try {
        const { markdown, html, metadata } = await firecrawlScrape(url);
        const heroImage = pickHeroImage(html, metadata);
        const extracted = await extractWithAI({ url, markdown, heroImage });
        if (!extracted || !extracted.name) {
          failed++;
          continue;
        }
        const { error: upsertErr } = await supabase.from("products").upsert(
          {
            source_url: url,
            name: extracted.name,
            maker: extracted.maker ?? null,
            price: extracted.price ?? null,
            currency: extracted.currency ?? "EUR",
            category: extracted.category ?? null,
            image_url: extracted.image_url ?? heroImage ?? null,
            original_image_url: extracted.image_url ?? heroImage ?? null,
            specs: extracted.specs ?? {},
            description: extracted.description ?? null,
            status: "pending",
            job_id: jobId,
          },
          { onConflict: "source_url" },
        );
        if (upsertErr) {
          console.error("upsert error", upsertErr);
          failed++;
        } else {
          succeeded++;
        }
      } catch (e) {
        console.error("item failed", url, e);
        failed++;
      }
      await updateJob(jobId, { processed: i + 1, succeeded, failed });
    }

    await updateJob(jobId, {
      status: "completed",
      current_label: `Done — ${succeeded} imported, ${failed} skipped`,
    });
  } catch (e) {
    console.error("job failed", e);
    await updateJob(jobId, {
      status: "failed",
      error_message: e instanceof Error ? e.message : String(e),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { categoryUrl, limit } = await req.json();
    if (!categoryUrl || typeof categoryUrl !== "string") {
      return new Response(JSON.stringify({ error: "categoryUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const max = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const { data: job, error } = await supabase
      .from("import_jobs")
      .insert({ category_url: categoryUrl, max_items: max, status: "running" })
      .select()
      .single();
    if (error) throw error;

    // Run async — don't await. Edge runtime keeps the task alive via waitUntil.
    // @ts-ignore — EdgeRuntime is available in Supabase Edge runtime
    EdgeRuntime.waitUntil(runJob(job.id, categoryUrl, max));

    return new Response(JSON.stringify({ jobId: job.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});