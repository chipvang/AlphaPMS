# KIẾN TRÚC UNDO/REDO — PHIÊN BẢN V1

## 1. Trạng thái

**Đã chốt nguyên tắc nền tảng ngày 18/08/2026.**

Đây là cơ chế dùng chung trước khi phát triển các thao tác thêm, sửa, xóa, dịch chuyển, tăng/giảm cấp WBS, căn chỉnh lưới và hiệu chỉnh dữ liệu công tác.

## 2. Mục tiêu

- Mọi thay đổi dữ liệu có thể hoàn tác và làm lại theo cùng một chuẩn.
- Tách lịch sử thao tác khỏi component giao diện và nghiệp vụ cụ thể.
- Không buộc module nghiệp vụ biết cách tổ chức `Undo Stack` và `Redo Stack`.
- Chuẩn bị khả năng mở rộng sang lịch sử máy chủ và kiểm soát xung đột nhiều người dùng.

## 3. Phạm vi V1

V1 quản lý lịch sử dữ liệu nháp trong phiên làm việc trên trình duyệt:

- Tối đa 100 bước cho một vùng dữ liệu.
- Có nút **Hoàn tác** và **Làm lại**.
- Phím tắt `Ctrl+Z`, `Ctrl+Y` và `Ctrl+Shift+Z`.
- Không chiếm phím tắt khi con trỏ đang ở `input`, `textarea`, `select` hoặc vùng `contenteditable`; tại đó trình duyệt tiếp tục xử lý việc sửa chữ.
- Thao tác mới sau khi hoàn tác sẽ xóa toàn bộ nhánh làm lại.
- Có thể gộp các thay đổi liên tiếp cùng `mergeKey` trong 1 giây thành một bước.

V1 chưa thay thế audit log, versioning cơ sở dữ liệu hoặc cơ chế phục hồi sau khi tải lại trang.

## 4. Mô hình trạng thái

```ts
type HistoryState<T> = {
  present: T;
  undoStack: HistoryEntry<T>[];
  redoStack: HistoryEntry<T>[];
};

type HistoryEntry<T> = {
  id: string;
  description: string;
  before: T;
  after: T;
  createdAt: number;
  mergeKey?: string;
};
```

Mỗi bước lưu trạng thái trước và sau cùng mô tả tiếng Việt. Dữ liệu nghiệp vụ sử dụng kiểu generic `T`, vì vậy cơ chế không phụ thuộc `ScheduleItem`, `Project` hay model dự toán.

## 5. Hợp đồng sử dụng

Component chỉ được sử dụng các lệnh:

- `commit(next, options)`: ghi nhận thay đổi mới.
- `undo()`: hoàn tác bước gần nhất.
- `redo()`: làm lại bước vừa hoàn tác.
- `reset(next)`: thay toàn bộ dữ liệu và xóa lịch sử khi nạp dự án hoặc phiên bản khác.
- `canUndo`, `canRedo`: điều khiển trạng thái nút.
- `undoDescription`, `redoDescription`: hiển thị thao tác sắp được hoàn tác/làm lại.

Không sửa trực tiếp `undoStack` hoặc `redoStack` từ component.

## 6. Quy tắc tích hợp nghiệp vụ

### 6.1. Một thao tác nghiệp vụ là một bước

- Xóa một dòng và toàn bộ dòng con là một bước.
- Di chuyển nhiều dòng đang chọn là một bước.
- Tăng cấp hoặc giảm cấp kèm tính lại WBS là một bước.
- Dán một khối ô là một bước.
- Kéo TaskBar nguồn sang TaskBar đích tạo `FS 0`, Auto Schedule toàn chuỗi successor và cập nhật Summary là một bước khi người dùng thả chuột.
- Tạo, sửa loại, thay đổi lag hoặc xóa `TaskDependency` là một bước; mọi Start/Finish bị lan truyền cùng thuộc một `ScheduleState`, không tạo history riêng cho Dependency Editor, scheduler hay Gantt Dependency Layer.

### 6.2. Thay đổi liên tục

Nhập nhiều ký tự hoặc kéo liên tục có thể dùng chung `mergeKey`. Cơ chế chỉ giữ trạng thái trước lần đầu và trạng thái sau lần cuối trong cửa sổ gộp.

### 6.3. Phạm vi lịch sử

Lịch sử phải thuộc một vùng dữ liệu có ranh giới rõ ràng. Khi chuyển sang dự án/phiên bản dữ liệu khác phải `reset` hoặc dùng history riêng; không hoàn tác chéo dữ liệu không cùng phạm vi.

### 6.4. Dữ liệu dẫn xuất

WBS, ngày tổng hợp, Gantt và các giá trị dẫn xuất phải được tính lại từ trạng thái được phục hồi, không lưu thành thao tác rời nếu chúng là hệ quả của cùng một lệnh nghiệp vụ.

## 7. Quan hệ với lưu máy chủ

- Undo/Redo phía máy khách xử lý dữ liệu nháp chưa đồng bộ.
- Audit log phía máy chủ lưu người sửa, thời điểm, đối tượng và phiên bản.
- Khi đã lưu lên máy chủ, việc quay lại phiên bản cũ là một nghiệp vụ phục hồi có kiểm tra quyền và xung đột, không âm thầm dùng Undo cục bộ.
- Mỗi lần lưu phải kèm phiên bản dữ liệu để hỗ trợ optimistic concurrency.

## 8. Cấu trúc mã nguồn V1

- `Code/lib/history/history.ts`: model và reducer thuần, không phụ thuộc React.
- `Code/lib/history/useUndoRedo.ts`: hook kết nối reducer với giao diện React.
- Các module nghiệp vụ tạo trạng thái mới rồi gọi `commit`; không sao chép logic history.

## 9. Tiêu chí nghiệm thu nền tảng

- Thêm công tác → Hoàn tác xóa công tác vừa thêm → Làm lại khôi phục đúng vị trí.
- Xóa dòng có con → Hoàn tác khôi phục cả cha, con và thứ tự ban đầu.
- Sau Undo, thực hiện thao tác mới → nút Làm lại bị vô hiệu hóa.
- Nút và phím tắt có kết quả giống nhau.
- Nút không khả dụng dùng đúng theme `disabled` chung.
- Lịch sử không vượt giới hạn cấu hình.
- Module history không import model tiến độ hoặc component giao diện.

## 10. Hướng mở rộng

Sau khi phát triển thao tác cụ thể, bổ sung command nghiệp vụ cho dịch chuyển WBS, chỉnh ô/lưới, quan hệ công việc, phân bổ BOQ và thao tác hàng loạt. Khi kết nối backend, bổ sung audit log và kiểm tra phiên bản nhưng giữ nguyên hợp đồng sử dụng phía giao diện.
