# Môi trường phát triển AlphaPMS

## 1. Workspace chính thức

Toàn bộ mã nguồn làm việc đặt tại:

```text
D:\GoogleDrive\A.Projects\AlphaPMS\Code
```

Tài liệu đặc tả đặt tại:

```text
D:\GoogleDrive\A.Projects\AlphaPMS\Docs
```

Mở file `AlphaPMS.code-workspace` bằng VS Code để xem đồng thời hai thư mục `Code` và `Docs`.

## 2. Công cụ đề xuất

- Visual Studio Code để chỉnh sửa thủ công.
- Node.js LTS từ phiên bản 22 trở lên.
- `pnpm` thông qua Corepack.
- Git để quản lý phiên bản.
- Codex mở đúng workspace `Code` để cùng sửa một bộ file với VS Code.

## 3. Cài đặt lần đầu

Mở Terminal tại thư mục `Code` và chạy:

```powershell
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

Không đồng bộ thư mục `node_modules`, `.next`, `dist`, `.vinext` và `.wrangler` lên kho mã nguồn.

## 4. Chạy localhost

```powershell
pnpm dev
```

Sau đó mở:

```text
http://localhost:3000
```

Có thể dùng tác vụ VS Code: `Terminal` → `Run Task` → `AlphaPMS: Chạy localhost`.

## 5. Quy trình làm việc chung

1. Mở `AlphaPMS.code-workspace`.
2. Đọc `Docs/Readme.md` và đặc tả liên quan.
3. Chạy `pnpm dev` và giữ terminal hoạt động.
4. Chỉnh sửa trong VS Code hoặc giao việc cho Codex trên cùng thư mục `Code`.
5. Trình duyệt tự cập nhật sau khi lưu file.
6. Trước khi chốt thay đổi, chạy:

```powershell
pnpm lint
pnpm build
```

7. Chỉ commit các file nguồn và tài liệu có liên quan.

## 6. Trạng thái prototype hiện tại

- Frontend: React + TypeScript trên Vinext.
- Màn hình đã có: Left Sidebar và Quản lý dự án tương tác.
- Dữ liệu hiện lưu trong `localStorage` của trình duyệt.
- Chưa kết nối backend, SQLite hoặc API nghiệp vụ.
- Prototype dùng để chốt thao tác và cấu trúc giao diện trước khi thiết kế dữ liệu thật.

## 7. Nguyên tắc phối hợp VS Code và Codex

- Không tạo thêm bản sao mã nguồn ở thư mục khác để chỉnh riêng.
- Nếu đang sửa một file thủ công, báo cho Codex biết file và phần đang sửa.
- Trước khi Codex sửa, yêu cầu kiểm tra `git diff` để tránh ghi đè thay đổi thủ công.
- Sau mỗi phần được chốt, cập nhật tài liệu trong `Docs` trước khi mở rộng nghiệp vụ.

