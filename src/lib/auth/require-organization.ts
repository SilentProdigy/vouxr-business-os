import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";

export async function requireOrganization() {
  const { supabase, userId } = await requireUser();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id,name,slug,inventory_model,currency_code,timezone")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (organizationError) {
    throw new Error(`Unable to load organization: ${organizationError.message}`);
  }

  if (!organization) {
    redirect("/onboarding");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Unable to load organization membership: ${membershipError.message}`);
  }

  if (!membership) {
    redirect("/login");
  }

  return {
    supabase,
    userId,
    organization,
    role: membership.role as "OWNER" | "ADMIN" | "ACCOUNTANT" | "CASHIER" | "INVENTORY_STAFF" | "VIEWER",
  };
}
