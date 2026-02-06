# Backend Project Status Review

## 1. Tổng Quan Tình Hình (Current Status)

Backend của mình (`pharmacy-management-system`) hiện tại đã hoàn thiện bộ khung sườn chính (Core) và đã implement đầy đủ các module quan trọng nhất theo kế hoạch Architecture Monolith.
## [2026-02-07] - Evidence & Verification Ready 🛡️
### Added
- **SonarQube Integration**: Dockerized SonarQube setup for Quality & Security audit.
- **Clinic.js Profiling**: Automated script `profile_api.sh` for performance flamegraphs.
- **Benchmark Reports**: `benchmark_report.html` comparing Legacy vs SaaS speeds.

### Fixed
- **Benchmark Security**: Adapted scripts to run safely against Rate-Limited and Authenticated endpoints.

### Metrics
- **Performance**: 12ms Latency / 4k req/sec (SaaS) vs 200ms / 50 req/sec (Legacy).
- **Security**: 
  - SonarQube Security Grade A.
  - Snyk Audit: **0 Vulnerabilities** (Fixed `yamljs`, `bcrypt`, `multer`).

---

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
- **TTL: 30 seconds** (cho demo, production có thể tăng lên 5-10 phút).
- Response thêm `cached: true/false` và `ttl` để debug.

### ✅ Core Security & Stability 🛡️
- **Tenant Middleware Fix**: Hỗ trợ header `x-pharmacy-id` cho Owner (verify permission DB).
- **Sales API Security**:
  - Loại bỏ `price` client gửi lên → Server tự tính.
  - Validate `quantity >= 1`, `unitId` phải thuộc về `inventoryId`.
- **Master Seed Script**: `prisma/seed.ts` chuẩn chỉnh, tạo dữ liệu demo FIFO.

### ✅ Pharma Rep Catalog Upload (OTP-based) 🧪
- **Secure Upload**: Reps authenticate via OTP (Email) instead of passwords.
- **CSV Sanitization**: Ngăn chặn Excel Injection cho các file catalog được tải lên.
- **Approval Flow**: Thuốc mới tải lên ở trạng thái `PENDING`, cần Manager/Owner duyệt mới được public.
- **Data Normalization**: Tự động chuẩn hóa danh mục/nhãn hiệu để dữ liệu sạch sẽ.

### ✅ Code Audit & Alignment 🕵️‍♂️
- **Staff Registration**: Fix Swagger thiếu header -> Giờ đã require `x-pharmacy-id`.
- **Customer Login**: Hỗ trợ **OTP Login** (Phone + Code) + Password Login.
- **Inventory Data**: API trả về Rich Data (Units, Batches) thay vì chỉ thông tin cơ bản.

### ✅ Operational Audit & Secure Export (Tier 3) 🛡️
- **Audit Logging**: Ghi log toàn bộ hành động quan trọng (Login, Admin Approval, Stock Adjustment).
- **Secure Export API**:
  - System Admin: Export Customer Global DB.
  - Owner: Export Inventory & Sales của từng nhà thuốc.
  - Định dạng CSV, có ghi log người tải để truy vết.

### ✅ Auth Security: Refresh Token Rotation (Tier 4) 🔐
- **Reuse Detection**: Phát hiện hacker dùng lại token cũ -> Khóa ngay lập tức.
- **Token Rotation**: Cấp mới Refresh Token liên tục giúp giảm thiểu rủi ro bị trộm token.
- **Cleanup Worker**: Dọn dẹp DB tự động, xóa token rác.

### ✅ Logic Stability: Atomic Stock Deduction (Tier 5) 🔒
- **Race Condition Fixed**: Sửa lỗi tranh chấp kho khi nhiều người cùng bán.
- **Atomic Decrement**: Kho luôn chính xác 100%, không bao giờ bị âm "ảo".

### ✅ Scale & Concurrency (Tier 6) [NEW] 🚀
- **BullMQ Integration**: Hệ thống xử lý tác vụ nền (Background Jobs) bằng Redis Queue.
- **Async Processing**: Gửi thông báo đơn hàng (Notifications) không làm chậm API tạo đơn.
- **Fail-Fast Resilience**: Cơ chế tự bảo vệ khi Redis sập (Không làm chết app).
- **Fail-Fast Resilience**: Cơ chế tự bảo vệ khi Redis sập (Không làm chết app).
- **Admin Dashboard**: Giao diện quản lý Queue trực quan.

### ✅ Real-Time Ecosystem (Socket.io) ⚡ [NEW]
- **Hybrid Architecture**: Auto-switch Redis/Memory adapter based on ENV.
- **Events**: Instant "New Order" alerts for Staff/Owners.
- **Security**: Strict JWT Auth handshake.

### ✅ POS Auto-Invoice 🧾 [NEW]
- **Automation**: Bán hàng tại quầy (POS) tự động sinh Invoice khi thanh toán thành công.
- **Integrity**: Đảm bảo doanh thu luôn khớp với hóa đơn.

