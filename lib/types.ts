export const FAMILY_ITEM_KINDS = [
  "task",
  "reminder",
  "event",
  "idea",
  "message",
] as const;

export type FamilyItemKind = (typeof FAMILY_ITEM_KINDS)[number];

export type FamilyItem = {
  id: string;
  family_id: string;
  kind: FamilyItemKind;
  title: string | null;
  body: string;
  occurs_at: string | null;
  due_at: string | null;
  status: "open" | "done";
  ai_summary: string | null;
  ai_category: string | null;
  ai_action_items: string[] | null;
  ai_model: string | null;
  ai_error: string | null;
  created_by: string | null;
  source: "web" | "whatsapp";
  whatsapp_from: string | null;
  /** Public Supabase Storage URLs for images (e.g. from WhatsApp). */
  media_urls: string[] | null;
  created_at: string;
  updated_at: string;
};

