import { LoginForm } from "@/components/login-form";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string; error?: string }>;
}) {
  const sp = await searchParams;

  // Fallback: some Supabase email links land on /login?code=...
  // We forward to /auth/callback which exchanges the code for a session.
  if (sp.code) {
    const params = new URLSearchParams();
    params.set("code", sp.code);
    if (sp.next && !sp.next.startsWith("/auth/") && !sp.next.startsWith("/login")) {
      params.set("next", sp.next);
    }
    redirect(`/auth/callback?${params.toString()}`);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Family Command Centre
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in with a magic link sent to your email.
          </p>
        </div>
        {sp.error ? (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {sp.error}
          </p>
        ) : null}
        <LoginForm />
      </div>
    </div>
  );
}
