# DỰ TOÁN — ĐẶC TẢ NGHIỆP VỤ VÀ ĐỊNH HƯỚNG GIAO DIỆN

## 1. Trạng thái tài liệu

- Tên tài liệu: `Dutoan.md`
- Phạm vi: Phân hệ Dự toán của AlphaPMS.
- Trạng thái: **Nháp — đang phân tích nghiệp vụ và dựng giao diện đồ họa**.
- Mục đích hiện tại: làm tài liệu làm việc để thống nhất nghiệp vụ, thuật ngữ, quan hệ dữ liệu và giao diện trước khi chốt kiến trúc dữ liệu và lập trình.
- Chưa được xem là đặc tả cuối cùng để code.
- Khi người phụ trách dự án xác nhận **“chốt”**, các nội dung tương ứng mới chuyển thành quy định chính thức.

### 1.1. Tài liệu nguồn

Tài liệu này được tổng hợp từ:

- `Readme.md` — quy tắc chung của dự án AlphaPMS.
- `Giao_Dien_DuToan_V1.md` — đặc tả giao diện dự toán V1 đã có.
- `Mo_ta_phan_mem_V1.md` — mô tả tổng thể sản phẩm.
- Các trao đổi nghiệp vụ trong phiên làm việc hiện tại.
- `page.tsx`, `globals.css` chỉ được dùng để tham khảo hiện trạng giao diện và hệ thiết kế hiện có, chưa phải nguồn quyết định nghiệp vụ cho phần Dự toán.

### 1.2. Nguyên tắc ưu tiên tài liệu

- `Readme.md` là quy tắc gốc của dự án.
- Các quyết định nghiệp vụ được chốt trực tiếp trong quá trình trao đổi này sẽ được ghi lại tại tài liệu này.
- Nội dung chưa được chốt phải ghi rõ là **Đề xuất** hoặc **Chưa chốt**.
- Không tự suy diễn một giả định thành quy định chính thức.

---

# 2. Vai trò của phân hệ Dự toán

Phân hệ Dự toán của AlphaPMS không chỉ nhằm tính tiền.

Vai trò cốt lõi của phân hệ là chuyển đổi:

```text
Khối lượng công việc
    → Công tác dự toán / định mức
    → Hao phí vật liệu, nhân công, máy
    → Nhu cầu tài nguyên của công tác tiến độ
    → Phân bổ tài nguyên theo thời gian
    → Biểu đồ tài nguyên
    → Phục vụ lập và theo dõi tiến độ
```

Ở các giai đoạn sau, cùng dữ liệu tài nguyên này sẽ được mở rộng sang bài toán kinh phí:

```text
Hao phí tài nguyên
    × Giá tài nguyên
    → Đơn giá
    → Thành tiền
    → Chi phí công tác
    → Chi phí dự án
```

## 2.1. Trọng tâm V1

Trong V1, ưu tiên là:

1. Quản lý công tác dự toán gắn với công tác tiến độ.
2. Tra cứu bộ định mức.
3. Quản lý hao phí vật liệu, nhân công, máy.
4. Tổng hợp hao phí thành nhu cầu tài nguyên của công tác tiến độ.
5. Dùng nhu cầu tài nguyên để lập biểu đồ tài nguyên theo thời gian.
6. Phục vụ lập tiến độ và theo dõi thi công.

V1 **chưa tập trung hoàn thiện đầy đủ nghiệp vụ dự toán kinh phí**.

Tuy nhiên, cấu trúc dữ liệu phải được thiết kế đủ đúng để sau này có thể bổ sung giá, đơn giá và thành tiền mà không phải phá bỏ mô hình dữ liệu cốt lõi.

---

# 3. Hệ thuật ngữ chính thức đang sử dụng

## 3.1. `TaskItem` — Công tác tiến độ

`TaskItem` là công tác được quản lý trên cây WBS và trên tiến độ/Gantt.

Đây là công tác đại diện cho một phạm vi thi công mà người quản lý tiến độ muốn theo dõi.

Ví dụ:

**Lắp đặt cống D600 đoạn 1**

Một `TaskItem` có thể quản lý:

- Tên công tác.
- Đơn vị đại diện.
- Khối lượng đại diện.
- Ngày bắt đầu.
- Ngày kết thúc.
- Thời lượng.
- Tình trạng thực hiện.
- Nhu cầu vật liệu.
- Nhu cầu nhân công.
- Nhu cầu máy.
- Phân bổ tài nguyên theo thời gian.
- Chi phí trong các phiên bản sau.

Một `TaskItem` không bắt buộc tương ứng với đúng một công tác định mức.

Trong thực tế, một `TaskItem` có thể đại diện cho một nhóm công việc thi công hoàn chỉnh gồm nhiều công tác dự toán.

Ví dụ `TaskItem`:

**Lắp đặt cống D600**

có thể gồm:

- Đào móng.
- Vận chuyển đất.
- Làm lớp đệm.
- Lắp đế cống.
- Lắp cống.
- Xây/lắp hố ga.
- Đắp đất mang cống.
- Hoàn trả.

Trên Gantt chỉ hiển thị **một dòng `TaskItem`**.

Các công tác dự toán phía dưới không tạo thanh Gantt riêng.

