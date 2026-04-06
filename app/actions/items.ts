"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";
import { ensureProfile } from "@/lib/ensure-profile";

const kindSchema = z.enum([
  "task",
  "reminder",
  "event",
  "idea",
  "message",
]);

const itemSchema = z.object({
  kind: kindSchema,
  title: z.string().max(500).nullable().optional(),
  body: z.string().min(1, "Content is required.").max(20000),
  occurs_at: z.string().nullable().optional(),
  due_at: z.string().nullable().optional(),
  status: z.enum(["open", "done"]),
});

function parseOptionalDatetime(value: string | null | undefined) {
  if (!value || value.trim() === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export type ItemActionState = { error?: string } | null;

export async function createItem(
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  await ensureProfile(supabase, user);

  const parsed = itemSchema.safeParse({
    kind: formData.get("kind"),
    title: (formData.get("title") as string) || null,
    body: formData.get("body"),
    occurs_at: (formData.get("occurs_at") as string) || null,
    due_at: (formData.get("due_at") as string) || null,
    status: formData.get("status") ?? "open",
  });

  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.body?.[0] ?? "Invalid input.";
    return { error: msg };
  }

  const { NEXT_PUBLIC_FAMILY_ID } = getPublicEnv();
  const row = {
    family_id: NEXT_PUBLIC_FAMILY_ID,
    kind: parsed.data.kind,
    title: parsed.data.title || null,
    body: parsed.data.body,
    occurs_at: parseOptionalDatetime(parsed.data.occurs_at),
    due_at: parseOptionalDatetime(parsed.data.due_at),
    status: parsed.data.status,
    created_by: user.id,
  };

  const { data: inserted, error } = await supabase
    .from("family_items")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/items/${inserted.id}`);

  const profile = await supabase
    .from("profiles")
    .select("auto_enrich")
    .eq("id", user.id)
    .maybeSingle();

  if (profile.data?.auto_enrich) {
    redirect(`/items/${inserted.id}?enrich=1`);
  }

  redirect(`/items/${inserted.id}`);
}

export async function updateItem(
  id: string,
  _prev: ItemActionState,
  formData: FormData,
): Promise<ItemActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  await ensureProfile(supabase, user);

  const parsed = itemSchema.safeParse({
    kind: formData.get("kind"),
    title: (formData.get("title") as string) || null,
    body: formData.get("body"),
    occurs_at: (formData.get("occurs_at") as string) || null,
    due_at: (formData.get("due_at") as string) || null,
    status: formData.get("status") ?? "open",
  });

  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.body?.[0] ?? "Invalid input.";
    return { error: msg };
  }

  const { error } = await supabase
    .from("family_items")
    .update({
      kind: parsed.data.kind,
      title: parsed.data.title || null,
      body: parsed.data.body,
      occurs_at: parseOptionalDatetime(parsed.data.occurs_at),
      due_at: parseOptionalDatetime(parsed.data.due_at),
      status: parsed.data.status,
      ai_error: null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/items/${id}`);
  redirect(`/items/${id}`);
}

export async function deleteItem(id: string, formData?: FormData) {
  void formData;
  const supabase = await createClient();
  const { error } = await supabase.from("family_items").delete().eq("id", id);

  if (error) {
    redirect(
      `/items/${id}?error=${encodeURIComponent(`Could not delete: ${error.message}`)}`,
    );
  }

  revalidatePath("/");
  redirect("/");
}

export async function setItemStatus(id: string, status: "open" | "done") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("family_items")
    .update({ status })
    .eq("id", id);

  if (error) {
    redirect(
      `/items/${id}?error=${encodeURIComponent(`Could not update status: ${error.message}`)}`,
    );
  }

  revalidatePath("/");
  revalidatePath(`/items/${id}`);
}

export async function toggleItemStatus(formData: FormData) {
  const id = formData.get("id");
  const current = formData.get("current");
  if (typeof id !== "string" || !id) {
    return;
  }
  const next: "open" | "done" = current === "done" ? "open" : "done";
  await setItemStatus(id, next);
}
