import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/";
  const next =
    requestedNext.startsWith("/auth/") || requestedNext.startsWith("/login")
      ? "/"
      : requestedNext;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { NEXT_PUBLIC_FAMILY_ID } = getPublicEnv();
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        family_id: NEXT_PUBLIC_FAMILY_ID,
        display_name: user.email?.split("@")[0] ?? "Family member",
      },
      { onConflict: "id" },
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
