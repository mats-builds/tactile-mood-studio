import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * "Empty my room" runs as a queued background job because the AI image edit
 * routinely takes 30–60s — well beyond the edge request budget. The flow:
 *
 *   1. `startEmptyRoom`  — inserts a row in `room_jobs`, fires the worker
 *                          edge function (no await) and returns a jobId.
 *   2. `pollEmptyRoom`   — client polls this until `status === "done"` and
 *                          the result image is available.
 */

const startSchema = z.object({
  /** data URL of the uploaded room photo */
  imageDataUrl: z.string().min(20),
});

const pollSchema = z.object({
  jobId: z.string().uuid(),
});

export const startEmptyRoom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => startSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: job, error } = await supabaseAdmin
      .from("room_jobs")
      .insert({ input_image: data.imageDataUrl, status: "pending" })
      .select("id")
      .single();
    if (error || !job) {
      console.error("startEmptyRoom insert failed", error);
      throw new Error("Couldn't queue the job. Please try again.");
    }

    // Fire the worker without awaiting — the worker will outlive this request
    // and write the result back to the row. We swallow errors here because
    // the client polls the row for status anyway.
    const workerUrl = `${process.env.SUPABASE_URL}/functions/v1/empty-room-worker`;
    fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ jobId: job.id }),
    }).catch((e) => console.error("failed to kick worker", e));

    return { jobId: job.id };
  });

export const pollEmptyRoom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => pollSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: job, error } = await supabaseAdmin
      .from("room_jobs")
      .select("status, output_image, error_message")
      .eq("id", data.jobId)
      .single();
    if (error || !job) {
      throw new Error("Job not found.");
    }
    return {
      status: job.status as "pending" | "processing" | "done" | "failed",
      imageDataUrl: job.output_image ?? null,
      error: job.error_message ?? null,
    };
  });