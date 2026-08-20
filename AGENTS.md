# Quy tắc làm việc với mã nguồn AlphaPMS

Trước khi phân tích, thiết kế hoặc sửa mã nguồn trong workspace này:

1. Đọc toàn bộ `Docs/Readme.md`.
2. Đọc các đặc tả liên quan trong `Docs`.
3. Kiểm tra thay đổi chưa hoàn tất trước khi chỉnh sửa.
4. Không tự thay đổi kiến trúc, model gốc hoặc schema khi chưa có đặc tả được chốt.
5. Tài liệu nghiệp vụ và giao diện viết bằng tiếng Việt; tên biến, hàm, model, API, bảng và trường dữ liệu viết bằng tiếng Anh.
6. Sau khi sửa phải chạy `pnpm lint` và `pnpm build` hoặc kiểm tra tương đương phù hợp phạm vi.
7. Font của caption, label và nội dung grid trong mọi vùng giao diện không được nhỏ hơn `10px`; component mới phải dùng design token chung (hiện tại là `--ui-min-font-size`) và chỉ tăng cỡ chữ theo cấp nhấn mạnh.

Thư mục chính thức:

- Mã nguồn: `D:\A VinAlpha\AlphaPMS\Code`
- Tài liệu: `D:\A VinAlpha\AlphaPMS\Docs`
