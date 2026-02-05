# Backend Logic Audit - Hall of Shame 🚩

Dưới đây là danh sách các lỗi "ngớ ngẩn", rủi ro bảo mật và sai sót logic mà con đã soi được trong hệ thống hiện tại. Mẹ xem để biết đường mà tránh (hoặc bắt con sửa dần nhé).

## 1. Lỗi Kinh Điển: Race Condition (Tranh chấp tài nguyên) 🏎️

### 🟢 [FIXED] Vấn đề: Trừ kho "ảo" trong `SalesService`
*   **Mô tả**: Khi nhân viên bán hàng, code kiểm tra tồn kho (`inventory.totalStockLevel < baseQuantity`) được thực hiện **ngoài** transaction. 
*   **Hậu quả**: Nếu 2 máy cùng bấm bán sản phẩm cuối cùng vào đúng 1 tích tắc, cả 2 đều thấy "còn hàng", sau đó cả 2 đều thực hiện trừ kho. Kết quả là kho bị âm hoặc lỗi database mà không biết tại sao.
*   **Mẹ sửa thế nào?**: Phải đưa bước kiểm tra tồn kho vào **trong** transaction và sử dụng lệnh `SELECT ... FOR UPDATE` (hoặc cơ chế `increment/decrement` trực tiếp của Prisma) để khóa dòng dữ liệu đó lại.
    > **Update (Feb 2026)**: Đã implement Atomic Decrement Guard trong `PrismaInventoryRepository.deductStock` (Tier 5).

### 🟡 [ACCEPTED RISK] Vấn đề: Worker "tự tay bóp team" trong `runInventoryReconciliation`
*   **Mô tả**: Worker này chạy mỗi giờ để kiểm tra sự chênh lệch giữa kho tổng và kho lô. Tuy nhiên, nó loop qua từng item và cập nhật giá trị mà **không khóa dữ liệu**.
*   **Hậu quả**: Nếu Worker đang tính toán đúng lúc có đơn hàng bán ra, Worker có thể ghi đè một giá trị cũ (sai) lên giá trị mới (đúng) của đơn hàng đó.
*   **Mẹ sửa thế nào?**: Phải sử dụng **Distributed Lock** (dùng Redis).
    > **Status (Feb 2026)**: Chấp nhận sống chung với lũ. Quy mô hiện tại nhỏ, xác suất lỗi cực thấp. Sẽ sửa khi scale lớn.

---

## 2. Rủi ro Bảo mật: Tenant Leak (Rò rỉ dữ liệu) 🔓

### � [FIXED] Vấn đề: RLS "nửa vời" trong `createTenantPrisma`
*   **Mô tả**: Hệ thống tự động chèn `pharmacyId` vào các lệnh `findMany`, `findFirst`. Nhưng lại **quên mất** chèn vào các lệnh `update`, `delete`, `upsert`.
*   **Hậu quả**: Nếu một coder "lười" viết `prisma.pharmacyInventory.update({ where: { id: 'abc' }, data: {...} })` mà quên chèn `pharmacyId`, họ có thể cập nhật nhầm hàng của hiệu thuốc khác chỉ bằng cách đoán ID.
*   **Mẹ sửa thế nào?**: Cập nhật Prisma Extension để bao phủ toàn bộ các method ghi (Write methods).
    > **Update (Feb 2026)**: Đã upgrade Tenant Middleware tại Tier 2.

### 🟢 [FIXED] Vấn đề: Token "bất tử" (Infinite Sessions)
*   **Mô tả**: Khi dùng `refreshToken`, hệ thống tạo ra một Refresh Token mới mà không kiểm tra hay thu hồi (revoke) Token cũ.
*   **Hậu quả**: Nếu kẻ trộm lấy được một Refresh Token, họ có thể dùng nó để "đẻ" ra Token mới mãi mãi, dù mẹ có đổi mật khẩu thì phiên đăng nhập đó cũng không bao giờ hết hạn.
*   **Mẹ sửa thế nào?**: Triển khai **Refresh Token Rotation** (Token cũ bị vô hiệu hóa ngay khi dùng) và lưu whitelist/blacklist trong Redis.
    > **Update (Feb 2026)**: Đã implemented Rotation + Reuse Detection tại Tier 4. Token cũ bị dùng lại sẽ kích hoạt Global Logout.

