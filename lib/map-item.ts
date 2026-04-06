import type { FamilyItem, FamilyItemKind } from "@/lib/types";

export function mapFamilyItem(row: Record<string, unknown>): FamilyItem {
  const kinds: FamilyItemKind[] = [
    "task",
    "reminder",
    "event",
    "idea",
    "message",
  ];
  const kind = kinds.includes(row.kind as FamilyItemKind)
    ? (row.kind as FamilyItemKind)
    : "message";

  let ai_action_items: string[] | null = null;
  if (Array.isArray(row.ai_action_items)) {
    ai_action_items = row.ai_action_items.filter(
      (x): x is string => typeof x === "string",
    );
  }

  return {
    id: String(row.id),
    family_id: String(row.family_id),
    kind,
    title: row.title == null ? null : String(row.title),
    body: String(row.body),
    occurs_at: row.occurs_at == null ? null : String(row.occurs_at),
    due_at: row.due_at == null ? null : String(row.due_at),
    status: row.status === "done" ? "done" : "open",
    ai_summary: row.ai_summary == null ? null : String(row.ai_summary),
    ai_category: row.ai_category == null ? null : String(row.ai_category),
    ai_action_items,
    ai_model: row.ai_model == null ? null : String(row.ai_model),
    ai_error: row.ai_error == null ? null : String(row.ai_error),
    created_by: row.created_by == null ? null : String(row.created_by),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
