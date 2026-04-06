"use client";

import { useActionState } from "react";
import {
  createItem,
  updateItem,
  type ItemActionState,
} from "@/app/actions/items";
import type { FamilyItem, FamilyItemKind } from "@/lib/types";
import { FAMILY_ITEM_KINDS } from "@/lib/types";
import { toDatetimeLocalValue } from "@/lib/datetime";

const labels: Record<FamilyItemKind, string> = {
  task: "Task",
  reminder: "Reminder",
  event: "Event",
  idea: "Idea",
  message: "Long message",
};

type Props =
  | { mode: "create" }
  | { mode: "edit"; item: FamilyItem };

export function ItemForm(props: Props) {
  const initial: ItemActionState = null;
  const boundUpdate =
    props.mode === "edit"
      ? updateItem.bind(null, props.item.id)
      : null;

  const [state, formAction, pending] = useActionState(
    props.mode === "create" ? createItem : boundUpdate!,
    initial,
  );

  const item = props.mode === "edit" ? props.item : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="kind" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Type
        </label>
        <select
          id="kind"
          name="kind"
          required
          defaultValue={item?.kind ?? "task"}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {FAMILY_ITEM_KINDS.map((k) => (
            <option key={k} value={k}>
              {labels[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="title" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Title <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={500}
          defaultValue={item?.title ?? ""}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="body" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Content
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={8}
          defaultValue={item?.body ?? ""}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label
            htmlFor="occurs_at"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Reminder / event time
          </label>
          <input
            id="occurs_at"
            name="occurs_at"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(item?.occurs_at)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="due_at" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Due
          </label>
          <input
            id="due_at"
            name="due_at"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(item?.due_at)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="status" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={item?.status ?? "open"}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="open">Open</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Saving…" : props.mode === "create" ? "Save" : "Update"}
        </button>
      </div>
    </form>
  );
}
