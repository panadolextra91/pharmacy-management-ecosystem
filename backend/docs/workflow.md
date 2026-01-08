# System Workflows

This document outlines the core workflows of the Pharmacy Management System, detailing actors, actions, and system responses for each module.

## 1. Authentication & Access Control

**Actors**: Owner, Staff, Customer

### Login Flow
1.  **Actor** provides credentials (Phone/Password for Owner/Staff, Phone/OTP for Customer).
2.  **System** validates credentials using `bcrypt` (for passwords) or `OTP Service`.
3.  **System** generates Access Token (JWT) and Refresh Token.
4.  **System** returns tokens and user profile.
5.  **Front-End** stores tokens securely (HTTP-only cookies or SecureStore).

### Tenant Isolation (Middleware)
1.  **Actor** makes a request to a protected route (e.g., `/api/inventory`).
2.  **Middleware** extracts `pharmacyId` from the Access Token.
3.  **Middleware** enforces that all database queries for this request are scoped to that `pharmacyId`.

---

## 2. Inventory Management

**Actors**: Owner, Staff

### Stock Management (FIFO)
1.  **Actor** adds stock (e.g., Import from Catalog or Manual Entry).
2.  **System** requires Batch Number and Expiry Date.
3.  **System** creates/updates `InventoryBatch` records.
4.  **System** updates `PharmacyInventory.totalStock` (sum of all batches).

### Low Stock Alerts
1.  **System** (Background Job) checks `totalStock` vs `minStockLevel`.
2.  **System** creates a notification if stock is low.

---

## 3. Global Catalog & Purchase Requests (Email Bridge)

**Actors**: Owner, Pharma Rep

### Catalog Ingestion
1.  **Admin** uploads CSV file (`POST /api/catalog/upload`).
2.  **System** parses CSV stream.
3.  **System** upserts medicines into `GlobalMedicineCatalog`.

### Purchase Request (Email Bridge)
1.  **Owner** selects multiple items from the Global Catalog.
2.  **System** groups items by `PharmaSalesRep`.
3.  **System** generates a **PENDING Purchase Invoice** for tracking.
4.  **System** sends an email to each Rep via `nodemailer` with the requested items.
5.  **Owner** later marks the Purchase Invoice as COMPLETED when goods arrive.

---

## 4.- **Sales & Point of Sale (POS)**: Core transaction flow, Receipt generation.
- **Analytics & Reporting**: Dashboard stats, Charts, Advanced Reports (P&L, Top Selling).
- **Customer Management (CRM)**: Identify customers, Track health info, View purchase history.
- **Medicine Reminders** (Planned Phase 6).

## 4. Sales & Point of Sale (POS)

**Actors**: Staff, Customer

### Order Processing Workflow

#### A. Order Creation
1.  **Staff** adds items to cart (selecting specific unit: Box/Pill).
2.  **System** calculates total price based on unit price.
3.  **System** handles Stock Check:
    *   Converts requested unit to Base Unit.
    *   Checks if `totalStock` >= requested amount.
4.  **Staff** confirms Order.
5.  **System** creates `PharmacyOrder` (Status: `CONFIRMED` or `PENDING`).

#### B. Stock Deduction (Automatic)
*Triggered on Order Confirmation*
1.  **System** converts Order Quantity to Base Unit.
2.  **System** retrieves `InventoryBatches` for the item, sorted by Expiry Date (Ascending).
3.  **System** iterates through batches:
    *   Deduct from Batch 1. If exhausted, move to Batch 2.
    *   Mark batches as `Empty` if quantity reaches 0.
4.  **System** updates `PharmacyInventory.totalStock`.

#### C. Invoice Generation
*Triggered on Order Payment/Delivery*
1.  **Staff** processes payment (Cash/Transfer).
2.  **System** updates Order `paymentStatus` to `PAID`.
3.  **System** generates `PharmacyInvoice` linked to the Order.
4.  **System** generates Receipt Data (JSON) for the Frontend, which renders and sends to printer:
    *   Pharmacy Info
    *   Items (Name, Quantity, Price)
    *   Total Amount
    *   QR Code (Optional)

