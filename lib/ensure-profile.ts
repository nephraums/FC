"use server";

import { getPublicEnv } from "@/lib/env";

type SupabaseLike = {
  from: (table: string) => ProfilesTable;
};

type ProfilesRow = { display_name: string | null } | null;

type ProfilesSelectBuilder = {
  eq: (column: "id", value: string) => ProfilesSelectBuilder;
  maybeSingle: () => Promise<{ data: ProfilesRow }>;
};

type ProfilesTable = {
  select: (columns: "display_name") => ProfilesSelectBuilder;
  upsert: (
    values: Record<string, unknown>,
    opts?: { onConflict?: string },
  ) => Promise<unknown>;
};

export async function ensureProfile(
  supabase: SupabaseLike,
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

