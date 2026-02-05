# System Admin & SaaS Feature Implementation

## ✅ Đã Triển Khai (Implemented)

### 1. Database Schema (`schema.prisma`)

| Model | Mô tả |
|-------|-------|
| `SystemAdmin` | Bảng riêng cho Super Admin (God Mode) |
| `Owner.status` | Enum: `PENDING`, `ACTIVE`, `SUSPENDED` |
| `Owner.subscriptionExpiry` | DateTime (nullable) - để theo dõi hết hạn gói |

### 2. Business Logic (All-in-One Model)

```
📋 Flow đăng ký Owner mới:
1. Owner đăng ký → status = PENDING
2. System Admin duyệt → status = ACTIVE
3. Owner được tạo KHÔNG GIỚI HẠN số lượng Pharmacy và Staff
4. Nếu vi phạm → Admin suspend → status = SUSPENDED
```

**Gói cước "All-in-One"**: Không có quota, không có subscription plans phức tạp. Một khi ACTIVE, Owner dùng full features.

### 3. Authentication & Authorization

| Endpoint | Mô tả |
|----------|-------|
| `POST /admin/login` | Login System Admin |
| `POST /owners/login` | Login Owner (check status trước khi cho vào) |

**Status Check Logic** (`auth.service.ts`):
- `PENDING` → Error `ACCOUNT_PENDING`
- `SUSPENDED` → Error `ACCOUNT_SUSPENDED`
- `ACTIVE` → Cho phép login

### 4. Owner Management APIs (God Mode) 🔐

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/owners` | Danh sách Owner (filter by status) |
| GET | `/admin/owners/:id` | Chi tiết Owner + pharmacies |
| PUT | `/admin/owners/:id/approve` | Duyệt Owner PENDING → ACTIVE |
| PUT | `/admin/owners/:id/suspend` | Đình chỉ Owner |
| PUT | `/admin/owners/:id/reactivate` | Kích hoạt lại Owner SUSPENDED |

**Middleware**: `requireSystemAdmin` - Chỉ System Admin mới được gọi các API này.

### 5. Seed Script

```bash
# Tạo Super Admin (chạy 1 lần duy nhất)
npx ts-node prisma/seed-admin.ts
```

Cấu hình qua Environment Variables:
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_NAME`

---

## 📁 Files Changed/Created

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Added `OwnerStatus` enum, `status`, `subscriptionExpiry` to Owner |
| `prisma/seed-admin.ts` | **NEW** - Script khởi tạo Super Admin |
| `src/shared/middleware/system-admin.middleware.ts` | **NEW** - Middleware God Mode |
| `src/modules/access-control/application/auth.service.ts` | Updated `loginOwner` với status check |
| `src/modules/access-control/application/owner-management.service.ts` | **NEW** - Service quản lý Owner |
| `src/modules/access-control/adapters/http/owner-management.controller.ts` | **NEW** - Controller Admin APIs |
| `src/modules/access-control/adapters/http/routes.ts` | Added Admin Owner Management routes |
| `src/workers/inventory-reconciliation.worker.ts` | **NEW** - Self-healing inventory sync (hourly) |
| `src/modules/analytics/adapters/http/analytics.controller.ts` | Updated with Redis caching (30s TTL) |

---

## ✅ Đã Triển Khai Thêm

| Feature | Status |
|---------|--------|
| Inventory Reconciliation Worker | ☑️ DONE - Self-healing mỗi 1 tiếng |
| Analytics Dashboard Caching | ☑️ DONE - Redis với TTL 30 giây |

---

## ⏳ Chưa Triển Khai (Future Scope)

1. **Subscription Billing**: Tích hợp cổng thanh toán (Stripe, PayOS)
2. **Auto-Suspend Cronjob**: Tự động suspend nếu `subscriptionExpiry < now()`
3. **Admin Dashboard UI**: Giao diện web cho System Admin
4. **Audit Logs**: Lưu lịch sử approve/suspend với reason