---

## 5. Analytics & Staff Management
2.  **Staff Management**:
    1.  **Owner** lists staff members (`GET /auth/staff`).
    2.  **Owner** updates role/status (`PATCH /auth/staff/:id`).
    3.  **Owner** deactivates account (`DELETE /auth/staff/:id`).

### Analytics Dashboard
1.  **System** aggregates today's data (`GET /api/analytics/dashboard`).
    *   Revenue, Orders, Low Stock Items.
2.  **System** calculates Revenue Chart data (`GET /api/analytics/revenue-chart`).
3.  **Owner** requests Advanced Reports:
    *   **P&L**: System calculates Revenue vs Estimated COGS (Weighted Avg) for date range.
    *   **Top Selling**: System aggregates most sold items.
    *   **Valuation**: System sums value of current stock (`quantity * purchasePrice`).

## 6. Customer Management (CRM)

### Search & Profile
1.  **Staff** enters Name or Phone in search bar.
2.  **System** searches Global Customer DB.
3.  **Staff** selects customer -> views Profile (Age, Gender, Metrics) + Recent Orders at *this* pharmacy.

### Health Tracking
1.  **Staff** clicks "Add Vital" -> Enters Weight/BP -> System saves to `CustomerHealthMetrics` (History required? Currently overwrites/adds latest).
    *   *Note*: Our schema stores single `CustomerHealthMetrics` row per customer? No, it's 1:1 relation currently defined in schema, but typical pattern creates new rows for history.
    *   *Correction*: Schema has `CustomerHealthMetrics` as 1:1 (`customerId` @unique). So it updates *current* stats.
2.  **Staff** clicks "Add Allergy" -> System adds to `CustomerAllergy`.

### Customer Portal (Mobile App Self-Service)
1.  **Customer** logs in via Phone/OTP.
2.  **Customer** views **Global History** -> System returns orders from any pharmacy they visited.
3.  **Customer** updates Health -> "My Weight is 70kg" -> System upserts `CustomerHealthMetric`.
4.  **Customer** manages Allergies -> Deletes "Peanuts" (Mistake) -> System removes record.

### Staff Management (Owner Exclusive)
1.  **Pharmacy Owner** logs in.
2.  **Owner** goes to "Staff" tab -> Creates new account for Pharmacist.
3.  **System** validates `role=OWNER` -> Creates staff linked to Owner's pharmacy.
    *   *Note*: Regular Managers/Staff cannot access this module.

## 7. Medicine Reminders (Phase 6)

**Actors**: Customer, System (Workers)

### A. Scheduling Workflow
1.  **Customer** creates a reminder (e.g., "Panadol, Daily at 8:00 AM").
2.  **System** saves `MedicineReminder` config.
3.  **Worker (Scheduler)** runs every minute:
    *   Finds reminders due now.
    *   Checks if a notification is already scheduled for today.
    *   Creates a `ReminderNotification` (Status: `PENDING`).
    *   Adds job to `NotificationQueue` (BulMQ).

### B. Notification Delivery
1.  **Worker (Notification)** picks up job from Queue.
2.  **System** sends Push Notification (Expo) to Customer's device.
3.  **System** updates `ReminderNotification` status to `SENT`.

### C. Adherence Tracking (Smart Linking)
1.  **Customer** receives notification: "Time to take Panadol".
2.  **Customer** taps "Take" (or opens app later).
3.  **Customer** calls API `POST /api/reminders/:id/actions` (Action: `taken`).
    *   *Option A*: App sends `notificationId` from the push payload.
    *   *Option B*: App sends just `reminderId` -> Backend finds recent `PENDING/SENT` notification.
4.  **System** marks `ReminderNotification` as `ACKNOWLEDGED`.
5.  **System** creates `ReminderLog` (Type: `taken`).

### D. Missed Dose Logic
1.  **Worker (Missed Check)** runs periodically (every 5m).
2.  **System** looks for `SENT` or `PENDING` notifications > 15 minutes old.
3.  **System** marks `ReminderNotification` as `FAILED` (Msg: Timeout).
4.  **System** creates `ReminderLog` (Type: `missed`).
