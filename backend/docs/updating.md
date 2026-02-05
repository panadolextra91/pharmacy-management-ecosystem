# Backend Project Status Review

## 1. Tổng Quan Tình Hình (Current Status)

Backend của mình (`pharmacy-management-system`) hiện tại đã hoàn thiện bộ khung sườn chính (Core) và đã implement đầy đủ các module quan trọng nhất theo kế hoạch Architecture Monolith.

Hệ thống được xây dựng trên stack: **Node.js (Express) + TypeScript + Prisma + PostgreSQL + Redis (BullMQ)**.

---

## 1.5 Recent Improvements (Feb 2026)

### ✅ Security & Data Isolation
- **Row Level Security (RLS)**: Implemented via Prisma Client Extensions (`createTenantPrisma`). 
  - Auto-injects `pharmacyId` filter vào queries.
  - Tự động filter `isDeleted: false` cho soft delete.
  - Applied to: `Inventory`, `Sales`, `Auth` modules.

### ✅ Financial Accuracy  
- **Snapshot Pricing**: Added `costPrice` to `OrderItem`.
  - Lưu giá vốn tại thời điểm bán (FIFO batch `purchasePrice`).
  - P&L reports giờ đây chính xác bất kể giá nhập thay đổi sau này.

### ✅ Soft Delete
- Added `isDeleted` column to `PharmacyInventory` và `InventoryBatch`.
- DELETE APIs giờ đây dùng soft delete thay vì xóa cứng.

### ✅ System Admin SaaS Logic (God Mode) 🔐
- **Owner Status Management**: Enum `PENDING`, `ACTIVE`, `SUSPENDED`.
  - Owner đăng ký mới → `PENDING` → không login được.
  - Admin approve → `ACTIVE` → dùng full features, **không giới hạn** Pharmacy/Staff.
  - Admin suspend → `SUSPENDED` → bị khóa.
- **Middleware**: `requireSystemAdmin` - chỉ System Admin mới được quản lý Owner.
- **APIs mới**: 
  - `GET /admin/owners` - List all Owners
  - `PUT /admin/owners/:id/approve` - Duyệt Owner
  - `PUT /admin/owners/:id/suspend` - Đình chỉ Owner
- **Script**: `npx ts-node prisma/seed-admin.ts` - Tạo Super Admin.

### ✅ Inventory Reconciliation Worker 🔧
- **Self-Healing Cronjob**: Chạy mỗi 1 tiếng.
- Logic: `totalStockLevel = SUM(batch.stockQuantity)`.
- Tự động fix nếu phát hiện sai lệch → Log `[FIXED]`.

### ✅ Analytics Dashboard Caching ⚡
- **Redis Cache**: Key `dashboard:${pharmacyId}`.
- **TTL: 30 giây** (cho demo, production có thể tăng lên 5-10 phút).
- Response thêm `cached: true/false` và `ttl` để debug.

---

## 2. Các Module Đã Hoàn Thiện (Implemented Modules)

Dưới đây là các tính năng đã "lên nòng" và sẵn sàng hoạt động:

### 🔐 Authentication & Access Control (`/api/auth`)
*   **Đăng ký/Đăng nhập đa đối tượng**:
    *   **Owner**: Chủ nhà thuốc (SĐT/Pass).
    *   **Staff**: Nhân viên (được Owner tạo).
    *   **Customer**: Khách hàng (SĐT + OTP).
    *   **System Admin**: Quản trị hệ thống cấp cao.
*   **Security**: Đã có `JWT Access/Refresh Token`, `bcrypt` (hash pass), và Middleware phân quyền (`requireOwner`, `requirePharmacyAccess`).
*   **Tenant Isolation**: Logic tách biệt dữ liệu giữa các nhà thuốc dựa trên `pharmacyId` đã được apply.

### 📦 Inventory Management (`/api/inventory`)
*   **Hàng hóa & Lô kho (Batches)**:
    *   Quản lý thuốc theo từng lô (Batch) với Hạn sử dụng (Expiry Date) riêng biệt.
    *   Tự động trừ kho theo nguyên tắc **FEFO/FIFO** (Cũ/Sắp hết hạn xuất trước).
*   **Đơn vị tính (Units)**: Hỗ trợ quy đổi đơn vị (Viên -> Vỉ -> Hộp).
*   **Cảnh báo**: API lấy danh sách thuốc sắp hết hạn (`/expiry`) và sắp hết hàng (`/stock`).

