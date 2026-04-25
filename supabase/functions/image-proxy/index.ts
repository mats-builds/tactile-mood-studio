// Simple image proxy. Fetches a remote image server-side and re-serves it
// with permissive CORS headers so browser-side libraries (e.g. background
// removal) can read pixel data without being blocked by the source site's
// CORS policy.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url).searchParams.get("url");
    if (!url) {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Derive a same-origin Referer so hotlink-protected CDNs (which 403
    // requests with no/foreign Referer) serve the image.
    let referer: string | undefined;
    let origin: string | undefined;
    try {
      const u = new URL(url);
      origin = `${u.protocol}//${u.host}`;
      referer = `${origin}/`;
    } catch {
      // ignore — fetch without referer
    }

    const baseHeaders: Record<string, string> = {
      // Pretend to be a normal browser; some CDNs 403 unknown agents.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };
    if (referer) baseHeaders["Referer"] = referer;
    if (origin) baseHeaders["Origin"] = origin;

    let upstream = await fetch(url, { headers: baseHeaders, redirect: "follow" });

    // Some sites block when Origin is set (treat as CORS preflight-ish) — retry without it.
    if (!upstream.ok && (upstream.status === 403 || upstream.status === 401)) {
      const retryHeaders = { ...baseHeaders };
      delete retryHeaders["Origin"];
      upstream = await fetch(url, { headers: retryHeaders, redirect: "follow" });
    }

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `upstream ${upstream.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});