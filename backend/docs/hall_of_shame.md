# Backend Logic Audit - Hall of Shame 🚩

Dưới đây là danh sách các lỗi "ngớ ngẩn", rủi ro bảo mật và sai sót logic mà con đã soi được trong hệ thống hiện tại. Mẹ xem để biết đường mà tránh (hoặc bắt con sửa dần nhé).

## 1. Lỗi Kinh Điển: Race Condition (Tranh chấp tài nguyên) 🏎️

### 🟢 [FIXED] Vấn đề: Trừ kho "ảo" trong `SalesService`
*   **Mô tả**: Khi nhân viên bán hàng, code kiểm tra tồn kho (`inventory.totalStockLevel < baseQuantity`) được thực hiện **ngoài** transaction. 
*   **Hậu quả**: Nếu 2 máy cùng bấm bán sản phẩm cuối cùng vào đúng 1 tích tắc, cả 2 đều thấy "còn hàng", sau đó cả 2 đều thực hiện trừ kho. Kết quả là kho bị âm hoặc lỗi database mà không biết tại sao.
*   **Mẹ sửa thế nào?**: Phải đưa bước kiểm tra tồn kho vào **trong** transaction và sử dụng lệnh `SELECT ... FOR UPDATE` (hoặc cơ chế `increment/decrement` trực tiếp của Prisma) để khóa dòng dữ liệu đó lại.
    > **Update (Feb 2026)**: Đã implement Atomic Decrement Guard trong `PrismaInventoryRepository.deductStock` (Tier 5).

### 🟢 [FIXED] Vấn đề: Snapshot Pricing "Lệch Pha" (SalesService.ts)
*   **Mô tả**: Hàm `getOldestBatchCost` lấy giá vốn (COGS) **trước** khi Transaction bắt đầu. Nhưng `deductStock` lại chạy **sau** khi Transaction đã commit (hoặc trong transaction nhưng logic tách biệt).
*   **Hậu quả**: Nếu 2 đơn hàng cùng bán 1 sản phẩm lô cũ:
    *   Đơn A lấy giá vốn Lô X.
    *   Đơn B cũng lấy giá vốn Lô X.
    *   Thực tế: Đơn A trừ hết Lô X -> Đơn B phải trừ sang Lô Y (giá khác).
    *   => Đơn B lưu `costPrice` của Lô X nhưng kho lại trừ Lô Y. **Lệch báo cáo tài chính!**
*   **Giải pháp**: Phải move logic lấy `costPrice` vào **bên trong** Transaction cùng lúc với `deductStock`. Trả về costPrice thực tế sau khi trừ.
    > **Status (Feb 2026)**: Đã FIX thành công!
    > *   Implement `deductStockWithCost` xử lý atomic cả trừ kho lẫn tính giá trong cùng 1 transaction.
    > *   Verified bằng "Highlander Test" (Race Condition) và "Hybrid Box Test" (Weighted Average Cost).

### 🟡 [ACCEPTED RISK] Vấn đề: Worker "tự tay bóp team" trong `runInventoryReconciliation`
*   **Mô tả**: Worker này chạy mỗi giờ để kiểm tra sự chênh lệch giữa kho tổng và kho lô. Tuy nhiên, nó loop qua từng item và cập nhật giá trị mà **không khóa dữ liệu**.
*   **Hậu quả**: Nếu Worker đang tính toán đúng lúc có đơn hàng bán ra, Worker có thể ghi đè một giá trị cũ (sai) lên giá trị mới (đúng) của đơn hàng đó.
*   **Mẹ sửa thế nào?**: Phải sử dụng **Distributed Lock** (dùng Redis).
    > **Status (Feb 2026)**: Chấp nhận sống chung với lũ. Quy mô hiện tại nhỏ, xác suất lỗi cực thấp. Sẽ sửa khi scale lớn.

---

## 2. Rủi ro Bảo mật: Security Leaks 🔓