---

## 3.2. `TaskEstimateItem` — Công tác dự toán

`TaskEstimateItem` là một công tác dự toán nằm trong hoặc được xây dựng theo bộ định mức.

Ví dụ:

- `AF.11112`
- `AG.22223`

Một công tác dự toán có thể lấy từ:

- Định mức do Bộ Xây dựng ban hành.
- Định mức chuyên ngành.
- Bộ định mức hợp lệ khác.
- Công tác tạm tính hoặc công tác người dùng tự xây dựng.

Quan hệ nghiệp vụ:

```text
TaskItem
    → 1..n TaskEstimateItem
```

Một `TaskItem` có thể có một hoặc nhiều `TaskEstimateItem`.

Không tồn tại loại dữ liệu riêng “công tác gộp”.

- Một `TaskEstimateItem` dưới `TaskItem`: trường hợp đơn giản.
- Nhiều `TaskEstimateItem` dưới `TaskItem`: trường hợp công tác tiến độ đại diện cho nhiều công tác dự toán cấu thành.

Mỗi `TaskEstimateItem` dự kiến quản lý tối thiểu:

- Mã định mức.
- Tên công tác.
- Đơn vị.
- Khối lượng.
- Hệ số nếu có.
- Nhóm định mức.
- Nguồn định mức.
- Phiên bản định mức.
- Danh sách hao phí vật liệu, nhân công, máy.

---

## 3.3. `TaskEstimateResource` — Hao phí của công tác dự toán

Mỗi `TaskEstimateItem` có danh sách hao phí tài nguyên để thực hiện công tác đó.

Mỗi dòng hao phí được gọi là:

`TaskEstimateResource`

Ba nhóm tài nguyên:

1. `Material` — Vật liệu.
2. `Labor` — Nhân công.
3. `Machine` — Máy thi công.

Ví dụ một công tác bê tông có thể có:

- Xi măng.
- Cát.
- Đá.
- Nước.
- Nhân công.
- Máy trộn.
- Máy đầm.

Một `TaskEstimateResource` dự kiến quản lý:

- Mã tài nguyên.
- `resource_id`.
- Tên tài nguyên.
- Loại tài nguyên.
- Đơn vị.
- Hao phí gốc.
- Hao phí điều chỉnh.
- Hệ số.
- Giá tài nguyên ở giai đoạn sau.
- Nguồn dữ liệu.

Hao phí có thể:

- Tra từ định mức.
- Thêm thủ công.
- Sửa.
- Xóa.
- Thay thế tài nguyên.
- Điều chỉnh hệ số.

Khi một định mức nguồn được sử dụng trong dự án, dữ liệu hao phí phải được sao chép thành dữ liệu dự án để có thể chỉnh sửa mà không làm thay đổi bộ định mức nguồn.

---

## 3.4. `TaskItemResource` — Tài nguyên của công tác tiến độ

`TaskItemResource` là nhu cầu tài nguyên của toàn bộ `TaskItem` sau khi tổng hợp từ các `TaskEstimateItem` trực thuộc.

Quan hệ:

```text
TaskItem
    → TaskItemResource

TaskEstimateItem
    → TaskEstimateResource
```

Đây là hệ thuật ngữ thống nhất sử dụng từ thời điểm hiện tại.

`TaskEstimateResource` và `TaskItemResource` không được dùng thay thế lẫn nhau.

### Ý nghĩa khác nhau

`TaskEstimateResource`:

- Thuộc một `TaskEstimateItem` cụ thể.
- Thể hiện hao phí chi tiết theo định mức hoặc sau hiệu chỉnh.
- Là dữ liệu nguồn để tính toán.

`TaskItemResource`:

- Thuộc một `TaskItem`.
- Là tài nguyên đã tổng hợp từ các công tác dự toán cấu thành.
- Dùng cho tiến độ, phân bổ theo thời gian và biểu đồ tài nguyên.

---

# 4. Mô hình quan hệ nghiệp vụ

Mô hình cơ bản:

```text
Project
    ↓
WBS
    ↓
TaskItem
    ├── TaskEstimateItem A
    │       ├── TaskEstimateResource
    │       ├── TaskEstimateResource
    │       └── ...
    │
    ├── TaskEstimateItem B
    │       ├── TaskEstimateResource
    │       └── ...
    │
    └── TaskItemResource
            ├── Material
            ├── Labor
            └── Machine
```

Luồng tính toán:

```text
TaskEstimateItem.Quantity
    × TaskEstimateResource.ConsumptionRate
    × hệ số áp dụng
        ↓
Nhu cầu tài nguyên của từng TaskEstimateItem
        ↓
Tổng hợp các tài nguyên giống nhau
        ↓
TaskItemResource
        ↓
Phân bổ theo thời gian của TaskItem
        ↓
Biểu đồ tài nguyên
```

---

# 5. Phân biệt mức hao phí và nhu cầu tài nguyên

Đây là nguyên tắc quan trọng.

Ví dụ:

```text
0,25 công / m³
```

là **mức hao phí**.

Nếu khối lượng công tác là:

```text
500 m³
```

thì:

```text
500 × 0,25 = 125 công
```

`125 công` là **nhu cầu tài nguyên**.

