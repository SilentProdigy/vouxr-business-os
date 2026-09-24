"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function loginError(message: string) {
  return `/login?error=${encodeURIComponent(message)}`;
}

export async function loginAction(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");

  if (!email || !password) {
    redirect(loginError("Email and password are required."));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(loginError(error.message));
  }

  const { data: organizations, error: organizationsError } = await supabase
    .from("organizations")
    .select("id")
    .limit(1);

  if (organizationsError) {
    redirect(loginError("Signed in, but the business workspace could not be loaded."));
  }

  redirect(organizations && organizations.length > 0 ? "/dashboard" : "/onboarding");
}
