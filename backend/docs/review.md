# System Review & Architectural Suggestions

## ✅ Completed Improvements

### 1. Row Level Security (RLS) - Application-side via Prisma Extensions
**Status**: ☑️ DONE

Đã implement `Prisma Client Extensions` (`backend/src/shared/prisma/client.ts`) để tự động enforce `pharmacyId` và `isDeleted` filtering.

**What was done**:
- Refactored `InventoryRepository`, `SalesRepository`, `AuthRepository` (Staff) để sử dụng `createTenantPrisma()`.
- RLS Extension auto-injects `{ pharmacyId, isDeleted: false }` vào READ queries cho `PharmacyInventory`.
- Repositories giờ đây an toàn hơn - không thể query nhầm data của Pharmacy khác.

---

### 2. Financial Accuracy (Snapshot Pricing)
**Status**: ☑️ DONE

Đã giải quyết vấn đề COGS bi-directional mutation.

**What was done**:
- Added `costPrice` column to `OrderItem` (`Decimal(19,4)`).
- Updated `SalesService.createOrder()` to fetch `purchasePrice` from FIFO batch via `getOldestBatchCost()` at sale time.
- Cost price is now **immutable** - P&L reports will always be accurate regardless of future price changes.

**Migration Applied**: `20260205115114_add_cost_price_and_soft_delete`

---

### 3. Soft Delete Logic
**Status**: ☑️ DONE

Đã chuyển từ hard delete sang soft delete cho Inventory.

**What was done**:
- Added `isDeleted` column to `PharmacyInventory` and `InventoryBatch`.
- Refactored `InventoryRepository.delete()` to set `isDeleted: true` instead of `DELETE`.
- Updated RLS Extension to auto-filter `isDeleted: false` - soft-deleted records are hidden automatically.

---

### 4. System Admin SaaS Logic (God Mode) 🔐
**Status**: ☑️ DONE

Đã triển khai hoàn chỉnh Business Model "All-in-One" với Owner approval workflow.

**What was done**:
- Added `OwnerStatus` enum (`PENDING`, `ACTIVE`, `SUSPENDED`) and `subscriptionExpiry` to Owner model.
- Created `requireSystemAdmin` middleware for God Mode access control.
- Implemented Owner Management APIs: list, approve, suspend, reactivate.
- Updated `loginOwner` to block PENDING/SUSPENDED accounts.
- Created `seed-admin.ts` script to initialize Super Admin.

**Migration Applied**: `20260205120723_add_owner_status_and_subscription`

**Business Rules**:
- Owner đăng ký mới → `status = PENDING` → không thể login
- Admin approve → `status = ACTIVE` → **KHÔNG GIỚI HẠN** Pharmacy/Staff
- Admin suspend → `status = SUSPENDED` → bị khóa hoàn toàn

---

## 🔄 Recently Completed

### 5. Inventory Reconciliation (Self-Healing) 🔧
**Status**: ☑️ DONE

**What was done**:
- Created `inventory-reconciliation.worker.ts` - runs every 1 hour.
- Compares `totalStockLevel` with `SUM(batch.stockQuantity)`.
- Auto-fixes any discrepancies and logs: `[FIXED] Inventory ID ... Mismatch corrected`.
- Prevents data drift from race conditions.

---

### 6. Analytics Caching (Redis) ⚡
**Status**: ☑️ DONE

**What was done**:
- Implemented Redis caching for Dashboard API (`GET /analytics/dashboard`).
- Cache key: `dashboard:${pharmacyId}`.
- **TTL: 30 seconds** (optimized for demo).
- Response includes `cached: true/false` and `ttl` for transparency.

---

## Schema Changes Applied

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `order_items` | `cost_price` | Decimal(19,4) | Snapshot COGS for P&L |
| `pharmacy_inventory` | `is_deleted` | Boolean (default: false) | Soft delete |
| `inventory_batches` | `is_deleted` | Boolean (default: false) | Soft delete |
| `owners` | `status` | Enum (PENDING/ACTIVE/SUSPENDED) | SaaS approval workflow |
| `owners` | `subscription_expiry` | DateTime (nullable) | Subscription tracking |