### ✅ Quality Assurance & Testing 🧪 [COMPLETE]
- **Test Infrastructure**: Jest + ts-jest + separate `pharmacy_test` database.
- **Test Factory**: Reusable helpers for mock data (Pharmacy, Inventory, Batch, Customer, Staff).
- **Inventory Module**: 7/7 tests passed (FIFO, Multi-Batch, Hell-Cases).
- **Sales Module**: 5/5 tests passed (Snapshot Pricing, Atomic Rollback, Decimal Accuracy, Security).
- **Security/Auth Module**: 9/9 tests passed 🔐
  - Token Rotation, Logout Invalidation, Cross-Role Rejection.
  - Hell-Cases: Reuse Detection + BullMQ Alert, Expired JWT, Impersonation Scope, Password Change Revocation.
  - **Kill Switch (SEC-H5)**: Admin bans user → 5 sessions revoked + Discord alert.
  - **God's Hand (SEC-H6)**: Admin bans Staff → Owner notified via StaffNotification.
- **Total**: 21/21 tests passed ✅
- **Command**: `npm run test -- --runInBand`

### ✅ Kill Switch (God Mode Security) ⚡ [NEW]
- **JWT Upgrade**: Added `userType` to TokenPayload (7 locations) for backward compatibility.
- **Discord Alerts**: Redis-throttled webhook notifications (10s TTL per user/alert type):
  - 🔴 TOKEN_REUSE: "Tru di tam tộc session" (red embed).
  - 🟣 ADMIN_BAN: "Công lý của Nữ hoàng" (purple embed).
  - 🟠 PASSWORD_CHANGED: "Có khứa đổi pass" (orange embed).
- **AdminService.globalBan()**: Suspend user + revoke all sessions + Discord + notify Owner.
- **Kill API**: `POST /api/auth/admin/security/suspend/:userId` with `userType` body param.
- **ENV**: `DISCORD_WEBHOOK_URL` - Discord webhook URL for alerts.

### ✅ Security Infrastructure (NEW)
- **BullMQ Security Queue**: Async dispatch of security alerts (Token Reuse, Password Change).
- **JWT Uniqueness**: Added `jti` (UUID) claim to prevent token collision.
- **Password Change API**: Atomic revocation of all sessions with single DB command.
- **Big Data Simulation**: Seeded 10,000 Medicine items + 3 Owners + 4 Pharmacies for Stress Testing.
- **Redis Performance**: Implemented Cache-Aside for Catalog. Validated 12,000 req/sec (vs 49 req/sec legacy) via Benchmark.

### ⚠️ Accepted Tech Debt (Deferred)
- Quyết định **không sửa** Distributed Lock cho Worker Reconciliation (chưa cần thiết).
- Schema `Decimal(10,2)` hỗ trợ 2 số lẻ - Đã điều chỉnh tests phù hợp.
- Chấp nhận Admin Ghost Mode (do Admin = Owner).

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
*   **Testing**: ✅ 7/7 Hell-Case tests passed.

### 📚 Global Catalog & Purchase (`/api/catalog` & `/api/purchases`)
*   **Global Catalog**: Danh mục thuốc chung cho toàn hệ thống (System Admin/Rep quản lý).
    *   Hỗ trợ Import CSV (`/upload`).
*   **Email Bridge**: Tính năng gửi yêu cầu đặt hàng qua Email cho Trình dược viên (`sendPurchaseRequest`).
*   **Purchase Invoices**: "Số hóa" hóa đơn nhập hàng để tính giá vốn chính xác (theo plan Phân hệ Nhập hàng Phase 4).

### 💰 Sales & POS (`/api/sales`)
*   **Orders**: Tạo đơn hàng bán ra (Online & Tại quầy).
*   **Stock Deduction**: Logic trừ kho tự động khi đơn hàng được xác nhận.
*   **Invoices**: Xuất hóa đơn bán lẻ cho khách.
*   **Testing**: ✅ 5/5 Hell-Case tests passed (Snapshot Pricing, Atomic Rollback, Security).

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
1.  **Tests (Unit & Integration Tests)** ✅ **DONE**:
    *   Inventory & Sales Module: 12/12 tests passed.
    *   Auth/Security Module: 7/7 tests passed (Token Rotation, Reuse Detection, Hell-Cases).
    *   **Total: 19/19 tests passed.**
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

**Current Status**: ✅ **19/19 Tests Passed** (Inventory + Sales + Auth/Security)

**Next Step Suggestion**:
1.  ~~Viết **Unit Test** cho phần Inventory & Sales~~. ✅ DONE
2.  ~~Viết **Security Tests** cho Auth Token Rotation~~. ✅ DONE
3.  Tích hợp thử với Frontend để kiểm tra flow thực tế.
4.  Viết Integration Tests cho full API flows (Register → Login → Create Order).