Vì vậy cần phân biệt rõ:

- Mức hao phí trên một đơn vị công tác.
- Tổng lượng tài nguyên cần cho khối lượng thực tế.

Không dùng cùng một trường dữ liệu cho hai ý nghĩa này.

---

# 6. Danh mục định mức

## 6.1. Vai trò

Hệ thống có một **Danh mục định mức** được lập sẵn để người dùng tra cứu và lựa chọn công tác dự toán.

Danh mục định mức là dữ liệu nguồn, độc lập với dữ liệu dự toán của từng dự án.

## 6.2. Dữ liệu tối thiểu

Mỗi công tác trong danh mục định mức tối thiểu có:

- Mã công việc / mã định mức.
- Tên công việc.
- Đơn vị.
- Nhóm định mức.

Ngoài ra về sau cần có:

- Bộ định mức / nguồn ban hành.
- Chương.
- Nhóm công tác.
- Phiên bản.
- Ngày hiệu lực.
- Danh sách hao phí vật liệu.
- Danh sách hao phí nhân công.
- Danh sách hao phí máy.

---

# 7. Phân nhóm định mức

Các công tác trong danh mục phải được phân nhóm để việc tra cứu thuận tiện hơn.

Mục tiêu:

- Giảm phạm vi tìm kiếm.
- Hỗ trợ người dùng tìm theo lĩnh vực công việc.
- Không phải nhớ chính xác mã định mức.

Cấu trúc phân nhóm dự kiến:

```text
Bộ định mức
    → Chương
        → Nhóm công tác
            → Công tác định mức
```

**Chưa chốt:** cấu trúc nhóm thực tế sẽ phụ thuộc dữ liệu bộ định mức được nạp vào AlphaPMS.

---

# 8. Tra cứu định mức

## 8.1. Mục tiêu

Người dùng phải có thể tìm nhanh công tác dự toán phù hợp để gán cho `TaskItem`.

## 8.2. Phương pháp tìm kiếm

Cửa sổ tra cứu dự kiến hỗ trợ:

- Lọc theo nhóm định mức.
- Tìm chính xác theo mã.
- Tìm mã bắt đầu bằng từ khóa.
- Tìm theo tên công tác.
- Tìm theo nhiều từ khóa.
- Tìm tiếng Việt có dấu.
- Tìm tiếng Việt không dấu.

API không cần tải toàn bộ danh mục lên giao diện cùng lúc.

Kết quả tìm kiếm chỉ nên trả một số lượng phù hợp, ví dụ khoảng 30–50 công tác gần nhất với điều kiện tìm kiếm.

Chi tiết `TaskEstimateResource` chỉ tải khi người dùng chọn hoặc yêu cầu xem một công tác cụ thể.

---

# 9. Quy trình gán công tác dự toán cho `TaskItem`

Ví dụ người dùng chọn `TaskItem`:

**Lắp đặt cống D600 đoạn 1**

Sau đó thực hiện lệnh:

**Tra định mức**

Hệ thống mở cửa sổ tra cứu.

Người dùng có thể chọn lần lượt:

1. Đào đất móng.
2. Vận chuyển đất.
3. Làm lớp đệm.
4. Lắp đặt cống.
5. Xây/lắp hố ga.
6. Đắp đất hoàn trả.

Các công tác được chọn được tạo thành danh sách `TaskEstimateItem` trực thuộc `TaskItem`.

Sau khi gán, người dùng có thể:

- Thêm công tác dự toán.
- Xóa công tác dự toán.
- Sao chép công tác dự toán.
- Dịch lên / xuống.
- Sửa tên.
- Sửa đơn vị khi nghiệp vụ cho phép.
- Nhập/sửa khối lượng.
- Điều chỉnh hệ số.
- Thay đổi định mức.
- Thêm công tác tạm tính.
- Xem hao phí.
- Sửa hao phí.

---

# 10. Nguyên tắc khối lượng

## 10.1. Khối lượng của `TaskEstimateItem`

Mỗi `TaskEstimateItem` có khối lượng riêng theo đúng đơn vị của công tác đó.

Ví dụ:

| Công tác | Đơn vị | Khối lượng |
|---|---|---:|
| Đào đất móng | m³ | 1.250 |
| Lắp đặt cống D600 | m | 240 |
| Xây hố ga | cái | 12 |

## 10.2. Không cộng các khối lượng khác đơn vị

Không được tính:

```text
1.250 m³ + 240 m + 12 cái
```

để tạo ra khối lượng của `TaskItem`.

`TaskItem` có thể có:

- Đơn vị đại diện.
- Khối lượng đại diện.

Ví dụ:

```text
TaskItem: Lắp đặt cống D600 đoạn 1
Đơn vị đại diện: m
Khối lượng đại diện: 240
```

Khối lượng đại diện không thay thế khối lượng của các `TaskEstimateItem`.

---

# 11. Tính nhu cầu tài nguyên của `TaskEstimateItem`

Công thức cơ bản:

```text
EstimateResourceQuantity
    = TaskEstimateItem.Quantity
    × TaskEstimateResource.AdjustedConsumptionRate
    × ResourceCoefficient
```

Trong đó:

