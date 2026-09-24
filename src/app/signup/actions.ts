"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function signupError(message: string) {
  return `/signup?error=${encodeURIComponent(message)}`;
}

export async function signupAction(formData: FormData) {
  const fullName = field(formData, "full_name");
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");

  if (!fullName || !email || !password) {
    redirect(signupError("Name, email, and password are required."));
  }

  if (password.length < 8) {
    redirect(signupError("Use a password with at least 8 characters."));
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    redirect(signupError(error.message));
  }

  if (data.session && data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
    });

    if (profileError) {
      redirect(signupError("Account created, but the profile could not be initialized."));
    }

    redirect("/onboarding");
  }

  redirect(
    `/login?message=${encodeURIComponent("Account created. Check your email to confirm your address, then sign in.")}`,
  );
}
