import Link from "next/link";
import { ItemForm } from "@/components/item-form";

export default function NewItemPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          New item
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Add a task, reminder, event, idea, or long message.
        </p>
      </div>
      <ItemForm mode="create" />
    </div>
  );
}