- `TaskEstimateItem.Quantity`: khối lượng công tác dự toán.
- `AdjustedConsumptionRate`: hao phí thực tế sử dụng để tính.
- `ResourceCoefficient`: hệ số tài nguyên nếu có.

**Chưa chốt:** hệ số có thể còn tồn tại ở các cấp khác nhau; công thức đầy đủ sẽ được đặc tả riêng trước khi code phần tính toán chính thức.

---

# 12. Tổng hợp thành `TaskItemResource`

Sau khi tính nhu cầu tài nguyên của từng `TaskEstimateItem`, hệ thống cộng các tài nguyên giống nhau.

Ví dụ:

```text
TaskEstimateItem A
→ Nhân công bậc 3,5/7: 50 công

TaskEstimateItem B
→ Nhân công bậc 3,5/7: 30 công
```

Kết quả tại `TaskItem`:

```text
TaskItemResource
→ Nhân công bậc 3,5/7: 80 công
```

Việc xác định tài nguyên giống nhau phải dựa trên khóa tài nguyên ổn định như `resource_id`, không chỉ dựa trên tên hiển thị.

---

# 13. Nguyên tắc dữ liệu nguồn và dữ liệu tổng hợp

## 13.1. Dữ liệu chi tiết là nguồn chính

Nguồn để tính lại là:

```text
TaskEstimateItem
+
TaskEstimateResource
```

`TaskItemResource` là kết quả tổng hợp.

## 13.2. Không làm mất dấu nguồn

Không được chỉ lưu lại tổng `TaskItemResource` rồi loại bỏ quan hệ với các `TaskEstimateItem` ban đầu.

Phải luôn có khả năng xác định:

- Tài nguyên tổng hợp đến từ công tác dự toán nào.
- Hao phí ban đầu là bao nhiêu.
- Hao phí đã được sửa thế nào.

## 13.3. Cache

Có thể lưu `TaskItemResource` dạng cache để tăng tốc hiển thị hoặc lập biểu đồ.

Nếu dùng cache thì phải có cơ chế tính lại rõ ràng khi:

- Thay đổi khối lượng.
- Thay đổi định mức.
- Thay đổi hao phí.
- Thay đổi hệ số.
- Thêm/xóa `TaskEstimateItem`.
- Thêm/xóa/thay tài nguyên.

---

# 14. Hai cách xem tài nguyên trong giao diện

Giao diện phải hỗ trợ quan sát ở hai mức.

## 14.1. Xem hao phí của từng `TaskEstimateItem`

Người dùng chọn một công tác dự toán.

Hệ thống hiển thị các `TaskEstimateResource` của công tác đó.

Mục đích:

- Kiểm tra định mức.
- Kiểm tra hao phí.
- Sửa hao phí.
- Thêm/xóa tài nguyên.
- Thay thế tài nguyên.
- Điều chỉnh hệ số.

## 14.2. Xem tổng hợp `TaskItemResource`

Hệ thống tổng hợp tất cả tài nguyên của toàn bộ các `TaskEstimateItem` thuộc `TaskItem`.

Mục đích:

- Quan sát nhu cầu tài nguyên thực tế của công tác tiến độ.
- Kiểm tra tổng vật liệu.
- Kiểm tra tổng nhân công.
- Kiểm tra tổng máy.
- Là dữ liệu đầu vào cho biểu đồ tài nguyên và tiến độ.

---

# 15. Liên kết với tiến độ

`TaskItem` đã có thông tin thời gian:

- Ngày bắt đầu.
- Ngày kết thúc.
- Thời lượng.
- Lịch làm việc.

Sau khi có `TaskItemResource`, hệ thống phân bổ tài nguyên vào thời gian thi công.

Ví dụ:

```text
Tổng nhân công: 120 công
Thời gian: 15 ngày
```

Nếu phân bổ đều:

```text
120 / 15 = 8 công/ngày
```

Kết quả phân bổ được dùng để lập biểu đồ tài nguyên.

---

# 16. Biểu đồ tài nguyên

Từ `TaskItemResource` và lịch tiến độ, hệ thống có thể tổng hợp nhu cầu theo:

- Công tác.
- Nhóm công tác.
- Hạng mục.
- Dự án.
- Nhiều dự án.

Các loại biểu đồ hướng tới:

- Nhân lực theo ngày.
- Nhân lực theo tuần.
- Nhân lực theo tháng.
- Nhân lực theo loại/bậc thợ.
- Máy thi công theo loại máy.
- Vật liệu theo chủng loại.
- Chi phí theo thời gian ở giai đoạn sau.

Trong V1, biểu đồ nhân lực và tài nguyên theo thời gian là đầu ra quan trọng của phân hệ Dự toán.

---

# 17. Giá tài nguyên và đơn giá — hướng mở rộng

Mỗi tài nguyên về sau có thể có giá.

Ví dụ:

```text
ResourceAmount
    = ResourceQuantity × ResourcePrice
```

Từ đó có thể tính:

- Chi phí vật liệu.
- Chi phí nhân công.
- Chi phí máy.
- Đơn giá `TaskEstimateItem`.
- Giá trị `TaskEstimateItem`.
- Tổng giá trị `TaskItem`.
- Tổng chi phí theo WBS.

