import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/item-form";
import { createClient } from "@/lib/supabase/server";
import { mapFamilyItem } from "@/lib/map-item";
import { ensureProfile } from "@/lib/ensure-profile";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureProfile(supabase, user);
  }
  const { data: row, error } = await supabase
    .from("family_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) {
    notFound();
  }

  const item = mapFamilyItem(row as Record<string, unknown>);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/items/${id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to item
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Edit item
        </h1>
      </div>
      <ItemForm mode="edit" item={item} />
    </div>
  );
}
