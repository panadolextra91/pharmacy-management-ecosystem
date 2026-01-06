# Sales, Purchase & Analytics Implementation Plan

## 1. Overview
This document outlines the strategy to implement **Sales (Output)** and **Purchases (Input)** flows to enable accurate Reports & Analytics (Revenue, Expenses, Profit).

## 2. The Core Problem (Current State)
Currently, our `InventoryBatch` table tracks **Current Stock**.
- It has `purchasePrice` and `stockQuantity`.
- **Issue:** As you sell items, `stockQuantity` decreases.
- **Consequence:** We lose the record of "How many did I originally buy?".
    - Example: Bought 100 @ $1. Spent $100.
    - If we calculate Import Cost now: 50 * $1 = $50. **Wrong**. We actually spent $100.

**Conclusion:** We cannot generate accurate "Import Cost" reports with the current schema alone. We need a dedicated history of **Inbound Transactions**.

## 3. Proposed Solution: "Purchase Invoices" & Rep Integration

(Located in **TENANT ZONE**: Strictly isolated by `pharmacyId`, similar to `PharmacyOrder` and `PharmacyInvoice`)

### 3.1 The "Marketplace" Workflow (Discovery & Ordering)

The user requested a workflow where Reps send catalogs and Owners order via email.

1.  **Catalog Ingestion (Digital Discovery)**:
    *   **Action**: Pharma Rep uploads a CSV file (Catalog) to the system.
    *   **System**: Parses CSV and displays "Deals of the Month" or "New Arrivals" on the Pharmacy Owner's dashboard.
2.  **Purchase Request (Email Bridge)**:
    *   **Action**: Pharmacy Owner selects items from the dashboard and clicks "Request Purchase".
    *   **System**: Uses `Nodemailer` to send a formatted email to the Pharma Rep (e.g., "Pharmacy X wants to buy A, B, C...").
    *   *Note: No financial transaction happens in the system yet. This is just a "Request for Quote/Order".*
3.  **Confirmation & Invoice (Financial Record)**:
    *   **Action**: Pharma Rep confirms the order (offline/email reply).
    *   **Action**: Pharmacy Owner receives goods + paper bill.
    *   **Action**: Owner effectively "Digitalizes" this bill by manually creating a **Purchase Invoice** in the system (see below).

### 3.2 New Database Models (Import Management)

#### `PurchaseInvoice` (The Bill from Supplier)
Represents a restocking event (importing medicines).
- `supplierId`: Who we bought from.
- `totalAmount`: Total money spent.
- `invoiceDate`: When the transaction happened (crucial for "This Month" reports).
- `status`: PENDING / PAID / CANCELLED.

#### `PurchaseItem` (Line Items)
- `inventoryId`: What we bought.
- `batchNumber`: The batch code printed on the box.
- `expiryDate`: When it expires.
- `quantity`: How many we bought (Immutable record).
- `unitPrice`: Cost per unit.

### 3.3 The Financial Workflow (Closing the Loop)
1.  **Owner creates a Purchase Invoice** (Digitalizing the paper bill from Rep).
2.  Adds items (Medicine A, Batch X, Qty 100, Price $1).
3.  **Confirm/Receive**:
    - System creates/updates `InventoryBatch` (adds stock to inventory).
    - System calculates `totalAmount` ($100).
4.  **Result**: We now have a permanent record that on Jan 6th, we spent $100.

## 4. Sales Workflow (The Revenue Stream)

The Sales module is already largely supported by `PharmacyOrder`, but we will refine the logic.

### 4.1 Order Flow
1.  **Order Created**: Status `PENDING`. Stock **NOT** deducted yet (just reserved or checked).
2.  **Order Confirmed**: Stock deducted from `InventoryBatch` (FIFO Logic).
3.  **Delivery/Pickup**: Status `DELIVERED`.
4.  **Payment**: Status `PAID`.
5.  **Invoice Generated**: `PharmacyInvoice` created (Official receipt for customer).

## 5. Analytics & Reports Strategy

With both **Sales (Out)** and **Purchases (In)** tracked, we can build the Report Dashboard.

### 5.1 Key Metrics (Monthly/Daily)

| Metric | Formula | Data Source |
| :--- | :--- | :--- |
| **Total Revenue (Sales)** | Sum of `PharmacyInvoice.totalAmount` | `PharmacyInvoice` (where type=ONLINE or OFFLINE) |
| **Total Import Cost** | Sum of `PurchaseInvoice.totalAmount` | **New** `PurchaseInvoice` Table |
| **Gross Profit (Cash Flow)** | Sales - Import Cost | Calculated |
| **Net Profit** | Sales - (COGS + Expenses) | Advanced (Future) |

### 5.2 Implementation Steps (Phase 4 & Phase 7 Combined)

#### Step 1: Purchase Module (Immediate Priority)
- Create `PurchaseInvoice` and `PurchaseItem` models.
- Implement API to "Import Goods" -> This will internally call our existing `addStock` logic but ALSO save the invoice record.

#### Step 2: Sales Module
- Implement Order APIs (Create, Confirm, Pay).
- Implement "Deduct Stock" logic (already done in Phase 3) integrated into Order Confirmation.
- Generate `PharmacyInvoice` on completion.

#### Step 3: Analytics Service
- Create an implementation to aggregate these sums by date range.
- `getMonthlyReport(month, year)` -> returns `{ sales: 100, imports: 80, profit: 20 }`.

## 6. Schema Changes (Implemented)

```prisma
// Successfully integrated in Phase 4 Part 1
model PurchaseInvoice {
  id            String   @id @default(cuid())
  pharmacyId    String
  supplierId    String?  // Optional (could be ad-hoc import)
  invoiceNumber String?  // Supplier's invoice #
  totalAmount   Decimal
  status        String   // PENDING, COMPLETED
  createdAt     DateTime @default(now())

  items         PurchaseItem[]
}

model PurchaseItem {
  id                String @id @default(cuid())
  purchaseInvoiceId String
  inventoryId       String
  batchNumber       String
  expiryDate        DateTime
  quantity          Int
  unitPrice         Decimal
}
```

## 7. Recommendation
Proceed to **Phase 4** by first implementing the **Purchase/Import Infrastructure** (Schema updates) before building the Order system. This ensures that every item sold has a tracked origin and cost.