Đây là định hướng kiến trúc cần lưu ý ngay từ V1 nhưng **chưa phải nghiệp vụ ưu tiên để hoàn thiện trong V1**.

---

# 18. Giao diện Quản lý dự toán — đã thống nhất để dựng UI

## 18.1. Trạng thái quyết định

Các nội dung trong Mục 18 đến Mục 20 là **giao diện đã thống nhất cho vòng dựng UI hiện tại**.

Mục tiêu của vòng này là dựng giao diện đồ họa, kiểm tra bố cục và hành vi sử dụng trước khi chốt schema DB/API và lập trình nghiệp vụ dữ liệu thật.

Giao diện được thiết kế cho màn hình desktop **Full HD 1920 × 1080** và phải bám sát hệ thiết kế hiện có của màn hình **Quản lý tiến độ**.

## 18.2. Nguyên tắc kiến trúc giao diện dùng chung

- Màn hình **Quản lý dự toán** là một workspace riêng, được mở từ mục **Quản lý dự toán** trên sidebar.
- Không đưa nghiệp vụ Dự toán vào màn hình **Danh sách dự án**.
- Không nhét các grid Dự toán vào màn hình **Quản lý tiến độ**.
- Không tạo bản sao mới của TaskGrid bằng cách copy code.
- Cây WBS và thao tác trên công tác phải sử dụng chung một `TaskGridCore` với Quản lý tiến độ.
- `page.tsx` về lâu dài chỉ nên giữ vai trò composition/navigation; không tiếp tục chứa toàn bộ JSX và logic của TaskGrid.
- Các nhóm cột TaskGrid được tổ chức theo cấu hình dùng chung, định hướng gồm:
  - `basicColumns`;
  - `scheduleColumns`;
  - `estimateColumns`;
  - `resourceColumns`.
- Màn hình Dự toán và màn hình Tiến độ dùng chung `TaskItem` và cùng logic cây WBS.
- Giao diện, font chữ, row height, border, màu nền, selection, action icon và cách sửa trực tiếp trong ô phải kế thừa từ TaskGrid hiện tại để giảm code trùng và tránh sai khác hành vi.

Kiến trúc UI định hướng:

```text
page.tsx
├── ScheduleWorkspace
│   ├── TaskGridCore
│   └── Gantt
│
└── EstimateWorkspace
    ├── TaskGridCore
    ├── TaskEstimateItemGrid
    └── EstimateResourceGrid
```

## 18.3. Bố cục tổng thể màn hình Dự toán

Màn hình chia thành ba khối nghiệp vụ nhưng bố trí theo dạng **một khối bên trái + hai khối bên phải**:

```text
┌──────────────────────────────┬─────────────────────────────────────┐
│                              │ Khối 2 — TaskEstimateItem           │
│ Khối 1 — TaskItem / WBS      │                                     │
│ dùng chung TaskGridCore      ├─────────────────────────────────────┤
│                              │ Khối 3 — Resource                   │
│                              │ TaskEstimateResource /              │
│                              │ TaskItemResource                    │
└──────────────────────────────┴─────────────────────────────────────┘
```

Tỷ lệ ban đầu khi dựng Full HD:

- Khối 1 bên trái: khoảng **38–42%** chiều rộng workspace.
- Vùng bên phải: phần còn lại.
- Vùng bên phải chia dọc thành:
  - Khối 2 ở trên;
  - Khối 3 ở dưới.
- Mỗi pane có vùng cuộn riêng khi dữ liệu vượt kích thước hiển thị.
- Không tạo page scrollbar lớn làm trôi toàn bộ workspace nếu có thể tránh.

## 18.4. Toolbar màn hình Dự toán

Toolbar kế thừa style màn hình hiện có.

Các tác vụ cấp màn hình có thể gồm:

- Nhập từ Excel.
- Hoàn tác.
- Làm lại.
- Lọc.
- Lịch sử.
- Lưu thay đổi.
- Bộ chọn dự án/gói thầu nếu context chung của ứng dụng đang sử dụng.

Màn hình Dự toán **không hiển thị** các điều khiển riêng của Gantt/tiến độ:

- **Lịch làm việc**.
- **Cách nhau N ngày**.
- Các điều khiển timeline Gantt.

## 18.5. Sidebar

- Giữ cấu trúc sidebar hiện tại của AlphaPMS.
- Mục **Quản lý dự toán** hiển thị trạng thái active khi đang ở EstimateWorkspace.
- Icon sidebar phải rõ, thống nhất, mục tiêu kích thước khoảng **24 × 24 px**.
- Ưu tiên icon library hiện có; nếu chưa có thì sử dụng reusable inline SVG, không thêm dependency lớn chỉ để lấy icon.

---

# 19. Khối 1 — Công tác tiến độ `TaskItem`

## 19.1. Nguyên tắc

Khối 1 phải giữ giao diện và hành vi gần như **100% TaskGrid của màn hình Quản lý tiến độ**.

Đây là cùng cây WBS, cùng dữ liệu `TaskItem`, không phải bản sao dữ liệu dự toán.

Khối này tiếp tục cho phép các thao tác quản lý cây giống màn hình Quản lý tiến độ, gồm theo khả năng hiện có của TaskGrid:

