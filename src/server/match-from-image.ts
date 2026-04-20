import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  /** data URL of the uploaded image, e.g. "data:image/jpeg;base64,..." */
  imageDataUrl: z.string().min(20),
  /** candidate products the AI is allowed to choose from */
  candidates: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        maker: z.string().optional(),
        category: z.string().optional(),
        role: z.string().optional(),
        colors: z.array(z.string()).optional(),
      }),
    )
    .min(1)
    .max(400),
});

const matchSchema = {
  type: "object",
  properties: {
    vibe: {
      type: "string",
      description:
        "A 1-sentence description of the overall vibe / style of the reference image (e.g. 'warm minimalist living room with cream tones and soft curves').",
    },
    palette_hint: {
      type: "string",
      description: "Short comma-separated list of dominant colors in the image.",
    },
    product_ids: {
      type: "array",
      description:
        "5 to 8 product IDs (from the provided candidate list) that together best evoke the vibe of the reference image. Must be IDs from the candidate list — do not invent new ones. Aim for a balanced room: try to include at least one large piece (sofa/seating), one accent (lighting/lamp), one surface (table/sideboard), and 2-4 props or art. Avoid duplicates.",
      items: { type: "string" },
      minItems: 5,
      maxItems: 8,
    },
  },
  required: ["vibe", "product_ids"],
  additionalProperties: false,
} as const;

export const matchFromImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "AI gateway is not configured. Please enable Lovable Cloud.",
      );
    }

    const candidateLines = data.candidates
      .map(
        (c) =>
          `- ${c.id} | ${c.name}${c.maker ? ` by ${c.maker}` : ""} | ${c.category ?? "?"} | role:${c.role ?? "?"}${c.colors?.length ? ` | colors:${c.colors.join(",")}` : ""}`,
      )
      .join("\n");

    const systemPrompt = `You are an interior design AI. The user uploads a reference image (e.g. from Pinterest or Instagram). Your job is to read the overall vibe — color palette, materials, mood, formality, era — and pick 5 to 8 products from the catalog below that, together, would compose a moodboard that captures that vibe.

RULES:
- Only return product IDs that appear in the catalog list.
- Aim for a balanced moodboard: large seating, lighting, a surface piece, and a few props/art.
- Prefer pieces whose colors and category match the vibe of the image.
- Never invent IDs. Never duplicate IDs.

CATALOG (id | name | category | role | colors):
${candidateLines}`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze the vibe of this reference image and pick 5–8 products from the catalog that best capture it.",
            },
            {
              type: "image_url",
              image_url: { url: data.imageDataUrl },
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "match_products",
            description:
              "Return the matched product IDs and a vibe description.",
            parameters: matchSchema,
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "match_products" },
      },
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
      console.error("match-from-image gateway error", res.status, text);
      throw new Error("The AI couldn't analyze that image. Please try another.");
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    };

    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      throw new Error("AI returned no matches. Try a clearer image.");
    }

    let parsed: { vibe?: string; palette_hint?: string; product_ids?: string[] };
    try {
      parsed = JSON.parse(argsRaw);
    } catch {
      throw new Error("AI returned an unreadable response. Please try again.");
    }

    const validIds = new Set(data.candidates.map((c) => c.id));
    const ids = (parsed.product_ids ?? [])
      .filter((id) => validIds.has(id))
      .filter((id, i, arr) => arr.indexOf(id) === i)
      .slice(0, 8);

    if (ids.length === 0) {
      throw new Error(
        "Couldn't match any products to that image. Try a clearer reference.",
      );
    }

    return {
      ids,
      vibe: parsed.vibe ?? "",
      paletteHint: parsed.palette_hint ?? "",
    };
  });