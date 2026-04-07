"use server";

import { getPublicEnv } from "@/lib/env";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureProfile(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
) {
  const { NEXT_PUBLIC_FAMILY_ID } = getPublicEnv();
  const suggestedDisplayName =
    user.email?.split("@")[0] ?? "Family member";

  // Preserve a custom display_name if the user has set one.
  const { data: existing } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayNameToUse =
    existing?.display_name && String(existing.display_name).trim().length > 0
      ? undefined
      : suggestedDisplayName;

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      family_id: NEXT_PUBLIC_FAMILY_ID,
      ...(displayNameToUse ? { display_name: displayNameToUse } : {}),
    },
    { onConflict: "id" },
  );
}

