# Mini Notes

PWA ghi chú cá nhân bằng Next.js, React, TypeScript, Tailwind CSS, Tiptap 3 và Dexie/IndexedDB. Không cần backend, đăng nhập hoặc API key.

## Yêu cầu và chạy dự án

- Node.js **22 trở lên**, npm đi kèm Node.js.
- Dùng Edge/Chrome hiện đại. HTTPS hoặc localhost cần thiết cho PWA và clipboard.

```bash
npm ci
npm run dev
```

Mở http://localhost:3000. Trên PowerShell, nếu execution policy chặn `npm.ps1`, dùng `npm.cmd` thay cho `npm` (ví dụ `npm.cmd ci`).

## Tính năng

- Sidebar hai cột: tìm kiếm, ghim và sắp xếp A–Z, Z–A, cập nhật mới/cũ. Ghi chú ghim luôn ở đầu.
- Kéo sidebar từ 260–480 px; focus đường phân cách và dùng trái/phải hoặc Home/End. Cửa sổ hẹp tự chừa không gian cho editor.
- Vùng viết mặc định tối đa 850 px, có nút full width. Bố cục và thứ tự sắp xếp được lưu cho lần mở sau.
- Toolbar một hàng, có menu công cụ bổ sung khi thiếu chỗ; hỗ trợ light/dark mode và màu nền từng ghi chú.
- Rich text: đậm, nghiêng, gạch dưới/ngang, cỡ/màu chữ, tô sáng, căn lề, danh sách, checklist, undo/redo và xóa định dạng.
- Code Block: monospace, giữ khoảng trắng/ký tự đặc biệt, Tab chèn tab, Ctrl+Enter thoát khối, Copy chỉ ghi vào clipboard khi bấm. Windows có thể biểu diễn xuống dòng bằng CRLF khi đọc clipboard.
- Ctrl+B/I/U/Z/Y trong editor; Ctrl+S hoặc Cmd+S lưu ngay ghi chú, không mở hộp thoại lưu trang web.
- Bấm vùng trống trong giao diện để bỏ chọn và để trống panel phải. Các dòng văn bản, ô nhập, nút và menu vẫn thao tác bình thường.

## Lưu trữ và giới hạn

Ghi chú nằm trong database IndexedDB `mini-notes`, bảng `notes`, theo **địa chỉ web và hồ sơ trình duyệt**. Edge, Chrome, localhost và các domain khác nhau không dùng chung dữ liệu. Đưa mã nguồn lên hosting không tự tải nội dung ghi chú lên hosting.

- Nội dung lưu dưới dạng Tiptap JSON; tự lưu sau 650 ms. Các lần ghi cùng ghi chú chạy tuần tự.
- Ghi/xóa dùng transaction và kiểm tra phiên bản theo thời điểm cập nhật. Một cửa sổ cũ không được phép ghi đè/xóa bản mới ở cửa sổ khác; app báo lỗi để người dùng giữ lại chỉnh sửa trước khi tải lại. Không có tự hợp nhất nội dung.
- Lỗi đọc IndexedDB được thông báo rõ, khóa tạo dữ liệu mới. Lỗi preference trong localStorage không ngăn đọc/lưu ghi chú.
- Plain text được chuyển thành JSON khi đọc; nội dung gốc giữ trong `legacyContent` khi lưu lại.
- Nếu IndexedDB trống, app thử nhập mảng ghi chú từ localStorage `mini-notes`, `miniNotes`, `notes`. Không xóa bản gốc; ID trùng trong bản nhập được tách để không mất ghi chú. Bước nhập dùng transaction để tránh hai cửa sổ cùng ghi đè dữ liệu.
- Tùy chọn giao diện lưu trong localStorage, riêng với ghi chú.

**Chưa có xuất/nhập file, đồng bộ thiết bị hoặc mã hóa ghi chú bằng mật khẩu.** Không xóa site data nếu cần giữ ghi chú. Đợi trạng thái **Đã lưu** trước khi đóng; khi có lỗi, giữ lại nội dung và xử lý lỗi trước.

## PWA và production

```bash
npm run build
npm start
```

Có thể đổi cổng xem trước bằng `npm run start -- --port 3001`.

Mở bản production khi online, chờ app tải xong và tải lại một lần để lưu đủ app shell/tài nguyên cho offline. Sau đó dùng mục cài ứng dụng của Edge/Chrome và tạo shortcut Desktop. Bản dev không đăng ký service worker.

Service worker chỉ cache trang chính, manifest, icon và tài nguyên Next.js. Không cache trang/API tùy ý và không xóa cache của ứng dụng khác trên cùng origin. Cache app shell tách khỏi IndexedDB chứa ghi chú.

Để cập nhật project Vercel đã liên kết:

```bash
npx vercel@latest --prod
```

Dùng cùng domain production khi cập nhật; URL preview/deployment khác có kho IndexedDB riêng. Mở lại PWA khi online để nhận giao diện mới. Không cần cài lại PWA.

Trên Windows có lỗi tải SWC native, script chạy Next.js tự dùng gói SWC WebAssembly đã cài; có thể có cảnh báo từ Next.js. Next.js 15 được giữ lại; PostCSS 8.5.32 được override đồng bộ để vá dependency lồng nhau. Các package Tiptap được giữ cùng phiên bản để tránh lệch peer dependency.

## Kiểm tra trước khi commit

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm audit
```

E2E chạy server production tại cổng **3100**; hãy build trước. Trên Windows dùng Edge đã cài; trên hệ điều hành khác cần `npx playwright install chromium`. Tests dùng browser context mới, dữ liệu mẫu cục bộ; tắt screenshot, video và trace. Không trỏ tests vào production hoặc hồ sơ trình duyệt cá nhân.

Các luồng được kiểm tra: CRUD, autosave/Ctrl+S, chuyển ghi chú, sắp xếp/ghim, bố cục/overflow, bỏ chọn vùng trống, code paste/Copy, contrast, dữ liệu cũ, xung đột nhiều cửa sổ, lỗi storage và PWA offline. Cài đặt từ shortcut Desktop thực tế vẫn cần kiểm tra thủ công.

Đọc [checklist trước commit](docs/PRE_COMMIT.md), [chính sách dữ liệu/bảo mật](SECURITY.md) và [báo cáo rà soát](docs/SECURITY_REVIEW.md).
