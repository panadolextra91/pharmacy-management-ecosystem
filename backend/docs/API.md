# Pharmacy Management System API Documentation

## Base URL
`/api`

## Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| POST | `/register/owner` | Register a new Pharmacy Owner | No |
| POST | `/login/owner` | Login as Owner | No |
| POST | `/register/staff` | Register new Staff (Owner/Manager only) | Yes |
| POST | `/login/staff` | Login as Staff | No |
| POST | `/register/customer` | Register new Customer | No |
| POST | `/login/customer` | Login as Customer | No |
| POST | `/refresh-token` | Refresh Access Token | No |
| POST | `/logout` | Logout (Invalidate Refresh Token) | No |
| POST | `/verify-otp` | Verify OTP (for registration/login) | No |
| POST | `/admin/register` | Register System Admin (First setup) | No |
| POST | `/admin/login` | Login as System Admin | No |
| POST | `/admin/refresh` | Refresh Admin Token | No |
| GET | `/staff` | List all staff members (Manager/Owner only) | Yes |
| PATCH | `/staff/:id` | Update staff details (Role, Status) | Yes |
| DELETE | `/staff/:id` | Deactivate staff member | Yes |

## System Admin - Owner Management (`/api/auth/admin`) 🔐
*God Mode - Only System Admin can access these endpoints.*

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/admin/owners` | List all Owners. Query: `status` (PENDING/ACTIVE/SUSPENDED) | Yes (Admin) |
| GET | `/admin/owners/:id` | Get Owner details with pharmacies list | Yes (Admin) |
| PUT | `/admin/owners/:id/approve` | Approve pending Owner. Body: `{ subscriptionExpiry?: Date }` | Yes (Admin) |
| PUT | `/admin/owners/:id/suspend` | Suspend Owner. Body: `{ reason?: string }` | Yes (Admin) |
| PUT | `/admin/owners/:id/reactivate` | Reactivate suspended Owner | Yes (Admin) |


## Global Medicine Catalog (`/api/catalog`)
*Managed by Platform Admins & Pharma Reps. Shared across all pharmacies.*

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/` | List medicines (Query: `page`, `limit`, `search`, `categoryId`, `manufacturer`) | Yes |
| GET | `/:id` | Get medicine details | Yes |
| POST | `/` | Create new medicine in global catalog | Yes |
| PATCH | `/:id` | Update medicine details | Yes |
| DELETE | `/:id` | Delete medicine | Yes |
| POST | `/request-otp` | Request OTP for Pharma Rep (Body: `{ email }`) | **No** (Public) |
| POST | `/upload` | Bulk upload CSV catalog (**OTP Verified**. Body: `file`, `email`, `otp`, `supplierId`) | **No** (Public) |
| GET | `/pending` | List pending medicines for approval | Yes (**Owner/Admin**) |
| PATCH | `/approve` | Approve catalog items (Body: `{ ids: [] }`) | Yes (**Owner/Admin**) |
| POST | `/purchase-request` | Send email purchase request to Pharma Reps (Body: `{ items: [{ catalogItemId, quantity }] }`) | Yes |

## Sales (`/api/sales`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| POST | `/orders` | Create new Order. Supports POS (Walk-in) via `isPosSale: true`. Triggers Stock Deduction & Invoice. | Yes |
| GET | `/invoices/:id/receipt` | Get structured receipt data (JSON) for printing/PDF generation. | Yes |

## Inventory Management (`/api/inventory`)
*Scoped to specific Pharmacy. Requires `pharmacyId` context.*

### Storage Locations (`/api/inventory/locations`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/` | List all storage locations | Yes |
| GET | `/:id` | Get location details | Yes |
| POST | `/` | Create new storage location | Yes |
| PATCH | `/:id` | Update location | Yes |
| DELETE | `/:id` | Delete location | Yes |

### 🔐 Authentication & Headers
- **Authorization**: `Bearer <token>` (Required for all)
- **x-pharmacy-id**: `string` (Required for Owner accounts to specify context. Staff accounts auto-detected).

