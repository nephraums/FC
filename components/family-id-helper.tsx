"use client";

import { useState } from "react";

export function FamilyIdHelper() {
  const [value, setValue] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const generate = async () => {
    setStatus("");
    const id = crypto.randomUUID();
    setValue(id);
    try {
      await navigator.clipboard.writeText(id);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Generated (copy manually if needed).");
    }
  };

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Family ID (env helper)
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Generate a UUID and use it as <code className="font-mono">NEXT_PUBLIC_FAMILY_ID</code>{" "}
        in <code className="font-mono">.env.local</code> and Vercel.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={generate}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Generate + copy
          </button>
        </div>

        <input
          value={value}
          readOnly
          placeholder="Click “Generate + copy”"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />

        {status ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{status}</p>
        ) : null}
      </div>
    </section>
  );
}

