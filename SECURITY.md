# Bảo mật và dữ liệu cá nhân

## Phạm vi bảo vệ

Mini Notes là ứng dụng cá nhân, không có backend, tài khoản hay API đồng bộ. Ghi chú nằm trong IndexedDB theo origin và hồ sơ trình duyệt. Tùy chọn giao diện nằm trong localStorage. Service worker chỉ cache app shell, manifest, icon và tài nguyên Next.js; không cache API hoặc trang tùy ý.

IndexedDB **không phải kho bí mật được mã hóa bởi ứng dụng**. Người có quyền truy cập hồ sơ trình duyệt hoặc thiết bị có thể đọc dữ liệu. Không dùng Mini Notes để giữ API key, mật khẩu, private key hoặc token. Xóa site data, mất hồ sơ trình duyệt hoặc đổi domain có thể làm mất quyền truy cập ghi chú; hiện chưa có chức năng xuất/nhập hay đồng bộ.

## Khi gặp lỗi lưu

- Chờ trạng thái **Đã lưu** trước khi đóng ứng dụng.
- Nếu không đọc được IndexedDB, app báo lỗi và khóa tạo ghi chú, không giả vờ rằng dữ liệu trống.
- Nếu hai cửa sổ cùng chỉnh một ghi chú, lần ghi có dữ liệu cũ bị từ chối. Giữ lại phần chỉnh sửa của bạn trước khi tải lại; app không tự hợp nhất hoặc ghi đè phiên bản ở cửa sổ kia.
- Copy code chỉ ghi vào clipboard khi người dùng bấm nút. Không có thao tác gửi nội dung ghi chú đến dịch vụ phân tích hay AI.

## Quy tắc trước khi commit/deploy

- Không commit `.env*`, `.npmrc`, khóa/chứng chỉ, bản xuất ghi chú, log, ảnh chứa dữ liệu cá nhân hoặc thư mục hồ sơ trình duyệt.
- `.gitignore` không xóa bí mật đã được Git theo dõi. Nếu lỡ đưa bí mật lên remote, cần thu hồi/đổi bí mật và xử lý lịch sử Git.
- Chạy `npm ci`, `npm audit`, typecheck, lint, build và E2E khi cập nhật dependency. Giữ `package-lock.json` trong Git.
- E2E chỉ dùng dữ liệu mẫu và browser context mới; tắt ảnh, video, trace. Không trỏ bộ test vào production hoặc hồ sơ đang dùng hằng ngày.
- Khi báo lỗi, không kèm ghi chú thật hoặc token trong issue công khai. Báo riêng cho người quản lý repository nếu thông tin có tính nhạy cảm.

Không có kết quả rà soát nào bảo đảm ứng dụng hoàn toàn không còn lỗ hổng. Rà soát hiện tại không bao gồm kiểm thử xâm nhập hosting, máy tính hoặc extension trình duyệt của người dùng.
