// Background worker that does the slow Gemini image-edit call for an
// "empty my room" job. Invoked fire-and-forget by the start server function;
// it reads the job row, calls the AI gateway, and writes the result back.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an architectural visualization AI.

You will be given a photo of a real room. Produce a NEW image of the SAME room
from the SAME camera angle and perspective, with EVERY piece of movable
furniture and decor REMOVED.

KEEP exactly as in the source photo: floor (material, color, plank direction),
walls (paint color, panelling), ceiling (beams, texture), windows (frames,
mullions, view), doors and door frames, stairs, banisters, radiators, vents,
outlets, built-in shelves, fireplaces, columns, fixed cabinetry, wall/ceiling
mounted light fixtures, the natural light, time of day and color temperature,
the exact camera angle, focal length and perspective.

REMOVE completely: sofas, chairs, stools, benches, ottomans, tables (dining,
coffee, side, console), free-standing lamps, rugs, throws, cushions, plants,
vases, candles, books, decor objects, TVs, electronics, speakers,
free-standing shelves, sideboards, dressers, curtains/blinds (unless built-in
shutters), and any other movable items.

The result should look like a clean, empty, photo-realistic version of the
same architectural shell. Keep it photographic, match lighting and shadows so
inserted furniture would belong. Output only the image.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let jobId: string | null = null;
  try {
    const body = await req.json();
    jobId = body.jobId as string;
    if (!jobId) throw new Error("jobId required");

    const { data: job, error: jobErr } = await supabase
      .from("room_jobs")
      .select("id, input_image, status")
      .eq("id", jobId)
      .single();
    if (jobErr || !job) throw new Error(jobErr?.message ?? "job not found");
    if (job.status !== "pending") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("room_jobs").update({ status: "processing" }).eq("id", jobId);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("AI gateway not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SYSTEM_PROMPT },
              { type: "image_url", image_url: { url: job.input_image } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text().catch(() => "");
      let msg = "The AI couldn't process that photo. Please try another.";
      if (aiRes.status === 429) msg = "Too many requests right now — please try again in a moment.";
      if (aiRes.status === 402) msg = "AI credits exhausted. Add credits in Settings → Workspace → Usage.";
      console.error("gateway error", aiRes.status, text);
      await supabase.from("room_jobs").update({ status: "failed", error_message: msg }).eq("id", jobId);
      return new Response(JSON.stringify({ ok: false, error: msg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiRes.json();
    const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
    if (!url) throw new Error("AI didn't return an image");

    await supabase
      .from("room_jobs")
      .update({ status: "done", output_image: url })
      .eq("id", jobId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("empty-room-worker failed", msg);
    if (jobId) {
      await supabase
        .from("room_jobs")
        .update({ status: "failed", error_message: msg })
        .eq("id", jobId);
    }
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});