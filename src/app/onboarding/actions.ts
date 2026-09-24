"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";

const inventoryModels = new Set(["RECIPE_AND_STOCK", "DIRECT_INVENTORY"]);

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function onboardingError(message: string) {
  return `/onboarding?error=${encodeURIComponent(message)}`;
}

export async function createOrganizationAction(formData: FormData) {
  const name = field(formData, "name");
  const slug = field(formData, "slug").toLowerCase();
  const inventoryModel = field(formData, "inventory_model");

  if (name.length < 2) {
    redirect(onboardingError("Business name must contain at least 2 characters."));
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    redirect(onboardingError("Business slug may contain lowercase letters, numbers, and single hyphens."));
  }

  if (!inventoryModels.has(inventoryModel)) {
    redirect(onboardingError("Choose a valid inventory model."));
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("create_organization_with_defaults", {
    p_name: name,
    p_slug: slug,
    p_inventory_model: inventoryModel,
  });

  if (error) {
    const message =
      error.code === "23505"
        ? "That business slug is already in use. Choose another one."
        : error.message;
    redirect(onboardingError(message));
  }

  redirect("/dashboard");
}