---

## 3. Database & Data Integrity (Dữ liệu lộn xộn) 📉

### 🟡 [ACCEPTED RISK] Vấn đề: Sai lệch độ chính xác tiền tệ (Decimal Precision)
*   **Mô tả**: `costPrice` lưu 4 số thập phân (`Decimal 19,4`) nhưng `totalAmount` lại chỉ lưu 2 số (`Decimal 10,2`).
*   **Hậu quả**: Khi cộng dồn hàng nghìn món hàng lẻ, phần dư thập phân bị làm tròn sớm sẽ dẫn đến báo cáo tài chính bị lệch vài đồng so với thực tế.
*   **Mẹ sửa thế nào?**: Luôn dùng ít nhất 4 số thập phân cho mọi phép tính trung gian và chỉ làm tròn 2 số khi hiển thị hóa đơn cuối cùng.
    > **Status (Feb 2026)**: Chưa cần thiết. Lệch 1-2 đồng không ảnh hưởng vận hành hiện tại.

### � [FIXED] Vấn đề: Tra cứu "rùa bò" (Missing Indexes)
*   **Mô tả**: Bảng `inventory_batches` thiếu index kết hợp giữa `inventoryId`, `expiryDate` và `stockQuantity`.
*   **Hậu quả**: Khi kho của mẹ lên đến hàng chục nghìn lô thuốc, việc tìm "Lô thuốc nào sắp hết hạn nhất để trừ kho" sẽ cực kỳ chậm.
*   **Mẹ sửa thế nào?**: Thêm **Composite Index** `(inventory_id, is_deleted, stock_quantity, expiry_date)`.
    > **Update (Feb 2026)**: Đã thêm Index tại Tier 1 (Database Optimization).

---

## 4. Operational Risk (Rủi ro vận hành) 🛠️

### 🟡 [ACCEPTED RISK] Vấn đề: System Admin "Ghost Mode"
*   **Mô tả**: System Admin có thể chèn `x-pharmacy-id` để vào xem bất kỳ kho của ai mà không để lại dấu vết đặc biệt nào trong Audit Log.
*   **Hậu quả**: Nếu Admin làm sai, rất khó để truy cứu trách nhiệm "ai là người đã sửa kho của tôi".
*   **Mẹ sửa thế nào?**: Bắt buộc ghi log mọi hành động của Admin khi họ sử dụng quyền "Masquerade" vào một Pharmacy cụ thể.
    > **Status (Feb 2026)**: Admin là Owner (Mẹ), nên tự tin không cần giám sát chính mình. Sẽ làm khi thuê người ngoài.

### � [PARTIALLY FIXED] Vấn đề: Xử lý tuần tự (Sequential Overload)
*   **Mô tả**: Các Worker xử lý hàng nghìn item bằng vòng lặp `for`.
*   **Hậu quả**: Một item bị lỗi có thể làm treo cả quá trình, hoặc làm Job chạy quá lâu dẫn đến timeout.
*   **Mẹ sửa thế nào?**: Sử dụng **Batching** hoặc xử lý song song với giới hạn (concurrency limit) thông qua BullMQ.
    > **Update (Feb 2026)**: Đã migrate Notifications sang BullMQ (Concurrency: 5) tại Tier 6. Các cron job khác vẫn đang chờ migrate.

---
> [!IMPORTANT]
> Đây đều là những "bom nổ chậm". Hiện tại hệ thống ít người dùng thì chưa sao, nhưng khi mẹ scale lên chuỗi hàng nghìn nhà thuốc, những lỗi này sẽ làm sập hệ thống ngay lập tức!
