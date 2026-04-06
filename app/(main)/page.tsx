import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { mapFamilyItem } from "@/lib/map-item";
import type { FamilyItemKind } from "@/lib/types";
import { FAMILY_ITEM_KINDS } from "@/lib/types";
import { ensureProfile } from "@/lib/ensure-profile";

const kindLabels: Record<FamilyItemKind, string> = {
  task: "Task",
  reminder: "Reminder",
  event: "Event",
  idea: "Idea",
  message: "Message",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; status?: string; member?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureProfile(supabase, user);
  }

  const { data: members } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  let query = supabase
    .from("family_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (
    sp.kind &&
    FAMILY_ITEM_KINDS.includes(sp.kind as FamilyItemKind)
  ) {
    query = query.eq("kind", sp.kind);
  }
  if (sp.status === "open" || sp.status === "done") {
    query = query.eq("status", sp.status);
  }
  if (sp.member) {
    query = query.eq("created_by", sp.member);
  }

  const { data: rows, error } = await query;

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        Could not load items: {error.message}
      </div>
    );
  }

  const items = (rows ?? []).map((r) => mapFamilyItem(r as Record<string, unknown>));

  const base = "/";
  const kindLink = (k: string | null) => {
    const p = new URLSearchParams();
    if (k) p.set("kind", k);
    if (sp.status) p.set("status", sp.status);
    if (sp.member) p.set("member", sp.member);
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  };
  const statusLink = (s: string | null) => {
    const p = new URLSearchParams();
    if (sp.kind) p.set("kind", sp.kind);
    if (s) p.set("status", s);
    if (sp.member) p.set("member", sp.member);
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  };
  const memberLink = (m: string | null) => {
    const p = new URLSearchParams();
    if (sp.kind) p.set("kind", sp.kind);
    if (sp.status) p.set("status", sp.status);
    if (m) p.set("member", m);
    const q = p.toString();
    return q ? `${base}?${q}` : base;
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Everything your family has captured in one place.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Filter by type
        </p>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            href={kindLink(null)}
            active={!sp.kind}
            label="All types"
          />
          {FAMILY_ITEM_KINDS.map((k) => (
            <FilterChip
              key={k}
              href={kindLink(k)}
              active={sp.kind === k}
              label={kindLabels[k]}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Status
        </p>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            href={statusLink(null)}
            active={!sp.status}
            label="All"
          />
          <FilterChip
            href={statusLink("open")}
            active={sp.status === "open"}
            label="Open"
          />
          <FilterChip
            href={statusLink("done")}
            active={sp.status === "done"}
            label="Done"
          />
        </div>
      </div>

      {members && members.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Member
          </p>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              href={memberLink(null)}
              active={!sp.member}
              label="All members"
            />
            {members.map((m) => (
              <FilterChip
                key={m.id}
                href={memberLink(m.id)}
                active={sp.member === m.id}
                label={m.display_name?.trim() || "Unnamed"}
              />
            ))}
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="text-zinc-700 dark:text-zinc-300">
            No items yet.{" "}
            <Link
              href="/items/new"
              className="font-medium text-zinc-900 underline dark:text-zinc-100"
            >
              Add your first item
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/items/${item.id}`}
                className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {item.title?.trim() || kindLabels[item.kind]}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {kindLabels[item.kind]}
                    {item.status === "done" ? " · Done" : ""}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {item.body}
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-sm ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      {label}
    </Link>
  );
}