- thêm công tác/hạng mục/nhóm;
- sửa trực tiếp;
- xóa;
- chèn;
- sắp xếp/reorder;
- expand/collapse;
- thao tác WBS;
- selection/copy/paste nếu TaskGrid hiện có hỗ trợ;
- Undo/Redo qua cơ chế dùng chung.

## 19.2. Các cột hiển thị mặc định

Các cột của Khối 1 đã thống nhất:

1. STT.
2. WBS.
3. Tác vụ.
4. Tên công việc.
5. Đơn vị.
6. Khối lượng.
7. Hệ số CM.
8. NCLM.
9. NCCH.

Tên kỹ thuật cụ thể của các trường Hệ số CM, NCLM, NCCH sẽ tiếp tục bám model tiến độ hiện có; không tạo trường mới chỉ để phục vụ UI nếu dữ liệu tương ứng đã tồn tại.

## 19.3. Tìm kiếm

- Không có hàng filter dưới header.
- Chỉ cần một ô tìm kiếm/lọc theo **Tên công việc** ở phía trên grid.
- Không triển khai hệ thống filter nhiều cột cho Khối 1 trong vòng UI này.

## 19.4. Style

- Font, độ rộng cột, row height và action icon phải lấy trực tiếp từ TaskGrid hiện tại hoặc từ cấu hình cột dùng chung.
- Không tự tăng font so với màn hình Quản lý tiến độ.
- Tên công việc và thụt lề cây WBS giữ đúng quy tắc hiện tại.

---

# 20. Khối 2 và Khối 3 — Công tác dự toán và hao phí tài nguyên

## 20.1. Khối 2 — `TaskEstimateItemGrid`

Khối 2 hiển thị các `TaskEstimateItem` thuộc `TaskItem` đang chọn ở Khối 1.

Phần caption phải thể hiện rõ công tác tiến độ đang chọn, ví dụ:

```text
Công tác tiến độ đang chọn: 1.1 - Phát quang, dọn dẹp mặt bằng
```

### 20.1.1. Các cột đã thống nhất

1. STT.
2. Tác vụ.
3. Mã định mức.
4. Mã Alpha.
5. Tên công tác dự toán.
6. Đơn vị.
7. Tên cấu kiện.
8. Số cấu kiện.
9. Dài.
10. Rộng.
11. Cao.
12. Hệ số.
13. KL phụ.
14. Khối lượng.

### 20.1.2. Tác vụ dòng

- Thêm/sửa/xóa/chèn/sắp xếp được đặt trong **cột Tác vụ**.
- Cách trình bày icon phải thống nhất với cột Tác vụ của TaskGrid.
- Không tạo một toolbar riêng ở dưới grid cho Thêm/Sửa/Xóa/Đổi mã.

### 20.1.3. Tra định mức

- Không có nút **Tra định mức** cố định trên Khối 2.
- Khi người dùng focus/edit tại ô **Mã định mức** và nhấn **Enter**, hệ thống sẽ mở cửa sổ tra cứu định mức.
- Cửa sổ tra cứu định mức là chức năng riêng sẽ được thiết kế/triển khai sau.
- Việc Enter mở lookup phải không làm mất ngữ cảnh `TaskItem` và dòng `TaskEstimateItem` đang sửa.

### 20.1.4. Filter

- Không có filter row.
- Số lượng `TaskEstimateItem` của một `TaskItem` thường không lớn đến mức cần lọc tại grid này.

## 20.2. Khối 3 — `EstimateResourceGrid`

Khối 3 hiển thị hao phí/tài nguyên liên quan đến công tác dự toán hoặc kết quả tổng hợp của công tác tiến độ.

Có hai chế độ xem:

1. **Theo công tác dự toán** — hiển thị `TaskEstimateResource` của `TaskEstimateItem` đang chọn.
2. **Tổng hợp công tác tiến độ** — hiển thị `TaskItemResource` đã tổng hợp của toàn bộ `TaskItem`.

Có ba tab tài nguyên:

- Vật liệu.
- Nhân công.
- Máy thi công.

### 20.2.1. Các cột đã thống nhất

1. STT.
2. Tác vụ.
3. Mã tài nguyên.
4. Tên tài nguyên.
5. Đơn vị.
6. Hao phí gốc.
7. Hao phí ĐC.
8. Hệ số.
9. Nhu cầu.

### 20.2.2. Tác vụ dòng

- Thêm/sửa/xóa được đặt trong **cột Tác vụ** và dùng style giống TaskGrid.
- Không có hàng button Thêm/Sửa/Xóa phía dưới grid.
- Không có filter row.

### 20.2.3. Quyền chỉnh sửa theo chế độ

Ở chế độ `TaskEstimateResource`:

- cho phép chuẩn bị các hành vi thêm/sửa/xóa hao phí qua action của dòng;
- dữ liệu chi tiết là nguồn để tính toán.

Ở chế độ `TaskItemResource`:

- mặc định coi là dữ liệu tổng hợp/dẫn xuất;
- V1 không sửa trực tiếp kết quả tổng hợp;
- nếu cần thay đổi phải quay về `TaskEstimateResource` nguồn.

### 20.2.4. Chọn dòng và liên kết ba khối

Luồng chọn:

