import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Take a photo of a real room and return a same-perspective, same-architecture
 * version with every piece of movable furniture removed. The architecture
 * (floor, walls, ceiling, beams, windows, stairs, doors, radiators, built-ins)
 * must be preserved so the result can serve as a faithful backdrop for the
 * moodboard composer.
 */

const inputSchema = z.object({
  /** data URL of the uploaded room photo */
  imageDataUrl: z.string().min(20),
});

const SYSTEM_PROMPT = `You are an architectural visualization AI.

You will be given a photo of a real room. Your job is to produce a NEW image
of the SAME room from the SAME camera angle and perspective, with EVERY piece
of movable furniture and decor REMOVED.

KEEP exactly as in the source photo:
- Floor (same material, color, plank direction, joins)
- Walls (same paint color, same wainscoting / panelling)
- Ceiling (same beams, same paint, same texture)
- Windows (same shape, frames, mullions, view through them)
- Doors and door frames
- Stairs, banisters, balustrades
- Radiators, vents, electrical outlets
- Built-in shelves, fireplaces, columns, fixed cabinetry
- Light fixtures that are mounted to the wall or ceiling
- The natural light, time of day, and overall color temperature
- The exact camera angle, focal length and perspective

REMOVE completely:
- Sofas, chairs, stools, benches, ottomans
- Tables (dining, coffee, side, console)
- Free-standing lamps, floor lamps
- Rugs, throws, cushions, blankets
- Plants in pots, vases, candles, books, decor objects
- TVs, electronics, audio gear, speakers
- Free-standing shelves, sideboards, dressers
- Curtains and blinds (unless they are clearly built-in shutters)
- Any other movable / personal items

The result should look like a clean, empty, photo-realistic version of the
same architectural shell — as if the owner just moved out. Keep it photographic
(not stylized or illustrated). Match the lighting and shadows of the source
so an inserted piece of furniture would look like it belongs.

Output only the image.`;

export const emptyRoom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "AI gateway is not configured. Please enable Lovable Cloud.",
      );
    }

    const body = {
      // Flash image model — fast enough to fit the edge request budget while
      // still preserving architecture well. The Pro variant exceeds the
      // upstream timeout for room-sized photos.
      model: "google/gemini-3.1-flash-image-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
    };

    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) {
        throw new Error("Too many requests right now — please try again in a moment.");
      }
      if (res.status === 402) {
        throw new Error(
          "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
        );
      }
      console.error("empty-room gateway error", res.status, text);
      throw new Error("The AI couldn't process that photo. Please try another.");
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          images?: Array<{ image_url?: { url?: string } }>;
        };
      }>;
    };

    const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) {
      throw new Error("AI didn't return an image. Please try again.");
    }

    return { imageDataUrl: url };
  });