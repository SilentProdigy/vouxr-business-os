"use server";

import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/auth/require-organization";

const inventoryRoles = new Set(["OWNER", "ADMIN", "INVENTORY_STAFF"]);
const statuses = new Set(["ACTIVE", "INACTIVE", "ARCHIVED"]);

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

function stocksUrl(type: "error" | "message", message: string) {
  return `/dashboard/stocks?${type}=${encodeURIComponent(message)}`;
}

function assertCanManage(role: string, inventoryModel: string) {
  if (inventoryModel !== "RECIPE_AND_STOCK") {
    redirect("/dashboard");
  }
  if (!inventoryRoles.has(role)) {
    redirect(stocksUrl("error", "You do not have permission to change ingredient stocks."));
  }
}

export async function createStockCategoryAction(formData: FormData) {
  const name = field(formData, "name");
  const { supabase, organization, role } = await requireOrganization();
  assertCanManage(role, organization.inventory_model);

  if (!name) redirect(stocksUrl("error", "Stock category name is required."));

  const { error } = await supabase.from("stock_categories").insert({
    organization_id: organization.id,
    name,
  });

  if (error) {
    redirect(stocksUrl("error", error.code === "23505" ? "That stock category already exists." : error.message));
  }

  redirect(stocksUrl("message", "Stock category created."));
}

export async function createStockItemAction(formData: FormData) {
  const { supabase, organization, role } = await requireOrganization();
  assertCanManage(role, organization.inventory_model);

  const name = field(formData, "name");
  const sku = optionalField(formData, "sku");
  const stockCategoryId = optionalField(formData, "stock_category_id");
  const baseUnitCode = field(formData, "base_unit_code");
  const reorderLevel = numberField(formData, "reorder_level");
  const preferredSupplierName = optionalField(formData, "preferred_supplier_name");
  const status = field(formData, "status") || "ACTIVE";
  const openingQuantity = numberField(formData, "opening_quantity");
  const openingUnitCostRaw = field(formData, "opening_unit_cost");
  const openingUnitCost = openingUnitCostRaw ? Number(openingUnitCostRaw) : null;

  if (!name || !baseUnitCode) redirect(stocksUrl("error", "Name and base unit are required."));
  if (!statuses.has(status)) redirect(stocksUrl("error", "Choose a valid stock status."));
  if (!Number.isFinite(reorderLevel) || reorderLevel < 0) redirect(stocksUrl("error", "Reorder level must be zero or greater."));
  if (!Number.isFinite(openingQuantity) || openingQuantity < 0) redirect(stocksUrl("error", "Opening quantity cannot be negative."));
  if (openingUnitCost !== null && (!Number.isFinite(openingUnitCost) || openingUnitCost < 0)) {
    redirect(stocksUrl("error", "Opening unit cost cannot be negative."));
  }

  const { error } = await supabase.rpc("create_stock_item_with_opening_balance", {
    p_organization_id: organization.id,
    p_name: name,
    p_sku: sku,
    p_stock_category_id: stockCategoryId,
    p_base_unit_code: baseUnitCode,
    p_reorder_level: reorderLevel,
    p_preferred_supplier_name: preferredSupplierName,
    p_status: status,
    p_opening_quantity: openingQuantity,
    p_opening_unit_cost: openingUnitCost,
  });

  if (error) {
    redirect(stocksUrl("error", error.code === "23505" ? "That stock SKU already exists for this business." : error.message));
  }

  redirect(stocksUrl("message", "Stock item created with its opening balance."));
}

export async function updateStockItemAction(formData: FormData) {
  const { supabase, organization, userId, role } = await requireOrganization();
  assertCanManage(role, organization.inventory_model);

  const id = field(formData, "id");
  const name = field(formData, "name");
  const sku = optionalField(formData, "sku");
  const stockCategoryId = optionalField(formData, "stock_category_id");
  const baseUnitCode = field(formData, "base_unit_code");
  const reorderLevel = numberField(formData, "reorder_level");
  const preferredSupplierName = optionalField(formData, "preferred_supplier_name");
  const status = field(formData, "status");

  if (!id || !name || !baseUnitCode) redirect(stocksUrl("error", "Stock item id, name, and base unit are required."));
  if (!statuses.has(status)) redirect(stocksUrl("error", "Choose a valid stock status."));
  if (!Number.isFinite(reorderLevel) || reorderLevel < 0) redirect(stocksUrl("error", "Reorder level must be zero or greater."));

  const { error } = await supabase
    .from("stock_items")
    .update({
      stock_category_id: stockCategoryId,
      name,
      sku,
      base_unit_code: baseUnitCode,
      reorder_level: reorderLevel,
      preferred_supplier_name: preferredSupplierName,
      status,
    })
    .eq("organization_id", organization.id)
    .eq("id", id);

  if (error) redirect(stocksUrl("error", error.message));

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: userId,
    action: "STOCK_ITEM_UPDATED",
    entity_type: "stock_item",
    entity_id: id,
    new_value: { name, sku, base_unit_code: baseUnitCode, reorder_level: reorderLevel, status },
  });

  redirect(stocksUrl("message", "Stock item updated. Quantity was not overwritten."));
}
