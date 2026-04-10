import { NextResponse } from "next/server";
import twilio from "twilio";
import { getPublicEnv } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { FamilyItemKind } from "@/lib/types";

export const runtime = "nodejs";

function parseKindAndBody(raw: string): {
  kind: FamilyItemKind;
  body: string;
  title: string | null;
} {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const prefixes: { prefix: string; kind: FamilyItemKind }[] = [
    { prefix: "task:", kind: "task" },
    { prefix: "reminder:", kind: "reminder" },
    { prefix: "event:", kind: "event" },
    { prefix: "idea:", kind: "idea" },
    { prefix: "message:", kind: "message" },
  ];

  for (const { prefix, kind } of prefixes) {
    if (lower.startsWith(prefix)) {
      const rest = trimmed.slice(prefix.length).trim();
      const firstLine = rest.split("\n")[0]?.trim() ?? "";
      const bodyRest = rest.includes("\n")
        ? rest.slice(rest.indexOf("\n") + 1).trim()
        : "";
      return {
        kind,
        body: bodyRest.length > 0 ? bodyRest : rest,
        title: firstLine.length > 0 ? firstLine : null,
      };
    }
  }

  return { kind: "message", body: trimmed, title: null };
}

function parseFormBody(body: string): Record<string, string> {
  const sp = new URLSearchParams(body);
  const out: Record<string, string> = {};
  for (const [k, v] of sp.entries()) {
    out[k] = v;
  }
  return out;
}

function emptyTwiML() {
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    },
  );
}

export async function GET() {
  // Healthcheck / easy browser verification (Twilio uses POST).
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const skipVerify =
    process.env.TWILIO_SKIP_SIGNATURE_VERIFY === "true" &&
    process.env.NODE_ENV !== "production";

  if (!authToken && !skipVerify) {
    return NextResponse.json(
      { error: "TWILIO_AUTH_TOKEN is not configured." },
      { status: 503 },
    );
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Parse form body ourselves so we can validate against Twilio's signature using raw body.
  // Twilio signatures are sensitive to exact decoding; validateRequestWithBody avoids mismatch.
  const params = parseFormBody(rawBody);
  const signature = request.headers.get("x-twilio-signature") ?? "";

  // Standard Twilio POST webhooks use validateRequest(params). Do NOT use
  // validateRequestWithBody — that is only for URLs that include ?bodySHA256=...
  const publicUrl = process.env.TWILIO_WEBHOOK_PUBLIC_URL?.trim();
  const reqUrl = new URL(request.url);
  const validationUrl =
    publicUrl && publicUrl.length > 0
      ? publicUrl.replace(/\/$/, "")
      : `${reqUrl.origin}${reqUrl.pathname}`;

  if (!skipVerify && authToken) {
    const ok = twilio.validateRequest(authToken, signature, validationUrl, params);
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  const from = params.From ?? "";
  const bodyText = (params.Body ?? "").trim();

  if (!from || !from.startsWith("whatsapp:")) {
    return emptyTwiML();
  }

  const allowlistRaw = process.env.TWILIO_WHATSAPP_ALLOWLIST?.trim();
  if (allowlistRaw) {
    const allowed = new Set(
      allowlistRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    if (!allowed.has(from)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!bodyText) {
    return emptyTwiML();
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server misconfigured";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { NEXT_PUBLIC_FAMILY_ID } = getPublicEnv();
  const { kind, body, title } = parseKindAndBody(bodyText);

  const { error } = await supabase.from("family_items").insert({
    family_id: NEXT_PUBLIC_FAMILY_ID,
    kind,
    title,
    body,
    status: "open",
    created_by: null,
    source: "whatsapp",
    whatsapp_from: from,
  });

  if (error) {
    console.error("[twilio whatsapp]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return emptyTwiML();
}

