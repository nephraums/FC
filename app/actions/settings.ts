"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/ensure-profile";

export type SettingsActionState = { error?: string; success?: boolean } | null;

export async function updateSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  await ensureProfile(supabase, user);

  const auto_enrich = formData.get("auto_enrich") === "on";
  const display_name_raw = formData.get("display_name");
  const display_name =
    typeof display_name_raw === "string" ? display_name_raw.trim() : "";

  const { error } = await supabase
    .from("profiles")
    .update({
      auto_enrich,
      display_name: display_name.length > 0 ? display_name : null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}
