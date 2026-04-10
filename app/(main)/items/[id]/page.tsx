import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteItem, toggleItemStatus } from "@/app/actions/items";
import { EnrichSection } from "@/components/enrich-section";
import { createClient } from "@/lib/supabase/server";
import { mapFamilyItem } from "@/lib/map-item";
import type { FamilyItemKind } from "@/lib/types";
import { ensureProfile } from "@/lib/ensure-profile";

const kindLabels: Record<FamilyItemKind, string> = {
  task: "Task",
  reminder: "Reminder",
  event: "Event",
  idea: "Idea",
  message: "Message",
};

export default async function ItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enrich?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
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
  const autoEnrich = sp.enrich === "1";

  return (
    <div className="flex flex-col gap-8">
      {sp.error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {sp.error}
        </p>
      ) : null}
      <div>
        <Link
          href="/"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Dashboard
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">
              {kindLabels[item.kind]}
              {item.status === "done" ? " · Done" : " · Open"}
            </p>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {item.title?.trim() || "Untitled"}
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Updated {new Date(item.updated_at).toLocaleString()}
            </p>
            {item.source === "whatsapp" && item.whatsapp_from ? (
              <p className="mt-1 text-xs text-zinc-500">
                Via WhatsApp ({item.whatsapp_from.replace(/^whatsapp:/, "")})
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={toggleItemStatus}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="current" value={item.status} />
              <button
                type="submit"
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              >
                Mark as {item.status === "done" ? "open" : "done"}
              </button>
            </form>
            <Link
              href={`/items/${id}/edit`}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            >
              Edit
            </Link>
            <form action={deleteItem.bind(null, id)}>
              <button
                type="submit"
                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-800 hover:bg-red-50 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="sr-only">Content</h2>
        <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-800 dark:text-zinc-200">
          {item.body}
        </pre>
      </section>

      {(item.occurs_at || item.due_at) && (
        <section className="text-sm text-zinc-600 dark:text-zinc-400">
          {item.occurs_at ? (
            <p>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Reminder / event:
              </span>{" "}
              {new Date(item.occurs_at).toLocaleString()}
            </p>
          ) : null}
          {item.due_at ? (
            <p className="mt-1">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Due:
              </span>{" "}
              {new Date(item.due_at).toLocaleString()}
            </p>
          ) : null}
        </section>
      )}

      <EnrichSection
        itemId={item.id}
        autoRun={autoEnrich}
        initialSummary={item.ai_summary}
        initialCategory={item.ai_category}
        initialActions={item.ai_action_items}
        initialError={item.ai_error}
        initialModel={item.ai_model}
      />
    </div>
  );
}
