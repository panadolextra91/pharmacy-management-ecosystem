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

## Global Medicine Catalog (`/api/catalog`)
*Managed by Platform Admins & Pharma Reps. Shared across all pharmacies.*

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/` | List medicines (Query: `page`, `limit`, `search`, `categoryId`, `manufacturer`) | Yes |
| GET | `/:id` | Get medicine details | Yes |
| POST | `/` | Create new medicine in global catalog | Yes |
| PATCH | `/:id` | Update medicine details | Yes |
| DELETE | `/:id` | Delete medicine | Yes |
| POST | `/upload` | Bulk upload CSV catalog (Requires `file`, `supplierId`, `pharmaRepId`) | Yes |
| POST | `/purchase-request` | Send email purchase request to Pharma Reps (Body: `{ items: [{ catalogItemId, quantity }] }`) | Yes |

## Sales (`/api/sales`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| POST | `/orders` | Create new Order. Supports POS (Walk-in) via `isPosSale: true`. Triggers Stock Deduction & Invoice. | Yes |

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

### Inventory Items (`/api/inventory/items`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/` | List inventory items (Query: `page`, `limit`, `search`, `categoryId`, `locationId`) | Yes |
| GET | `/:id` | Get item details (includes units, batches) | Yes |
| POST | `/` | Create new inventory item (with units) | Yes |
| PATCH | `/:id` | Update item details | Yes |
| DELETE | `/:id` | Delete item (only if no stock) | Yes |
| POST | `/:id/stock` | Add stock (Batch In) | Yes |
| POST | `/:id/adjust` | Adjust stock (Deduct) | Yes |

### Alerts (`/api/inventory/alerts`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/expiry` | Get items expiring soon (Query: `days`) | Yes |
| GET | `/stock` | Get items below min stock level (totalStockLevel <= minStockLevel) | Yes |

## Purchase Management (`/api/purchases`)
*Scoped to specific Pharmacy. Requires `pharmacyId` context.*

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| GET | `/` | List invoices (Query: `page`, `limit`, `startDate`, `endDate`, `supplierId`, `status`) | Yes |
| GET | `/:id` | Get invoice details (includes items) | Yes |
| POST | `/` | Create new purchase invoice (Digitalize Bill) | Yes |
| PATCH | `/:id/status` | Update status (e.g., PENDING -> CONFIRMED). **CONFIRMED adds stock.** | Yes |
