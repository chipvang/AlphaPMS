# Quy tắc làm việc với mã nguồn AlphaPMS

Trước khi phân tích, thiết kế hoặc sửa mã nguồn trong workspace này:

1. Đọc toàn bộ `Docs/Readme.md`.
2. Đọc các đặc tả liên quan trong `Docs`.
3. Kiểm tra thay đổi chưa hoàn tất trước khi chỉnh sửa.
4. Không tự thay đổi kiến trúc, model gốc hoặc schema khi chưa có đặc tả được chốt.
5. Tài liệu nghiệp vụ và giao diện viết bằng tiếng Việt; tên biến, hàm, model, API, bảng và trường dữ liệu viết bằng tiếng Anh.
6. Sau khi sửa phải chạy `pnpm lint` và `pnpm build` hoặc kiểm tra tương đương phù hợp phạm vi.
7. Font của caption, label và nội dung grid trong mọi vùng giao diện không được nhỏ hơn `10px`; component mới phải dùng design token chung `--ui-min-font-size` và chỉ tăng cỡ chữ theo cấp nhấn mạnh.
8. Mọi hộp thoại xác nhận, cảnh báo hoặc hỏi người dùng phải sử dụng module Common Dialog dùng chung. Không sử dụng `window.confirm`, `window.alert`, `globalThis.confirm` và không tạo dialog xác nhận riêng trong từng màn hình. Nội dung hiển thị phải bằng tiếng Việt, dùng thuật ngữ nghiệp vụ thống nhất; `Dependency` hiển thị là **Quan hệ công việc**.

Thư mục chính thức:

- Mã nguồn: `D:\A VinAlpha\AlphaPMS\Code`
- Tài liệu: `D:\A VinAlpha\AlphaPMS\Docs`
