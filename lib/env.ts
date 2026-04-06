import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_FAMILY_ID: z.string().uuid(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function getPublicEnv(): Pick<
  Env,
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_FAMILY_ID"
  | "NEXT_PUBLIC_SITE_URL"
> {
  const parsed = envSchema.pick({
    NEXT_PUBLIC_SUPABASE_URL: true,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
    NEXT_PUBLIC_FAMILY_ID: true,
    NEXT_PUBLIC_SITE_URL: true,
  }).safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      "Missing or invalid public environment variables. Copy .env.example to .env.local and set Supabase + NEXT_PUBLIC_FAMILY_ID.",
    );
  }
  return parsed.data;
}

export function getOpenAIKey(): string | null {
  const k = process.env.OPENAI_API_KEY;
  return k && k.length > 0 ? k : null;
}

export function getGeminiKey(): string | null {
  const k = process.env.GEMINI_API_KEY;
  return k && k.length > 0 ? k : null;
}
