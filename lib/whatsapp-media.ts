import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "family-media";

export async function uploadTwilioMediaToStorage(opts: {
  supabase: SupabaseClient;
  accountSid: string;
  authToken: string;
  mediaUrl: string;
  /** Path without extension; extension is chosen from Content-Types. */
  pathPrefix: string;
  /** Value from Twilio `MediaContentTypeN` (may be empty). */
  declaredContentType: string;
  extFromTypes: (declared: string, fetchedContentType: string) => string;
}): Promise<string | null> {
  const {
    supabase,
    accountSid,
    authToken,
    mediaUrl,
    pathPrefix,
    declaredContentType,
    extFromTypes,
  } = opts;

  const res = await fetch(mediaUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
  });

  if (!res.ok) {
    console.error("[whatsapp media] fetch failed", res.status, mediaUrl);
    return null;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const fetchedType =
    res.headers.get("content-type") ?? "application/octet-stream";

  const ext = extFromTypes(declaredContentType, fetchedType);
  const storagePath = `${pathPrefix}.${ext}`;
  const contentType =
    fetchedType.split(";")[0]?.trim() ?? "application/octet-stream";

  const { error: upError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, {
      contentType,
      upsert: false,
    });

  if (upError) {
    console.error("[whatsapp media] upload failed", upError.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