### 📚 Global Catalog & Purchase (`/api/catalog` & `/api/purchases`)
*   **Global Catalog**: Danh mục thuốc chung cho toàn hệ thống (System Admin/Rep quản lý).
    *   Hỗ trợ Import CSV (`/upload`).
*   **Email Bridge**: Tính năng gửi yêu cầu đặt hàng qua Email cho Trình dược viên (`sendPurchaseRequest`).
*   **Purchase Invoices**: "Số hóa" hóa đơn nhập hàng để tính giá vốn chính xác (theo plan Phân hệ Nhập hàng Phase 4).

### 💰 Sales & POS (`/api/sales`)
*   **Orders**: Tạo đơn hàng bán ra (Online & Tại quầy).
*   **Stock Deduction**: Logic trừ kho tự động khi đơn hàng được xác nhận.
*   **Invoices**: Xuất hóa đơn bán lẻ cho khách.

### 📊 Analytics (`/api/analytics`)
*   **Dashboard**: Cung cấp số liệu Doanh thu, Lợi nhuận (Gross Profit), Số đơn hàng trong ngày.
*   **Chart**: Dữ liệu biểu đồ doanh thu.

### 👥 Customer CRM (`/api/customers`)
*   **Profile**: Lưu trữ thông tin khách hàng.
*   **Health Metrics**: Theo dõi sức khỏe (Cân nặng, Huyết áp...).

### ⏰ Medicine Reminders (`/api/reminders`)
*   **Scheduler**: Có Worker (`scheduler.worker.ts`) chạy nền mỗi phút để quét lịch nhắc uống thuốc.
*   **Notifications**: Gửi thông báo nhắc nhở (giả lập qua log hoặc push token).
*   **Tracking**: API log lại việc uống thuốc (Taken/Skipped).

### 🔔 Operations (`/api/notifications`)
*   Thông báo nội bộ cho nhân viên (Hàng sắp hết, Đơn mới...).

---

## 3. Những Thứ Còn Thiếu / Cần Cải Thiện (Missing & To-Do)

Dựa trên kế hoạch ban đầu, đây là những phần mình "để dành" hoặc cần làm thêm:

### 🛠 Technical & Production Readiness
1.  **Tests (Unit & Integration Tests) 🔥**:
    *   Thư mục `test` hiện tại đang trống hoặc chưa đầy đủ. Đây là phần QUAN TRỌNG NHẤT cần bổ sung để đảm bảo code chạy đúng logic phức tạp (đặc biệt là logic trừ kho Batch).
2.  **Payment Gateway Integration**:
    *   Hiện tại `PaymentStatus` chỉ là update thủ công. Chưa tích hợp cổng thanh toán thật (Momo, ZaloPay, Stripe...).
3.  **Real-time Updates (Socket.io)**:
    *   Hiện tại đang dùng cơ chế Polling (gọi API liên tục) hoặc Worker chạy định kỳ. Để app "mượt" hơn (như Grab/Uber), cần bổ sung WebSocket để thông báo đơn hàng mới ngay lập tức cho nhân viên.

### 📈 Advanced Features (Future Scope)
1.  **Net Profit Report (Lợi nhuận ròng)**:
    *   Dashboard hiện tại mới tính `Revenue - COGS = Gross Profit`.
    *   Thiếu phần quản lý **Chi phí vận hành** (Tiền điện, nước, lương nhân viên...) để tính ra Lợi nhuận ròng thực tế.
2.  **Pharmacy Network (Chuỗi nhà thuốc)**:
    *   Hiện tại thiết kế đang tối ưu cho **1 Owner - Nhiều Nhà thuốc độc lập**.
    *   Chưa có logic chia sẻ kho (Transfer Stock) giữa các chi nhánh của cùng một Owner.
3.  **AI/ML Integration**:
    *   Dự đoán nhu cầu nhập hàng (Demand Forecasting) dựa trên lịch sử bán hàng (Feature xa).

---

## 4. Tóm Lại

Mẹ con mình đã làm rất tốt phần **Backend Core**. Hệ thống Logic nghiệp vụ (Business Logic) về Kho, Bán hàng, và Nhắc lịch đã khá hoàn chỉnh.

**Next Step Suggestion**:
1.  Viết **Unit Test** cho phần Inventory & Sales (để chắc chắn trừ kho không bao giờ sai).
2.  Tích hợp thử với Frontend để kiểm tra flow thực tế.
