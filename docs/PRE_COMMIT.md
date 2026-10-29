# Checklist trước commit

## 1. Cài đặt và kiểm tra

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm audit
```

Dùng `npm.cmd` trong PowerShell nếu `npm.ps1` bị chặn. Không chạy dev server cùng lúc với build trên cùng thư mục `.next`.

## 2. Kiểm tra file sẽ commit

```bash
git status --short
git diff --check
git diff --stat
```

Thư mục chưa có `.git` không thể kiểm tra staging/lịch sử. Nếu đây là lần đầu và bạn muốn tạo repository tại đây, tự chạy `git init` trước; tài liệu này không tự tạo remote hoặc commit.

- Commit source, tests, cấu hình, `package.json`, **`package-lock.json`** và tài liệu.
- Không commit `node_modules`, `.next`, `.vercel`, kết quả test, coverage, log, `.env*`, credential hoặc bản xuất ghi chú.
- `.gitignore` không có hiệu lực với file đã được track. Kiểm tra staging riêng trước khi commit; đừng đăng log hoặc diff có bí mật lên dịch vụ khác.
- Không đưa nội dung ghi chú thật vào fixture, ảnh test hoặc issue.

Sau khi chọn các file cần thiết, kiểm tra `git diff --cached --stat` và `git diff --cached --check`. Nếu cần đọc staged diff, xem cục bộ và không sao chép bí mật vào chat/log.

## 3. Kiểm tra ứng dụng thủ công

- Tạo ghi chú mẫu; chờ **Đã lưu** và tải lại.
- Thử Ctrl+S, định dạng, checklist, Code Block/Copy, đổi màu, dark mode.
- Kiểm tra sidebar kéo được, full width, sắp xếp và bỏ chọn vùng trống.
- Mở hai cửa sổ cùng ghi chú: cửa sổ cũ phải báo xung đột thay vì ghi đè.
- Mở PWA từ shortcut và thử offline sau khi app đã cache tài nguyên.

Việc tạo commit, push và deploy là các thao tác riêng, không xảy ra tự động khi chạy kiểm tra.
