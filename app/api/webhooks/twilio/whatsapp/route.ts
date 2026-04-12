import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import twilio from "twilio";
import { getPublicEnv } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { uploadTwilioMediaToStorage } from "@/lib/whatsapp-media";
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
  const numMedia = Math.min(
    10,
    Math.max(0, Number.parseInt(params.NumMedia ?? "0", 10) || 0),
  );

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

  if (!bodyText && numMedia === 0) {
    return emptyTwiML();
  }

  if (numMedia > 0 && !authToken) {
    return NextResponse.json(
      { error: "TWILIO_AUTH_TOKEN is required to fetch WhatsApp media." },
      { status: 503 },
    );
  }

  const twilioAuthToken = authToken as string | undefined;

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server misconfigured";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  if (numMedia > 0 && !accountSid) {
    return NextResponse.json(
      { error: "TWILIO_ACCOUNT_SID is not configured." },
      { status: 503 },
    );
  }

  const { NEXT_PUBLIC_FAMILY_ID } = getPublicEnv();
  const textForParse = bodyText.length > 0 ? bodyText : "(Photo)";
  const { kind, body, title } = parseKindAndBody(textForParse);

  const itemId = randomUUID();
  const mediaUrls: string[] = [];

  function mediaExtFromTypes(declared: string, fetchedContentType: string): string {
    const t = `${declared} ${fetchedContentType}`.toLowerCase();
    if (t.includes("png")) return "png";
    if (t.includes("webp")) return "webp";
    if (t.includes("gif")) return "gif";
    if (t.includes("heic") || t.includes("heif")) return "heic";
    if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
    return "jpg";
  }

  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = params[`MediaUrl${i}`];
    const declaredType = (params[`MediaContentType${i}`] ?? "").trim();
    if (!mediaUrl) {
      continue;
    }
    // Twilio sometimes omits type or sends application/octet-stream. Skip known non-images.
    if (declaredType) {
      if (declaredType.startsWith("video/") || declaredType.startsWith("audio/")) {
        continue;
      }
      const allowEmptyOrImage =
        declaredType.startsWith("image/") ||
        declaredType === "application/octet-stream";
      const blockDoc =
        declaredType === "application/pdf" || declaredType.startsWith("text/");
      if (blockDoc || (!allowEmptyOrImage && declaredType.startsWith("application/"))) {
        continue;
      }
    }

    const pathPrefix = `whatsapp/${NEXT_PUBLIC_FAMILY_ID}/${itemId}/${i}`;
    const publicUrl = await uploadTwilioMediaToStorage({
      supabase,
      accountSid: accountSid!,
      authToken: twilioAuthToken!,
      mediaUrl,
      pathPrefix,
      declaredContentType: declaredType,
      extFromTypes: mediaExtFromTypes,
    });
    if (publicUrl) {
      mediaUrls.push(publicUrl);
    }
  }

  const { error } = await supabase.from("family_items").insert({
    id: itemId,
    family_id: NEXT_PUBLIC_FAMILY_ID,
    kind,
    title,
    body,
    status: "open",
    created_by: null,
    source: "whatsapp",
    whatsapp_from: from,
    media_urls: mediaUrls.length > 0 ? mediaUrls : null,
  });

  if (error) {
    console.error("[twilio whatsapp]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return emptyTwiML();
}

