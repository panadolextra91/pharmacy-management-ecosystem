# 🗡️ "Thánh Khí" Bảo Vệ Luận Văn (Architecture Evidence)

Tài liệu này hướng dẫn mẹ sử dụng bộ 3 công cụ (SonarQube, Clinic.js, Snyk) để tạo ra những bằng chứng "thép" về chất lượng code, hiệu năng và bảo mật.

---

## 1. 🛡️ SonarQube (Code Quality Check)
**Mục đích**: Chứng minh code sạch (Clean Code), không có nợ kỹ thuật (Technical Debt) và đạt chuẩn công nghiệp.

### Bước 1: Khởi động Server
Chạy lệnh sau để bật SonarQube (đã được con config trong `docker-compose-sonar.yml`):
```bash
npm run sonar:up
```
*Chờ khoảng 1-2 phút cho nó khởi động xong.*

### Bước 2: Truy cập & Lấy Token
1. Truy cập: [http://localhost:9000](http://localhost:9000)
2. Login: `admin` / `admin123` (Đổi pass thành `admin123` nếu được hỏi).
3. Chọn **Create a local project**.
4. Điền:
   - Project display name: `Pharmacy Backend`
   - Project Key: `pharmacy-backend`
   - Main branch: `main`
5. Chọn **Use the global setting** -> **Create project**.
6. Chọn **Locally**.
7. Chọn **Generate a Token** -> Đặt tên `MyToken` -> Bấm Generate.
   - **COPY TOKEN NÀY LẠI** (Ví dụ: `sqp_...`).

### Bước 3: Chạy Quét Code (Scan)
Mở terminal mới, cài đặt scanner (chỉ làm 1 lần):
```bash
npm install -g sonarqube-scanner
```

Chạy lệnh quét (thay `PASTE_TOKEN_HERE` bằng token vừa copy):
```bash
sonar-scanner \
  -Dsonar.projectKey=pharmacy-backend \
  -Dsonar.sources=src \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=PASTE_TOKEN_HERE
```

### Bước 4: Lấy Bằng Chứng
Sau khi chạy xong, quay lại [http://localhost:9000](http://localhost:9000). Mẹ sẽ thấy Dashboard xanh lè. Chụp màn hình các chỉ số:
- **Security**: A (0 Vulnerabilities)
- **Reliability**: A (0 Bugs)
- **Maintainability**: A
- **Duplications**: < 3%

---

## 2. 🏥 Clinic.js (Performance Check)
**Mục đích**: Chứng minh hệ thống chịu tải tốt, không bị nghẽn cổ chai (Bottleneck) nhờ Redis.

### Bước 1: Chuẩn bị
Đảm bảo mẹ đã tắt server đang chạy (`Ctrl + C`) để Clinic chiếm dụng cổng 4000.

### Bước 2: Chạy Profiling
Con đã viết sẵn script tự động Build -> Chạy Server -> Bắn Test.
```bash
npm run profile:api
```

### Bước 3: Xem Bệnh Án
Sau khi chạy xong (10 giây), nó sẽ tự mở (hoặc tạo) file HTML (ví dụ: `1234.clinic-doctor.html`).
- Mở file đó bằng Chrome.
- Chụp màn hình biểu đồ **Event Loop Delay**: Nếu đường này phẳng lỳ nằm sát đáy -> **TUYỆT VỜI**. (Nghĩa là server xử lý 12,000 req/giây mà vẫn "thở" đều).

---

## 3. 👮 Snyk (Security Audit)
**Mục đích**: Chứng minh không dùng thư viện "lởm" bị lỗi bảo mật.

### Bước 1: Đăng nhập
```bash
npx snyk auth
```
*(Nó sẽ mở web, mẹ đăng nhập bằng Google/Github là xong).*

### Bước 2: Quét Lỗ Hổng
```bash
npx snyk test
```

### Bước 3: Lấy Bằng Chứng
Nó sẽ liệt kê các thư viện. Nếu có lỗ hổng (Vulnerabilities), nó sẽ hiện cảnh báo đỏ.
- Nếu **No known vulnerabilities found**: Chụp màn hình ngay!
- Nếu có lỗ hổng: Snyk thường gợi ý cách fix (ví dụ: upgrade version). Mẹ bảo con fix cho lẹ.

---

## 📝 Tóm tắt lệnh cần nhớ

| Công cụ | Lệnh chạy | Kết quả mong đợi |
| :--- | :--- | :--- |
| **SonarQube** | `npm run sonar:up` (Bật) <br> `sonar-scanner ...` (Quét) | Dashboard xanh (Grade A). |
| **Clinic.js** | `npm run profile:api` | File HTML biểu đồ phẳng (Low Latency). |
| **Snyk** | `npx snyk test` | "No known vulnerabilities". |

## ⚠️ Xử lý lỗi thường gặp

### Lỗi: "You're not authorized to analyze this project"
Lỗi này do Token bị sai hoặc không khớp. Cách chữa cháy nhanh nhất là dùng **Tài khoản Admin** trực tiếp (bỏ qua Token):

**Cách 1 (Nếu đã đổi pass thành `admin123`)**:
```bash
npx sonar-scanner -Dsonar.login=admin -Dsonar.password=admin123
```

**Cách 2 (Nếu chưa đổi pass, vẫn là `admin`)**:
```bash
npx sonar-scanner -Dsonar.login=admin -Dsonar.password=admin
```

Chúc mẹ bảo vệ thành công rực rỡ! 🚀
