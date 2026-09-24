"use server";

import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/auth/require-organization";

const productStatuses = new Set(["ACTIVE", "INACTIVE", "ARCHIVED"]);
const trackingMethods = new Set(["RECIPE", "DIRECT", "NONE"]);
const inventoryRoles = new Set(["OWNER", "ADMIN", "INVENTORY_STAFF"]);

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function optionalField(formData: FormData, name: string) {
  const value = field(formData, name);
  return value.length > 0 ? value : null;
}

function numberField(formData: FormData, name: string, fallback = 0) {
  const raw = field(formData, name);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function productsUrl(type: "error" | "message", message: string) {
  return `/dashboard/products?${type}=${encodeURIComponent(message)}`;
}

function assertInventoryRole(role: string) {
  if (!inventoryRoles.has(role)) {
    redirect(productsUrl("error", "You do not have permission to change products."));
  }
}

export async function createCategoryAction(formData: FormData) {
  const name = field(formData, "name");
  const { supabase, organization, role } = await requireOrganization();
  assertInventoryRole(role);

  if (!name) {
    redirect(productsUrl("error", "Category name is required."));
  }

  const { error } = await supabase.from("categories").insert({
    organization_id: organization.id,
    name,
  });

  if (error) {
    redirect(productsUrl("error", error.code === "23505" ? "That category already exists." : error.message));
  }

  redirect(productsUrl("message", "Product category created."));
}

export async function createProductAction(formData: FormData) {
  const { supabase, organization, userId, role } = await requireOrganization();
  assertInventoryRole(role);

  const name = field(formData, "name");
  const sku = optionalField(formData, "sku");
  const barcode = optionalField(formData, "barcode");
  const categoryId = optionalField(formData, "category_id");
  const description = optionalField(formData, "description");
  const sellingPrice = numberField(formData, "selling_price");
  const taxPercent = numberField(formData, "tax_percent");
  const trackingMethod = field(formData, "tracking_method");
  const status = field(formData, "status") || "ACTIVE";
  const directUnitCode = optionalField(formData, "direct_unit_code");
  const reorderLevel = numberField(formData, "reorder_level");

  if (!name) redirect(productsUrl("error", "Product name is required."));
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) redirect(productsUrl("error", "Selling price must be zero or greater."));
  if (!Number.isFinite(taxPercent) || taxPercent < 0) redirect(productsUrl("error", "Tax rate must be zero or greater."));
  if (!trackingMethods.has(trackingMethod)) redirect(productsUrl("error", "Choose a valid tracking method."));
  if (!productStatuses.has(status)) redirect(productsUrl("error", "Choose a valid product status."));

  if (organization.inventory_model === "DIRECT_INVENTORY" && trackingMethod === "RECIPE") {
    redirect(productsUrl("error", "Recipe products are not available for a direct-inventory business."));
  }

  if (trackingMethod === "DIRECT") {
    if (!directUnitCode) redirect(productsUrl("error", "Direct products require a unit."));
    if (!Number.isFinite(reorderLevel) || reorderLevel < 0) redirect(productsUrl("error", "Reorder level must be zero or greater."));
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: organization.id,
      category_id: categoryId,
      name,
      sku,
      barcode,
      description,
      selling_price: sellingPrice,
      tax_rate: taxPercent / 100,
      status,
      tracking_method: trackingMethod,
      direct_unit_code: trackingMethod === "DIRECT" ? directUnitCode : null,
      reorder_level: trackingMethod === "DIRECT" ? reorderLevel : null,
    })
    .select("id")
    .single();

  if (error) {
    redirect(productsUrl("error", error.code === "23505" ? "SKU or barcode already exists for this business." : error.message));
  }

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userId,
    action: "PRODUCT_CREATED",
    entity_type: "product",
    entity_id: data.id,
    new_value: { name, sku, barcode, tracking_method: trackingMethod },
  });

  redirect(productsUrl("message", "Product created."));
}

export async function updateProductAction(formData: FormData) {
  const { supabase, organization, userId, role } = await requireOrganization();
  assertInventoryRole(role);

  const id = field(formData, "id");
  const name = field(formData, "name");
  const sku = optionalField(formData, "sku");
  const barcode = optionalField(formData, "barcode");
  const categoryId = optionalField(formData, "category_id");
  const description = optionalField(formData, "description");
  const sellingPrice = numberField(formData, "selling_price");
  const taxPercent = numberField(formData, "tax_percent");
  const trackingMethod = field(formData, "tracking_method");
  const status = field(formData, "status");
  const directUnitCode = optionalField(formData, "direct_unit_code");
  const reorderLevel = numberField(formData, "reorder_level");

  if (!id || !name) redirect(productsUrl("error", "Product id and name are required."));
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) redirect(productsUrl("error", "Selling price must be zero or greater."));
  if (!Number.isFinite(taxPercent) || taxPercent < 0) redirect(productsUrl("error", "Tax rate must be zero or greater."));
  if (!trackingMethods.has(trackingMethod) || !productStatuses.has(status)) redirect(productsUrl("error", "Invalid product configuration."));
  if (organization.inventory_model === "DIRECT_INVENTORY" && trackingMethod === "RECIPE") {
    redirect(productsUrl("error", "Recipe products are not available for a direct-inventory business."));
  }
  if (trackingMethod === "DIRECT" && (!directUnitCode || !Number.isFinite(reorderLevel) || reorderLevel < 0)) {
    redirect(productsUrl("error", "Direct products require a unit and a non-negative reorder level."));
  }

  const { error } = await supabase
    .from("products")
    .update({
      category_id: categoryId,
      name,
      sku,
      barcode,
      description,
      selling_price: sellingPrice,
      tax_rate: taxPercent / 100,
      status,
      tracking_method: trackingMethod,
      direct_unit_code: trackingMethod === "DIRECT" ? directUnitCode : null,
      reorder_level: trackingMethod === "DIRECT" ? reorderLevel : null,
    })
    .eq("organization_id", organization.id)
    .eq("id", id);

  if (error) redirect(productsUrl("error", error.message));

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userId,
    action: "PRODUCT_UPDATED",
    entity_type: "product",
    entity_id: id,
    new_value: { name, sku, barcode, status, tracking_method: trackingMethod },
  });

  redirect(productsUrl("message", "Product updated."));
}
