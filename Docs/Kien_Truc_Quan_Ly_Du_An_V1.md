# AlphaPMS — Kiến trúc backend Quản lý dự án V1

- Trạng thái: **Đã chốt và triển khai nền tảng V1**
- Ngày cập nhật: **23/08/2026**
- Phạm vi: Project, cây WBS/WorkItem, TaskDependency, REST API và persistence.

## 1. Quyết định kiến trúc

AlphaPMS là modular monolith:

```text
React / TypeScript
        │ REST/JSON
        ▼
AlphaPMS.Api
        ▼
AlphaPMS.Application
        ▼
AlphaPMS.Domain

AlphaPMS.Api ──► AlphaPMS.Infrastructure ──► EF Core
                                             ├─ Development: SQLite
                                             └─ Production: PostgreSQL
```

Backend chính thức là ASP.NET Core Web API/C#. Cloudflare D1 không còn là database/backend nghiệp vụ chính. Cloudflare vẫn có thể phục vụ DNS, CDN, SSL/WAF và hosting frontend, nhưng Domain/Application không phụ thuộc Cloudflare, React, HTTP, SQLite hoặc PostgreSQL.

## 2. Cấu trúc solution

Solution nằm tại `Code/Backend/AlphaPMS.sln`:

- `AlphaPMS.Domain`: entity, enum và domain rule; không phụ thuộc EF Core/ASP.NET.
- `AlphaPMS.Application`: DTO, use case service, validation và persistence abstraction.
- `AlphaPMS.Infrastructure`: EF Core, `AlphaPmsDbContext`, Fluent Configuration, repository và provider selection.
- `AlphaPMS.Api`: controller, CORS, DI, global exception mapping và health check.
- Ba test project kiểm thử Domain, Application, API và persistence.

Dependency direction bắt buộc: `Domain ← Application ← Infrastructure`; API sử dụng Application và Infrastructure. Controller không chứa business logic và DbContext không điều phối use case.

## Quy tắc hierarchy WorkItem

Cấu trúc WBS hợp lệ của module tiến độ:

- `WorkPackage` nằm ở gốc của danh sách WorkItem.
- `Group` chỉ nằm dưới `WorkPackage` và là cấp tùy chọn.
- `Task` có thể nằm trực tiếp dưới `WorkPackage` hoặc dưới `Group`.
- `Task` không được chứa WorkItem con; `Group` không được nằm dưới `Group`.
- Summary, Gantt bar và capability nghiệp vụ được xác định bằng `ItemType`, không bằng depth hay loại parent.

## 3. Domain model V1

`Project` dùng immutable `Guid Id`, mã duy nhất, tên, mô tả, trạng thái, ngày, thông tin quản lý, ngân sách, tiến độ, phạm vi hiển thị và timestamp.

`WorkItem` là node chung cho Hạng mục (`WorkPackage`), Nhóm (`Group`) và Công tác (`Task`). Dữ liệu nguồn gồm `ProjectId`, `ParentId`, `ItemType`, tên, đơn vị, khối lượng, thời lượng, ngày, tiến độ, `MachineShiftFactor`, `Nclm`, `PermanentLabor`, thứ tự và timestamp. STT, WBS, summary date, trạng thái tính toán và hình học Gantt là dữ liệu dẫn xuất, không lưu làm khóa.

`TaskDependency` dùng ID thật của hai Task, hỗ trợ `FS`, `SS`, `FF`, `SF` và `LagDays` âm/dương. Backend từ chối self-link, task không tồn tại, khác dự án, node không phải Task, duplicate và cycle.

Application kiểm soát conversion `Task → Group`: chỉ hợp lệ khi parent là `WorkPackage`, Task không tham gia dependency và không có dữ liệu Task-specific đã lưu. Validation kiểm tra entity hiện tại trước khi update/replace để không cho payload xóa dữ liệu rồi đổi loại; conversion không destructive và không cần thay schema.

## 4. Persistence và provider

EF Core dùng Fluent Configuration với bảng `projects`, `work_items`, `task_dependencies` và snake_case columns. Project xóa cascade dữ liệu thuộc dự án; quan hệ cây và dependency dùng `Restrict` tại khóa nhạy cảm để Application kiểm soát xóa nhánh.

Development dùng `Database:Provider=Sqlite` và `Data Source=Data/alphapms-dev.db`. Production đặt `Database__Provider=PostgreSql` và `ConnectionStrings__AlphaPms` bằng environment variable/secret; không hard-code credential.

Một Domain model và một DbContext configuration dùng chung. Migration SQLite V1 là `InitialCreate`. Trước production phải tạo và test migration PostgreSQL riêng; không giả định migration SQLite tương thích tuyệt đối.

## 5. REST API và frontend

API giữ envelope `{ "data": ... }` và lỗi `{ "error": { "code", "message" } }`.

| Method | Route | Chức năng |
|---|---|---|
| GET, POST | `/api/projects` | Danh sách/tạo dự án |
| GET, PUT, PATCH, DELETE | `/api/projects/{id}` | Đọc/sửa/xóa dự án |
| GET, POST, PUT | `/api/projects/{projectId}/work-items` | Đọc/tạo/lưu đồng bộ WBS |
| PUT, PATCH, DELETE | `/api/work-items/{id}` | Sửa/xóa WorkItem |
| GET, POST, PUT | `/api/projects/{projectId}/dependencies` | Đọc/tạo/lưu đồng bộ dependency |
| GET, PUT | `/api/projects/{projectId}/schedule` | Đọc/lưu nguyên tử WorkItems và TaskDependencies của một dự án |
| PUT, PATCH, DELETE | `/api/dependencies/{id}` | Sửa/xóa dependency |
| GET | `/health` | Kiểm tra backend |

Nút **Lưu thay đổi** vẫn là application boundary: working state và Undo/Redo ở client; khi lưu, WBS và dependency được gửi lên Application transaction. Frontend lấy base URL từ `NEXT_PUBLIC_API_BASE_URL`.

## 6. Error handling, logging và test

Global middleware ánh xạ validation thành 400, not found thành 404, conflict/cycle/duplicate thành 409 và lỗi không dự kiến thành 500; production không trả stack trace. Logging dùng ASP.NET Core.

Test gồm Domain rules; dependency hợp lệ và các trường hợp self/duplicate/cross-project/cycle; integration API trên SQLite file với dispose/restart host rồi đọc lại Project, hierarchy và dependency.

`ProjectScheduleService` là transaction boundary của nút **Lưu thay đổi**. Service xóa quan hệ cũ, áp dụng trạng thái WBS cuối cùng rồi kiểm tra/tạo lại quan hệ trong cùng transaction EF Core. Nếu hierarchy hoặc dependency không hợp lệ, toàn bộ thay đổi của dự án được rollback; dự án khác được lưu bằng transaction riêng. Frontend giữ working state và Undo/Redo, chỉ gửi trạng thái cuối khi người dùng bấm Lưu.

Không bổ sung migration trong iteration hoàn thiện persistence vì schema `work_items` và `task_dependencies` hiện tại đã có đủ field nguồn. Optimistic concurrency nhiều người dùng chưa triển khai; `UpdatedAt` tiếp tục được cập nhật theo transaction hiện tại và là điểm mở rộng sau này.

## 7. Phạm vi mở rộng

Estimate, Resource, Calendar, Baseline, Progress, Critical Path và Resource Leveling sẽ là entity/service riêng khi nghiệp vụ được chốt. Không thêm cột material/machine lặp vào WorkItem và không tạo abstraction rỗng cho module chưa triển khai.