### 🟢 [FIXED] Vấn đề: Lộ OTP trong Console (AuthService.ts)
*   **Mô tả**: Hàm `sendOtp` đang dùng `console.log(otp)` để in mã ra màn hình server.
*   **Hậu quả**: Hacker nếu đọc được log server (qua CloudWatch/Portainer) sẽ thấy hết OTP của user. Hoặc developer chụp màn hình log gửi lên group chat là lộ hết.
*   **Giải pháp**: Chỉ log khi `NODE_ENV === 'development'`, tuyệt đối không log ở production.
    > **Status (Feb 2026)**: Đã chuyển sang `logger.debug()` (Winston). Console Production đã được cấu hình chặn hoàn toàn level này.

### 🟠 [HIGH] Vấn đề: CORS Wildcard "Rộng Cửa" (SocketProvider.ts)
*   **Mô tả**: Socket.io cấu hình `cors: { origin: '*' }`.
*   **Hậu quả**: Bất kỳ trang web nào (kể cả web đen, web lừa đảo) cũng có thể kết nối tới Socket server của mẹ nếu khách hàng lỡ truy cập.
*   **Giải pháp**: Cấu hình strict origin (`https://my-pharmacy-app.com`) khi deploy production.

###  [FIXED] Vấn đề: Token "bất tử" (Infinite Sessions)
*   **Mô tả**: Khi dùng `refreshToken`, hệ thống tạo ra một Refresh Token mới mà không kiểm tra hay thu hồi (revoke) Token cũ.
*   **Hậu quả**: Nếu kẻ trộm lấy được một Refresh Token, họ có thể dùng nó để "đẻ" ra Token mới mãi mãi.
*   **Mẹ sửa thế nào?**: Triển khai **Refresh Token Rotation**.
    > **Update (Feb 2026)**: Đã implemented Rotation + Reuse Detection tại Tier 4.

---

## 3. Code Quality: "Mùi" Code (Code Smells) 👃

### 🟢 [FIXED] Vấn đề: Ép kiểu thô bạo `as any` (InventoryService.ts)
*   **Mô tả**: `(this.repository as any).deductStock(...)`.
*   **Hậu quả**: Code này bypass Type Checker. Nếu ai đó đổi tên hàm `deductStock` trong Repository, code vẫn compile ngon lành nhưng **Crash** banh xác khi chạy thật (Runtime Error).
*   **Giải pháp**: Khai báo method `deductStock` vào Interface `IInventoryRepository`.
    > **Status (Feb 2026)**: Đã cập nhật `IInventoryRepository` và bỏ toàn bộ `as any` trong `InventoryService`.

### 🟢 [FIXED] Vấn đề: Entity Types Outdated (AuthService.ts)
*   **Mô tả**: `(owner as any).status`.
*   **Hậu quả**: Do file `domain/entities.ts` chưa cập nhật field `status` mới thêm vào DB, nên phải ép kiểu `any` để code chạy. Mất tính năng gợi ý code và kiểm tra lỗi type.
    > **Status (Feb 2026)**: Đã cập nhật `OwnerEntity` và dẹp bỏ thành công `as any` trong `AuthService`.
*   **Giải pháp**: Update Entity definitions đồng bộ với Prisma Schema.

---

## 4. Operational Risk (Rủi ro vận hành) 🛠️

### 🟡 [ACCEPTED RISK] Vấn đề: Sai lệch độ chính xác tiền tệ (Decimal Precision)
*   **Mô tả**: `costPrice` lưu 4 số thập phân (`Decimal 19,4`) nhưng `totalAmount` lại bắt làm tròn.
*   **Hậu quả**: Lệch vài đồng khi cộng dồn.
*   **Status**: Chấp nhận.

### 🟡 [ACCEPTED RISK] Vấn đề: System Admin "Ghost Mode"
*   **Mô tả**: Admin không bị log hành động "Masquerade".
*   **Status**: Chấp nhận (Admin = Owner).

---
> [!IMPORTANT]
> **Kế hoạch tiếp theo**:
> 1. [x] Fix `console.log(otp)` gấp.
> 2. [x] Update Interface `IInventoryRepository` để bỏ cái `as any`.
> 3. [x] Update `Owner` Entity để bỏ cái `as any`.
> 4. [x] Fix logic `SalesService` (Cost Price Race Condition) - Đã xử lý (Atomic Transaction + Decimal Precision).