#### Endpoints
- `POST /auth/staff/register`: Requires `x-pharmacy-id` header (Owner only).
- `POST /auth/customers/login`: Supports `password` OR `otp`.

---

### 📦 Inventory (Kho hàng)
**Base URL**: `/api/inventory`
> **Note**: `GET /` List Items returns **RICH DATA** including:
> - Full `units` list (with conversion factors)
> - Active `batches` (FIFO/FEFO ready)
> - Expanded `category` info

| Method | Endpoint | Description | Headers |
|--------|----------|-------------|---------|
| `GET` | `/` | List inventory items (Rich Data) | `x-pharmacy-id` (Owner) |
| `POST` | `/` | Create item | `x-pharmacy-id` (Owner) |
| `PATCH` | `/:id` | Update item | `x-pharmacy-id` (Owner) |
| `DELETE` | `/:id` | Soft delete item | `x-pharmacy-id` (Owner) |
| `POST` | `/:id/stock` | Add stock (Batch In) | `x-pharmacy-id` (Owner) |
| `GET` | `/alerts/expiry` | Get expiring items | `x-pharmacy-id` (Owner) |
| `GET` | `/alerts/stock` | Get low stock items | `x-pharmacy-id` (Owner) |

---

### 💊 Sales (Bán hàng)
**Base URL**: `/api/sales`

#### 1. Create Order
`POST /api/sales/orders`

**Headers**: `x-pharmacy-id` (Owner)

**Request Body** (Secure - Server-side Pricing):
```json
{
  "customerId": "cus_123",
  "paymentMethod": "CASH",
  "isPosSale": true,
  "items": [
    {
      "inventoryId": "inv_123",
      "quantity": 2,      // Must be >= 1
      "unitId": "unit_456" // ID from InventoryUnit table
    }
  ]
}
```

> **Note**: `price` is NO LONGER accepted from client. Server calculates price based on `unitId`.

---

### 📊 Analytics (Báo cáo)
**Base URL**: `/api/analytics`

| Method | Endpoint | Description | Caching (Redis) |
|--------|----------|-------------|-----------------|
| `GET` | `/dashboard` | General Stats (Revenue, Low Stock) | **30s TTL** |
| `GET` | `/revenue-chart` | Chart Data (Last 7 days) | No |
| `GET` | `/profit-loss` | P&L Report | No |
| `GET` | `/top-selling` | Top Products | No |

> **Headers**: All Analytics endpoints accept `x-pharmacy-id` for Owner context.

## Purchase Management (`/api/purchases`)
*Scoped to specific Pharmacy. Requires `pharmacyId` context.*

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/` | List invoices (Query: `page`, `limit`, `startDate`, `endDate`, `supplierId`, `status`) | Yes |
| GET | `/:id` | Get invoice details (includes items) | Yes |
| POST | `/` | Create new purchase invoice (Digitalize Bill) | Yes |
| PATCH | `/:id/status` | Update status (e.g., PENDING -> CONFIRMED). **CONFIRMED adds stock.** | Yes |

## Analytics (`/api/analytics`)
*Scoped to specific Pharmacy. Requires `pharmacyId` context.*

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/dashboard` | **Get Today's Stats**. Returns: `todayRevenue`, `todayOrders`, `lowStockCount`, `totalCustomers`. **Includes Widgets**: `lowStockItems[]` (Top 5 items), `expiringBatches[]` (Next 30 days). | Yes |
| GET | `/revenue-chart` | Get Revenue Chart data (Query: `days`, default 7) | Yes |
| GET | `/profit-loss` | **P&L Report**. Query: `startDate`, `endDate` (YYYY-MM-DD). Returns Revenue, COGS (Est), Gross Profit. | Yes |
| GET | `/top-selling` | **Top Products**. Query: `limit`. Returns most sold items. | Yes |
| GET | `/inventory-valuation` | **Warehouse Value**. Returns Total Asset Value (Cost Basis). | Yes |

## 5. Customer Management (CRM)

