"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

type Props = {
  itemId: string;
  autoRun?: boolean;
  initialSummary: string | null;
  initialCategory: string | null;
  initialActions: string[] | null;
  initialError: string | null;
  initialModel: string | null;
};

export function EnrichSection({
  itemId,
  autoRun,
  initialSummary,
  initialCategory,
  initialActions,
  initialError,
  initialModel,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError);
  const autoStarted = useRef(false);

  const run = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Enrichment failed.");
        router.refresh();
        return;
      }
      router.refresh();
    });
  }, [itemId, router]);

  useEffect(() => {
    if (!autoRun || autoStarted.current) {
      return;
    }
    autoStarted.current = true;
    run();
  }, [autoRun, run]);

  const hasAi =
    initialSummary ||
    initialCategory ||
    (initialActions && initialActions.length > 0);

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          AI assist
        </h2>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          {pending ? "Working…" : "Enrich with AI"}
        </button>
      </div>

      {(error ?? initialError) ? (
        <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {error ?? initialError}
        </p>
      ) : null}

      {hasAi ? (
        <div className="mt-3 space-y-2 text-sm text-zinc-800 dark:text-zinc-200">
          {initialCategory ? (
            <p>
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                Category:
              </span>{" "}
              {initialCategory}
            </p>
          ) : null}
          {initialSummary ? (
            <p>
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                Summary:
              </span>{" "}
              {initialSummary}
            </p>
          ) : null}
          {initialActions && initialActions.length > 0 ? (
            <div>
              <p className="font-medium text-zinc-600 dark:text-zinc-400">
                Action items
              </p>
              <ul className="mt-1 list-inside list-disc">
                {initialActions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {initialModel ? (
            <p className="text-xs text-zinc-500">Model: {initialModel}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Run enrichment to get a short summary, a category label, and suggested
          action items.
        </p>
      )}
    </section>
  );
}