```text
Chọn TaskItem tại Khối 1
    → Khối 2 tải các TaskEstimateItem
        → Chọn TaskEstimateItem tại Khối 2
            → Khối 3 hiển thị TaskEstimateResource
```

Nếu chuyển Khối 3 sang chế độ **Tổng hợp công tác tiến độ**:

```text
TaskItem
    → tổng hợp toàn bộ TaskEstimateItem / TaskEstimateResource
    → TaskItemResource
```

## 20.3. Không gian hiển thị và cuộn

- Khối 2 và Khối 3 sử dụng grid dày tương tự TaskGrid.
- Cột số căn phải, sử dụng chữ số tabular nếu design system hiện có hỗ trợ.
- Tên công tác/tài nguyên có thể ellipsis khi thiếu chiều rộng nhưng phải có cách xem đầy đủ khi cần.
- Header cố định khi cuộn dọc nếu component grid dùng chung hỗ trợ.
- Không đưa filter row chỉ để lấp đầy header.

---

# 21. Trạng thái dữ liệu dự toán

Dự kiến một `TaskItem` có các trạng thái:

- Chưa có công tác dự toán.
- Có công tác dự toán nhưng thiếu dữ liệu.
- Đủ dữ liệu hao phí.
- Có cảnh báo.
- Đã khóa / phát hành — giai đoạn sau.

**Chưa chốt:** tên trạng thái, điều kiện và màu hiển thị cụ thể.

---

# 22. Công tác tạm tính

Nếu không có mã định mức phù hợp, người dùng được tạo `TaskEstimateItem` tạm tính.

Công tác tạm tính vẫn thuộc cùng mô hình:

```text
TaskItem
    → TaskEstimateItem
        → TaskEstimateResource
```

Người dùng có thể nhập:

- Tên công tác.
- Đơn vị.
- Khối lượng.
- Vật liệu.
- Nhân công.
- Máy.

Không tạo một kiểu dữ liệu hoàn toàn khác chỉ vì công tác không có mã định mức chuẩn.

---

# 23. Nguyên tắc tài nguyên dùng chung

Cần có danh mục tài nguyên chuẩn dùng chung.

Ví dụ:

- Xi măng PCB40.
- Cát vàng.
- Nhân công bậc 3,5/7.
- Máy đào 1,25 m³.

Mỗi tài nguyên cần một `resource_id` ổn định.

Mục đích:

- Tổng hợp chính xác giữa nhiều `TaskEstimateItem`.
- Tránh cộng theo tên hiển thị.
- Dùng chung cho biểu đồ.
- Dùng chung cho hệ thống giá sau này.

---

# 24. Phạm vi V1 cần ưu tiên

V1 ưu tiên hoàn thiện các chức năng sau:

1. Danh mục định mức.
2. Phân nhóm định mức.
3. Tra cứu định mức.
4. Gán nhiều `TaskEstimateItem` cho một `TaskItem`.
5. Tạo công tác tạm tính.
6. Quản lý khối lượng từng `TaskEstimateItem`.
7. Quản lý `TaskEstimateResource`.
8. Sửa hao phí.
9. Thêm/xóa tài nguyên.
10. Tổng hợp thành `TaskItemResource`.
11. Phân bổ `TaskItemResource` theo thời gian.
12. Tổng hợp tài nguyên theo cây WBS.
13. Phục vụ biểu đồ nhân lực, máy, vật liệu.
14. Phục vụ lập và theo dõi tiến độ.

---

# 25. Nội dung chưa ưu tiên trong V1

Các nội dung sau chưa phải trọng tâm V1:

- Hệ thống giá đầy đủ.
- Giá vật liệu theo tỉnh/thời điểm.
- Giá nhân công địa phương.
- Giá ca máy.
- Cước vận chuyển.
- Chi phí trực tiếp và gián tiếp.
- Thu nhập chịu thuế tính trước.
- Thuế VAT.
- Tổng mức đầu tư.
- Đầy đủ biểu mẫu dự toán theo quy định.
- Hồ sơ thanh toán/quyết toán.

Các phần này sẽ phát triển trên nền `TaskEstimateResource` và danh mục tài nguyên đã có.

---

# 26. Các điểm giao diện đã chốt và phần còn mở

## 26.1. Đã chốt trong vòng UI hiện tại

- Màn hình Dự toán là workspace riêng trên sidebar.
- Dùng chung `TaskGridCore` với Quản lý tiến độ; không copy TaskGrid.
- Bố cục Full HD 1920 × 1080 theo dạng Khối 1 bên trái, Khối 2/3 bên phải.
- Khối 1 giữ hành vi quản lý WBS như Quản lý tiến độ.
- Khối 1 có các cột: STT, WBS, Tác vụ, Tên công việc, Đơn vị, Khối lượng, Hệ số CM, NCLM, NCCH.
- Khối 1 chỉ có tìm kiếm theo Tên công việc; không có filter row.
- Khối 2 có bộ cột `TaskEstimateItem` đã liệt kê tại Mục 20.1.
- Thêm/sửa/xóa của Khối 2 nằm trong cột Tác vụ; không có toolbar dòng dưới.
- Enter tại Mã định mức mở cửa sổ tra cứu định mức.
- Khối 2 không có filter row.
- Khối 3 có hai mode: Theo công tác dự toán / Tổng hợp công tác tiến độ.
- Khối 3 có tab Vật liệu / Nhân công / Máy thi công.
- Khối 3 có bộ cột đã liệt kê tại Mục 20.2.
- Thêm/sửa/xóa của Khối 3 nằm trong cột Tác vụ; không có toolbar dòng dưới.
- Khối 3 không có filter row.
- Màn hình Dự toán không có Lịch làm việc, Cách nhau N ngày hoặc Gantt.
- Sidebar icon hướng tới 24 × 24 px, rõ và đồng nhất.

