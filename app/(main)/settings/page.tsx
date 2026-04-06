import { createClient } from "@/lib/supabase/server";
import { updateSettings } from "@/app/actions/settings";
import { SettingsForm } from "@/components/settings-form";
import { FamilyIdHelper } from "@/components/family-id-helper";
import { ensureProfile } from "@/lib/ensure-profile";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let autoEnrich = false;
  let displayName = "";
  if (user) {
    await ensureProfile(supabase, user);
    const { data: profile } = await supabase
      .from("profiles")
      .select("auto_enrich, display_name")
      .eq("id", user.id)
      .maybeSingle();
    autoEnrich = Boolean(profile?.auto_enrich);
    displayName = profile?.display_name ?? "";
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Control optional AI behaviour when you save new items.
        </p>
      </div>

      <SettingsForm
        defaultAutoEnrich={autoEnrich}
        defaultDisplayName={displayName}
        action={updateSettings}
      />

      <FamilyIdHelper />
    </div>
  );
}
