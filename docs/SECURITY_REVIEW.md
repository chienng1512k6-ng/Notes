# Rà soát trước commit — 2026-10-30

## Phạm vi

Source Next.js/React/Tiptap, lưu IndexedDB/localStorage, service worker, dependency npm, cấu hình build/test, ignore và tài liệu. Chỉ dùng dữ liệu mẫu trong browser context mới; không đọc ghi chú production, chụp màn hình ghi chú hoặc gửi dữ liệu ghi chú đến dịch vụ bên ngoài.

## Phát hiện và xử lý

| Vấn đề | Xử lý |
| --- | --- |
| Tiptap 2 bị ảnh hưởng bởi [GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh) | Nâng đồng bộ lên 3.32.1; cập nhật import/NodeView và tránh extension trùng. Kiểm thử JSON cũ, plain text và code. |
| PostCSS lồng trong Next.js có advisory mức cao | Cập nhật PostCSS 8.5.32 và override dependency cùng tên; giữ Next.js 15. Kiểm tra build sau thay đổi. |
| Lỗi đọc DB bị nuốt thành giao diện trống | Hiển thị lỗi, khóa tạo mới; không tự khởi tạo dữ liệu thay thế. |
| Cửa sổ cũ có thể ghi đè/xóa bản mới từ cửa sổ khác | Transaction kiểm tra timestamp lưu trước khi ghi/xóa; báo xung đột, không hợp nhất hay bỏ mất chỉnh sửa trong bộ nhớ. |
| Sửa trong lúc đang xóa có thể tạo lần lưu đến muộn | Khóa cập nhật note đang xóa, hủy debounce và chờ hàng đợi trước transaction xóa. |
| Lỗi localStorage có thể ngăn khởi động | Tách preference thành truy cập có bắt lỗi; IndexedDB vẫn hoạt động. |
| Import legacy có thể ghi đè ID trùng hoặc nuốt lỗi DB | Tách ID trùng; transaction kiểm tra DB còn trống; không xóa bản gốc và không nuốt lỗi ghi DB. |
| SW xóa cache ngoài phạm vi và cache GET quá rộng | Chỉ xóa namespace Mini Notes; whitelist app shell/static; đợi cache writes bằng `event.waitUntil`. |
| Thiếu một số HTTP header bảo vệ | Thêm nosniff, chặn iframe, referrer/permission policy và quy tắc cập nhật SW. |
| Ignore chưa bao phủ credential và dữ liệu sinh ra | Hoàn thiện `.gitignore`, thêm `.vercelignore`, `.gitattributes`; không bỏ qua lockfile/icon/source. |

## Xác minh

Kết quả kiểm tra ngày 2026-10-30; xem commands trong [README](../README.md):

- TypeScript, ESLint và production build: đạt.
- Playwright trên Edge: **14/14 đạt**, gồm CRUD, autosave/chuyển ghi chú, Ctrl+S, code, màu sáng/tối, responsive, PWA offline, xung đột hai cửa sổ, lỗi storage và migration dữ liệu cũ.
- `npm audit` toàn bộ dependency: **0 advisory tại thời điểm kiểm tra**.
- Kiểm tra quy tắc Git ignore: **16/16 đạt**, gồm credential/build/test output bị bỏ qua và source/lockfile/icon vẫn được giữ.
- Quét chữ ký secret phổ biến: không phát hiện trong 33 file source/cấu hình/tài liệu và 21 file JS/CSS public của bản build. Đây không phải công cụ phát hiện mọi loại bí mật.

Đã bổ sung lưu ngay khi chuyển/bỏ chọn ghi chú để tránh chờ debounce; vẫn cần chờ trạng thái đã lưu trước khi đóng ứng dụng. Đây là trạng thái tại ngày rà soát, không bảo đảm dependency không xuất hiện advisory mới sau này.

## Giới hạn còn lại

- Ghi chú chưa được mã hóa bởi ứng dụng; chưa có backup/export hoặc đồng bộ giữa trình duyệt. Người có quyền truy cập profile có thể đọc dữ liệu.
- Xung đột nhiều cửa sổ được chặn, không tự hợp nhất. Người dùng phải giữ lại chỉnh sửa trước khi reload.
- CSP cho toàn bộ HTML Next.js cần thiết kế nonce cho bootstrap và style của editor; phần này chưa được triển khai. CSP cho service worker được giới hạn theo nhu cầu của worker.
- Kiểm tra dependency/secret signature không thay thế kiểm thử xâm nhập hosting hoặc kiểm tra lịch sử Git. Thư mục hiện chưa có repository Git nên không thể rà soát tracked/staged files hay commit history.
- Không thêm license mặc định cho mã cá nhân; chủ dự án cần tự chọn license nếu muốn công khai/phân phối.
