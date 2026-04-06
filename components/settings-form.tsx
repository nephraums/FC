"use client";

import { useActionState } from "react";
import type { SettingsActionState } from "@/app/actions/settings";

type Props = {
  defaultAutoEnrich: boolean;
  defaultDisplayName: string;
  action: (
    prev: SettingsActionState,
    formData: FormData,
  ) => Promise<SettingsActionState>;
};

export function SettingsForm({
  defaultAutoEnrich,
  defaultDisplayName,
  action,
}: Props) {
  const [state, formAction, pending] = useActionState<
    SettingsActionState,
    FormData
  >(action, null);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {state?.error ? (
        <p
          className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="mb-3 text-sm text-emerald-700 dark:text-emerald-300">
          Saved.
        </p>
      ) : null}

      <div className="mb-4 grid gap-2">
        <label
          htmlFor="display_name"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Your name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          maxLength={80}
          defaultValue={defaultDisplayName}
          placeholder="e.g. Mum, Dad, Alex"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="auto_enrich"
          value="on"
          defaultChecked={defaultAutoEnrich}
          className="mt-1 h-4 w-4 rounded border-zinc-300"
        />
        <span>
          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Auto-enrich new items
          </span>
          <span className="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-400">
            After you create an item, run AI summary and action items automatically
            (uses your OpenAI key on the server).
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
