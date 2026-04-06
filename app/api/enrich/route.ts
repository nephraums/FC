import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getGeminiKey } from "@/lib/env";
import { ensureProfile } from "@/lib/ensure-profile";

const bodySchema = z.object({
  id: z.string().uuid(),
});

const aiResponseSchema = z.object({
  summary: z.string(),
  category: z.string(),
  action_items: z.array(z.string()),
});

export async function POST(request: Request) {
  const key = getGeminiKey();
  if (!key) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfile(supabase, user);

  const { data: item, error: fetchError } = await supabase
    .from("family_items")
    .select("*")
    .eq("id", parsed.data.id)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Model names change over time; use a currently supported default.
  // If you need a different one, set GEMINI_MODEL in the environment.
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const genAI = new GoogleGenerativeAI(key);
  const gModel = genAI.getGenerativeModel({ model });

  let text: string;
  try {
    const result = await gModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "You help families organise notes.\n" +
                "Respond with JSON only (no markdown, no code fences).\n" +
                "Keys: summary (string, 1-3 sentences), category (short label such as Errands, School, Health, Home), action_items (array of short strings; use an empty array if none).\n\n" +
                `Type: ${item.kind}\n` +
                `Title: ${item.title ?? ""}\n` +
                "Content:\n" +
                `${item.body}\n`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    text = result.response.text();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gemini request failed";
    await supabase
      .from("family_items")
      .update({ ai_error: message })
      .eq("id", item.id);
    const status =
      typeof message === "string" && message.includes("429") ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  const raw = text;
  if (!raw || raw.trim().length === 0) {
    await supabase
      .from("family_items")
      .update({ ai_error: "Empty model response" })
      .eq("id", item.id);
    return NextResponse.json({ error: "Empty response" }, { status: 502 });
  }

  let parsedOut: z.infer<typeof aiResponseSchema>;
  try {
    parsedOut = aiResponseSchema.parse(JSON.parse(raw));
  } catch {
    await supabase
      .from("family_items")
      .update({ ai_error: "Could not parse AI JSON" })
      .eq("id", item.id);
    return NextResponse.json({ error: "Parse error" }, { status: 502 });
  }

  const { error: upError } = await supabase
    .from("family_items")
    .update({
      ai_summary: parsedOut.summary,
      ai_category: parsedOut.category,
      ai_action_items: parsedOut.action_items,
      ai_model: model,
      ai_error: null,
    })
    .eq("id", item.id);

  if (upError) {
    return NextResponse.json({ error: upError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