## 26.2. Còn mở — cửa sổ tra định mức

- Bố cục cây nhóm và danh sách kết quả.
- Vị trí ô tìm kiếm.
- Bộ lọc nhóm hiển thị thế nào.
- Có xem trước hao phí ngay trong cửa sổ không.
- Cho chọn một hay nhiều mã định mức cùng lúc.
- Cách xác nhận/thêm định mức vào `TaskEstimateItem` đang thao tác.

## 26.3. Còn mở — hành vi nhập liệu chi tiết

- Quy tắc chính thức của công thức Tên cấu kiện / Số cấu kiện / Dài / Rộng / Cao / Hệ số / KL phụ → Khối lượng.
- Quy tắc làm tròn và số chữ số thập phân.
- Cách copy/paste vùng dữ liệu ở TaskEstimateItemGrid và EstimateResourceGrid.
- Quy tắc Undo/Redo cho các grid Dự toán.
- Xác nhận/xử lý khi xóa dữ liệu đang có hao phí con.

## 26.4. Còn mở — dữ liệu tổng hợp và tiến độ

- `TaskItemResource` sẽ lưu cache hay tính động hoàn toàn.
- Phương pháp phân bổ tài nguyên theo thời gian chi tiết.
- Cách chuyển nhanh từ màn hình Dự toán sang màn hình Nguồn lực & chi phí.
- Cách hiển thị cảnh báo thiếu dữ liệu ở TaskItem.

---

# 27. Hướng thiết kế DB — mới ở mức định hướng

Chưa chốt schema trước khi chốt giao diện.

Quan hệ logic hiện tại:

```text
TaskItem
    1 ─── n TaskEstimateItem

TaskEstimateItem
    1 ─── n TaskEstimateResource

TaskItem
    1 ─── n TaskItemResource
```

`TaskItemResource` có thể là:

- dữ liệu dẫn xuất tính động;
- cache;
- hoặc bảng tổng hợp có cơ chế đồng bộ rõ ràng.

Quyết định cuối cùng sẽ thực hiện sau khi giao diện và luồng tính toán được chốt.

---

# 28. Quy tắc tính lại dự kiến

Luồng thay đổi:

```text
Sửa TaskEstimateItem.Quantity
hoặc
Sửa TaskEstimateResource
        ↓
Tính lại nhu cầu tài nguyên của TaskEstimateItem
        ↓
Tổng hợp lại TaskItemResource
        ↓
Cập nhật dữ liệu phân bổ theo thời gian
        ↓
Cập nhật biểu đồ tài nguyên
```

Đây là nguyên tắc nghiệp vụ nền.

Chi tiết về cache, transaction và API sẽ được thiết kế sau.

---

# 29. Tiêu chí nghiệp vụ nền để không thiết kế sai giao diện

1. `TaskItem` là công tác tiến độ đại diện.
2. `TaskEstimateItem` là công tác dự toán.
3. Một `TaskItem` có thể có nhiều `TaskEstimateItem`.
4. `TaskEstimateItem` không tạo dòng Gantt riêng.
5. `TaskEstimateResource` thuộc một `TaskEstimateItem`.
6. `TaskItemResource` thuộc một `TaskItem`.
7. Không cộng khối lượng khác đơn vị của các `TaskEstimateItem`.
8. Có thể tổng hợp các tài nguyên giống nhau.
9. Tổng hợp dựa trên `resource_id`, không dựa trên tên.
10. Dữ liệu định mức nguồn không bị sửa trực tiếp khi người dùng chỉnh sửa dự án.
11. Dữ liệu chi tiết phải cho phép tính lại tổng.
12. V1 ưu tiên tài nguyên và tiến độ hơn bài toán tiền.
13. Giá và đơn giá phải có đường mở rộng rõ ràng nhưng chưa cần hoàn thiện trong V1.
14. Giao diện phải cho người dùng quan sát được cả hao phí từng công tác dự toán và tài nguyên gộp của công tác tiến độ.

---

# 30. Bước làm việc tiếp theo

Trước khi code phần Dự toán:

1. Dùng tài liệu này làm nền dựng giao diện đồ họa.
2. Rà soát từng màn hình/cửa sổ.
3. Bổ sung hoặc sửa nghiệp vụ phát sinh trong quá trình dựng giao diện.
4. Chốt giao diện.
5. Chốt quy tắc tính toán.
6. Chốt model dữ liệu.
7. Chốt DB/API.
8. Sau đó mới lập trình.

Trạng thái hiện tại:

**Đang ở giai đoạn phân tích nghiệp vụ + dựng giao diện, chưa chuyển sang code.**