### Base Path: `/api/customers`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/` | **Search**. Query: `search` (name/phone), `page`, `limit`. | Yes |
| POST | `/` | **Create**. Body: `{ phone, fullName, email?, dateOfBirth?, gender? }`. | Yes |
| GET | `/:id` | **Get Profile**. Returns details + recent orders + health linked to *this* pharmacy. | Yes |

### Customer Portal (Mobile App)
**Base Path**: `/api/customers/me`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/` | **Get My Profile**. View own profile, metrics, allergies. | Yes (Customer) |
| PATCH | `/` | **Update Me**. Update Name, Email. (Phone is immutable). | Yes (Customer) |
| GET | `/history` | **My History**. View GLOBAL purchase history across ALL pharmacies. | Yes (Customer) |
| POST | `/metrics` | **Add Metric**. Upsert health metric (Weight, BP, etc). | Yes (Customer) |
| DELETE | `/allergies/:id` | **Delete Allergy**. Remove an allergy record. | Yes (Customer) |
| DELETE | `/records/:id` | **Delete Record**. Remove a medical record. | Yes (Customer) |

## 6. Access Control & Staff Management

### Base Path: `/api`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| POST | `/staff/register` | **Create Staff**. **OWNER ONLY**. Register new staff for pharmacy. | Yes (Owner) |
| GET | `/staff` | **List Staff**. **OWNER ONLY**. View all staff. | Yes (Owner) |
| PATCH | `/staff/:id` | **Update Staff**. **OWNER ONLY**. Edit staff details/role. | Yes (Owner) |
| DELETE | `/staff/:id` | **Remove Staff**. **OWNER ONLY**. Deactivate/Delete staff. | Yes (Owner) |

## 7. Medicine Reminder System (Phase 6)

### Base Path: `/api/reminders`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| POST | `/` | **Create Reminder**. Body: `{ medicineName, dosage, type, frequencyType, time, specificDays?, intervalDays?, startDate, endDate?, notes? }`. | Yes (Customer) |
| GET | `/` | **List Reminders**. Query: `page`, `limit`, `isActive`. Returns list of active/inactive reminders. | Yes (Customer) |
| GET | `/history` | **Adherence History**. Returns logs of Taken/Skipped/Missed actions. | Yes (Customer) |
| GET | `/:id` | **Get Reminder**. View details of a specific reminder. | Yes (Customer) |
| PATCH | `/:id` | **Update Reminder**. Edit schedule or details. | Yes (Customer) |
| DELETE | `/:id` | **Delete Reminder**. Soft delete (or hard if no logs). | Yes (Customer) |
| POST | `/:id/actions` | **Log Action**. Body: `{ actionType: 'taken'|'skipped'|'missed', notes?, notificationId? }`. Smartly links to pending notifications. | Yes (Customer) |
| POST | `/:id/actions` | **Log Action**. Body: `{ actionType: 'taken'|'skipped'|'missed', notes?, notificationId? }`. Smartly links to pending notifications. | Yes (Customer) |

## 8. Staff Notifications & Alerts (Phase 7)

### Base Path: `/api/notifications`
*Scoped to Pharmacy Staff (Manager, Pharmacist) and Owners.*

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/` | **List Notifications**. Query: `page`, `limit`, `isRead` (boolean), `type`. | Yes |
| GET | `/unread-count` | **Badge Count**. Returns number of unread notifications. | Yes |
| PATCH | `/:id/read` | **Mark as Read**. Mark a single notification as read. | Yes |
| PATCH | `/read-all` | **Mark All Read**. Mark all notifications for the current user as read. | Yes |

### Notification Types
*   `ORDER_NEW`: Triggered when a new online order is placed.
*   `INVENTORY_LOW_STOCK`: Triggered when stock falls below minimum level.
*   `INVENTORY_EXPIRY_ALERT`: Triggered daily for batches expiring within 30 days.
*   `CATALOG_IMPORTED`: Triggered when a new global catalog CSV is imported (Owner/Manager only).
