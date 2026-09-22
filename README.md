# Vouxr Business OS

Vouxr Business OS is a mobile-first, multi-business accounting and inventory PWA for small and medium-sized businesses.

## Product contract

The system is built around four non-negotiable principles:

1. Every business-scoped record belongs to an `organization_id`.
2. Inventory and stock changes are movement-driven and auditable.
3. Accounting uses balanced double-entry journals; posted financial transactions are corrected through void, refund, reversal, or correction flows instead of hard deletion.
4. AI may explain, classify, extract, and surface insights, but deterministic server-side accounting and inventory logic remains the source of truth.

## V1 scope

V1 covers authentication, organization onboarding, direct inventory, ingredient stocks, recipes and recipe versioning, unit conversion, sales/POS, purchasing, expenses, AR/AP, double-entry accounting, reports, AI-assisted querying and receipt extraction, audit logs, and installable PWA support.

## Stack

- Next.js + TypeScript
- Supabase Auth, PostgreSQL, Storage, and Row Level Security
- Tailwind CSS
- Vercel
- OpenAI-compatible AI provider abstraction

## Status

Foundation build in progress. The initial implementation sequence is:

1. Project/tooling foundation
2. Authentication + organization isolation
3. Canonical database schema and RLS
4. Products, units, stocks, recipes, and inventory movements
5. Sales/POS and deterministic posting services
6. Purchasing, expenses, AR/AP, reports, AI, and PWA hardening

The uploaded **AI Accounting & Inventory PWA — Master Source of Truth** is the governing product specification for this repository.
