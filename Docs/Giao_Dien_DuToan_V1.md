# GIAO DIỆN QUẢN LÝ DỰ TOÁN — PHIÊN BẢN V1

## 1. Trạng thái tài liệu

- Trạng thái: **Đã chốt giao diện V1**.
- Ngày chốt: **17/08/2026**.
- Phạm vi: màn hình quản lý dự toán, công tác định mức và hao phí tài nguyên.
- Tài liệu liên quan:
  - `Readme.md`.
  - `Mo_ta_phan_mem_V1.md`.
  - `Giao_Dien_QLTD_V1.md`.

## 2. Mục tiêu nghiệp vụ

Màn hình **Quản lý dự toán** dùng để:

1. Quản lý cây dự án, hạng mục, nhóm công tác và công tác tiến độ.
2. Khai báo từ một đến nhiều công tác định mức cho mỗi công tác tiến độ.
3. Xem và hiệu chỉnh hao phí vật liệu, nhân công và máy thi công của từng công tác định mức.
4. Tổng hợp đơn giá và thành tiền từ công tác định mức lên công tác tiến độ và các cấp cha.
5. Duy trì cùng một cây công tác tiến độ giữa phân hệ tiến độ và phân hệ dự toán.

Màn hình không tạo một cây dự toán độc lập. Công tác tiến độ là điểm liên kết chính giữa tiến độ, dự toán và biểu đồ tài nguyên.

## 3. Thuật ngữ và mô hình nghiệp vụ đã chốt

| Thuật ngữ giao diện | Tên kỹ thuật đề xuất | Ý nghĩa |
|---|---|---|
| Công tác tiến độ | `ScheduleTask` / `WorkItem` | Công tác đại diện trên cây WBS và Gantt |
| Công tác định mức | `TaskEstimateItem` | Công tác dự toán con đóng góp khối lượng, hao phí và chi phí |
| Hao phí định mức | `TaskEstimateResource` | Vật liệu, nhân công hoặc máy thuộc một công tác định mức |
| Đơn vị đại diện | `representative_unit` | Đơn vị dùng để mô tả công tác tiến độ |
| Khối lượng đại diện | `representative_quantity` | Khối lượng đại diện; không phải tổng khối lượng các công tác định mức khác đơn vị |
| Hao phí gốc | `original_consumption_rate` | Hao phí lấy từ bộ định mức nguồn |
| Hao phí điều chỉnh | `adjusted_consumption_rate` | Hao phí sau hiệu chỉnh |
| Hệ số | `coefficient` | Hệ số áp dụng cho công tác hoặc tài nguyên |

Quy tắc cốt lõi:

- Mỗi công tác tiến độ chính thức có tối thiểu một công tác định mức.
- Một công tác tiến độ có một công tác định mức và có nhiều công tác định mức sử dụng chung một cấu trúc dữ liệu.
- Không tồn tại loại dữ liệu riêng mang tên “công tác gộp”. Nhiều công tác định mức dưới một công tác tiến độ chính là trường hợp gộp về nghiệp vụ.
- Công tác định mức không tạo dòng Gantt riêng.
- Không cộng trực tiếp khối lượng các công tác định mức khác đơn vị.
- Giá trị và hao phí có thể tổng hợp từ các công tác định mức lên công tác tiến độ.

## 4. Bố cục tổng thể

Màn hình sử dụng cùng thanh điều hướng trái, tiêu đề, bộ chọn dự án và hệ thống nút với màn hình Quản lý tiến độ.

Phần nội dung dự toán gồm ba khối xếp dọc và liên kết theo trạng thái chọn:

1. **Khối 1 — Công tác tiến độ và giá trị tổng hợp**.
2. **Khối 2 — Công tác định mức của công tác tiến độ đang chọn**.
3. **Khối 3 — Hao phí của công tác định mức đang chọn**.

Luồng chọn dữ liệu:

```text
Chọn công tác tiến độ tại Khối 1
    → Khối 2 hiển thị các công tác định mức của công tác đó
        → Chọn công tác định mức tại Khối 2
            → Khối 3 hiển thị hao phí vật liệu, nhân công và máy
```

Ba khối phải hiển thị đồng thời để người dùng nhìn được quan hệ cha–con và chỉnh sửa liên tục mà không phải mở nhiều cửa sổ.

## 5. Thanh điều hướng, tiêu đề và tác vụ chung

### 5.1. Bộ chọn dự án

- Cho phép chọn một hoặc nhiều dự án.
- Cây tại Khối 1 hiển thị dữ liệu theo thứ tự: Dự án → Hạng mục → Nhóm công tác → Công tác tiến độ.
- Mọi thao tác sửa phải gắn đúng `project_id`.
- Khi nhiều dự án cùng hiển thị, người dùng vẫn có thể chỉnh sửa từng dòng nếu có quyền.

### 5.2. Thanh tác vụ chung

Các tác vụ V1:

- **Thêm công tác**.
- **Tra định mức**.
- **Nhập BOQ**.
- **Liên kết tiến độ**.
- **Lọc**.
- **Lịch sử**.
- **Xuất Excel**.
- **Lưu**.

Nút **Lọc** mở cửa sổ lọc riêng. Không đặt hàng loạt lựa chọn lọc trực tiếp trên thanh công cụ.

## 6. Khối 1 — Công tác tiến độ và giá trị tổng hợp

### 6.1. Vai trò

Khối 1 sử dụng cùng dữ liệu cây với màn hình Quản lý tiến độ. Khác biệt chính là bổ sung các cột số lượng công tác định mức, đơn giá tổng hợp và thành tiền.

Công tác tiến độ là dòng đại diện/tổng quan. Tên công tác có thể được nhập trực tiếp hoặc được tạo/đề xuất từ danh sách công tác định mức.

### 6.2. Cấp cây

| Cấp | `item_type` | Khả năng chứa công tác định mức |
|---|---|---|
| Dự án | `Project` | Không |
| Hạng mục | `Category` | Không |
| Nhóm công tác | `TaskGroup` | Không |
| Công tác tiến độ | `Task` | Có, tối thiểu một khi phát hành |

### 6.3. Các cột

| Cột giao diện | Tên trường dự kiến | Ghi chú |
|---|---|---|
| WBS | `wbs_code` | Mã phân cấp |
| Tác vụ | — | Lên, xuống, trái, phải, thêm, xóa |
| Tên công tác tiến độ | `name` | Hiển thị thụt lề theo cấp |
| Đơn vị ĐD | `representative_unit` | Chỉ có ý nghĩa đối với công tác tiến độ |
| Khối lượng ĐD | `representative_quantity` | Không cộng từ các công tác định mức khác đơn vị |
| Số CTĐM | `estimate_item_count` | Số công tác định mức trực thuộc |
| Đơn giá vật liệu | `material_unit_price` | Giá trị tổng hợp/đại diện |
| Đơn giá nhân công | `labor_unit_price` | Giá trị tổng hợp/đại diện |
| Đơn giá máy TC | `machine_unit_price` | Giá trị tổng hợp/đại diện |
| Thành tiền vật liệu | `material_amount` | Tổng từ các công tác định mức |
| Thành tiền nhân công | `labor_amount` | Tổng từ các công tác định mức |
| Thành tiền máy TC | `machine_amount` | Tổng từ các công tác định mức |
| Trạng thái | `estimate_status` | Chưa gán, thiếu dữ liệu, đủ dữ liệu, đã khóa |

### 6.4. Quy tắc hiển thị

- Tên công tác dùng màu chữ trung tính/đen; không dùng màu chữ để phân biệt loại công tác.
- Cấp cây phân biệt bằng thụt lề, nền dòng và độ đậm vừa phải.
- Dòng được chọn dùng nền nhấn nhẹ.
- Công tác tiến độ hiển thị số công tác định mức, ví dụ `6 CTĐM`.
- Công tác chưa có định mức phải có cảnh báo rõ ràng.
- Cột tiêu đề được cố định khi cuộn dọc.
- Các cột WBS, tác vụ và tên công tác nên được cố định khi cuộn ngang.

### 6.5. Hành vi

- Chọn một công tác tiến độ: tải Khối 2.
- Chọn dòng dự án/hạng mục/nhóm: Khối 2 ở trạng thái không có dữ liệu và giải thích rằng chỉ công tác tiến độ chứa công tác định mức.
- Thêm/xóa/di chuyển cây phải dùng cùng quy tắc và dịch vụ với màn hình Quản lý tiến độ.
- Không cho xóa công tác có dữ liệu con nếu chưa xác nhận tác động.

## 7. Khối 2 — Danh sách công tác định mức

### 7.1. Vai trò

Khối 2 là thành phần chi tiết của công tác tiến độ đang chọn. Mỗi dòng là một `TaskEstimateItem`.

Khối này phải hiển thị rõ tên công tác tiến độ cha và số công tác định mức hiện có.

### 7.2. Tác vụ

- Tra và thêm công tác từ bộ định mức.
- Thêm công tác tạm tính.
- Xóa công tác định mức.
- Sao chép công tác định mức.
- Dịch lên, dịch xuống.
- Lưu danh sách thành mẫu dùng lại — **đề xuất cho giai đoạn sau**.

### 7.3. Các cột

| Nhóm | Cột | Tên trường dự kiến |
|---|---|---|
| Nhận dạng | WBS con/STT | `sort_order` hoặc số hiển thị |
| Nhận dạng | Tác vụ | — |
| Nhận dạng | Mã ĐM | `norm_code` / `norm_code_id` |
| Nhận dạng | Mã Alpha | `alpha_code` |
| Nhận dạng | Tên công tác định mức | `description` |
| Nhận dạng | Đơn vị | `unit` |
| Khối lượng | Tên cấu kiện | `component_name` |
| Khối lượng | Số cấu kiện | `component_count` |
| Khối lượng | Dài | `length` |
| Khối lượng | Rộng | `width` |
| Khối lượng | Cao | `height` |
| Khối lượng | Hệ số | `coefficient` |
| Khối lượng | KL phụ | `additional_quantity` |
| Khối lượng | Khối lượng | `quantity` |
| Đơn giá | Vật liệu | `material_unit_price` |
| Đơn giá | Nhân công | `labor_unit_price` |
| Đơn giá | Máy TC | `machine_unit_price` |
| Thành tiền | Vật liệu | `material_amount` |
| Thành tiền | Nhân công | `labor_amount` |
| Thành tiền | Máy TC | `machine_amount` |

### 7.4. Quy tắc khối lượng

Công thức khối lượng cơ bản dự kiến:

```text
quantity = component_count × length × width × height × coefficient
           + additional_quantity
```

Chỉ sử dụng các thành phần phù hợp với từng công tác; trường không sử dụng có thể để trống. Công thức chi tiết, biểu thức nhiều dòng và quy tắc làm tròn sẽ được chốt trong đặc tả dữ liệu/tính toán riêng.

### 7.5. Hành vi

- Chọn một dòng công tác định mức: tải Khối 3.
- Sửa khối lượng, hệ số hoặc hao phí phải tính lại đơn giá, thành tiền và tổng của Khối 1.
- Khi tra định mức, sao chép hao phí nguồn vào dữ liệu dự án để có thể hiệu chỉnh mà không sửa bộ định mức gốc.
- Công tác tạm tính vẫn có đầy đủ ba nhóm hao phí.

## 8. Khối 3 — Hao phí vật liệu, nhân công và máy

### 8.1. Vai trò

Khối 3 hiển thị tài nguyên của công tác định mức đang chọn ở Khối 2. Ba nhóm sử dụng tab:

1. **Vật liệu** — `Material`.
2. **Nhân công** — `Labor`.
3. **Máy thi công** — `Machine`.

### 8.2. Tác vụ

- Thêm hao phí.
- Dịch lên, dịch xuống.
- Thay thế tài nguyên tương đương.
- Xóa hao phí.
- Sửa hao phí gốc nếu có quyền.
- Sửa hao phí điều chỉnh, hệ số và đơn giá.
- Lưu công tác đã hiệu chỉnh thành định mức nội bộ — **đề xuất cho giai đoạn sau**.

### 8.3. Các cột dùng chung

| Cột | Tên trường dự kiến | Ghi chú |
|---|---|---|
| ID/STT | `sort_order` | Số hiển thị |
| Tác vụ | — | Lên, xuống, thêm, xóa |
| Mã tài nguyên | `resource_code` / `resource_id` | Mã VL, NC hoặc máy |
| Tên tài nguyên | `resource_name` | Tên theo danh mục hoặc tên hiệu chỉnh |
| Đơn vị | `unit` | m³, kg, công, ca... |
| Hao phí gốc | `original_consumption_rate` | Giá trị nguồn |
| Hao phí điều chỉnh | `adjusted_consumption_rate` | Giá trị dùng để tính |
| Hệ số | `coefficient` | Mặc định 1 |
| Đơn giá | `unit_price` | Theo nguồn giá được chọn |
| Thành tiền | `amount` | Giá trị tính toán |

### 8.4. Công thức

Với tài nguyên `r` thuộc công tác định mức `i`:

```text
resource_quantity = estimate_item_quantity
                    × adjusted_consumption_rate
                    × resource_coefficient

resource_amount = resource_quantity × unit_price
```

Tổng hao phí của một công tác tiến độ bằng tổng hao phí cùng tài nguyên từ tất cả công tác định mức trực thuộc.

### 8.5. Trạng thái rỗng và lỗi

- Chưa chọn công tác định mức: hiển thị hướng dẫn chọn dòng ở Khối 2.
- Công tác chưa có hao phí: hiển thị nút **Thêm hao phí**.
- Thiếu đơn giá: cảnh báo tại ô và trạng thái công tác.
- Mã tài nguyên không còn hiệu lực: cảnh báo nguồn dữ liệu, không tự ý thay thế.
- Giá trị số không hợp lệ hoặc âm: không lưu và hiển thị lỗi tại ô.

## 9. Đồng bộ và tính lại dữ liệu

Trình tự cập nhật:

```text
Sửa hao phí ở Khối 3
    → tính lại công tác định mức ở Khối 2
        → tổng hợp lại công tác tiến độ ở Khối 1
            → cập nhật biểu đồ tài nguyên liên quan
```

Nguồn dữ liệu chi tiết là `TaskEstimateItem` và `TaskEstimateResource`. Các giá trị tổng hợp ở công tác tiến độ chỉ là dữ liệu dẫn xuất hoặc cache có cơ chế làm mới rõ ràng.

## 10. Tìm kiếm định mức

- Hỗ trợ tìm theo mã chính xác, mã bắt đầu, tên và nhiều từ khóa.
- Tìm được tiếng Việt có dấu và không dấu.
- API chỉ trả về số kết quả phù hợp, dự kiến 30–50 dòng.
- Chỉ tải chi tiết hao phí khi chọn kết quả.
- Cho phép chọn định mức chuẩn hoặc tạo công tác tạm tính.
- Ghi lại phiên bản, nguồn ban hành, thời gian hiệu lực và phạm vi áp dụng của định mức.

## 11. Quyền và lưu vết

Các quyền dự kiến:

- `estimate.view`: xem dự toán.
- `estimate.edit`: sửa công tác tiến độ và công tác định mức.
- `estimate.resource.edit`: sửa hao phí.
- `estimate.price.edit`: sửa đơn giá.
- `estimate.delete`: xóa dữ liệu dự toán.
- `estimate.export`: xuất dữ liệu.

Phải lưu vết các thay đổi quan trọng: thêm/xóa định mức, sửa khối lượng, sửa hao phí, thay tài nguyên, sửa đơn giá, khóa/mở khóa và phát hành phiên bản.

## 12. Yêu cầu giao diện và hiệu năng

- Cỡ chữ dữ liệu cơ bản: **11px**; tiêu đề có thể lớn hơn nhưng phải tiết chế.
- Màu chữ công tác: trung tính/đen.
- Dùng bảng dữ liệu dày, khoảng cách nhỏ và thống nhất.
- Ba khối cho phép thay đổi chiều cao bằng thanh chia — **đề xuất khi triển khai**.
- Dùng virtual scrolling khi dữ liệu lớn.
- Không tải toàn bộ chi tiết hao phí của mọi công tác cùng lúc.
- Giữ trạng thái chọn và vị trí cuộn khi chuyển tab tài nguyên.
- Cho phép nhập/sửa trực tiếp trong ô, hỗ trợ bàn phím và sao chép/dán theo vùng ở giai đoạn phù hợp.

## 13. Model dữ liệu dự kiến

```text
WorkItem
- id
- project_id
- parent_id
- item_type
- wbs_code
- name
- representative_unit
- representative_quantity
- sort_order
- estimate_status

TaskEstimateItem
- id
- work_item_id
- norm_code_id
- alpha_code
- description
- unit
- component_name
- component_count
- length
- width
- height
- coefficient
- additional_quantity
- quantity
- sort_order

TaskEstimateResource
- id
- task_estimate_item_id
- resource_id
- resource_type
- original_consumption_rate
- adjusted_consumption_rate
- coefficient
- unit_price
- sort_order
```

Model trên là định hướng từ giao diện, chưa thay thế tài liệu thiết kế dữ liệu chính thức.

## 14. Tiêu chí nghiệm thu V1

1. Khối 1 chỉ hiển thị cây dự án, hạng mục, nhóm và công tác tiến độ; không chèn công tác định mức vào cây.
2. Chọn công tác tiến độ hiển thị đúng danh sách 1–n công tác định mức tại Khối 2.
3. Chọn công tác định mức hiển thị đúng ba nhóm hao phí tại Khối 3.
4. Sửa hao phí hoặc khối lượng cập nhật đúng đơn giá và thành tiền các cấp.
5. Không cộng các khối lượng khác đơn vị để tạo khối lượng công tác tiến độ.
6. Công tác định mức không xuất hiện trên Gantt.
7. Công tác chưa có định mức được cảnh báo trước khi phát hành.
8. Các thao tác cây thống nhất với màn hình Quản lý tiến độ.
9. Dữ liệu của nhiều dự án không bị trộn và luôn xác định được `project_id`.
10. Giao diện dùng cỡ chữ nhỏ, tên công tác màu trung tính và hoạt động được khi cuộn ngang/dọc.

## 15. Nội dung chưa chốt

Các nội dung sau cần đặc tả riêng trước khi lập trình hoàn chỉnh:

1. Công thức khối lượng nhiều dòng và biểu thức nâng cao.
2. Quy tắc làm tròn theo từng loại khối lượng, hao phí và tiền.
3. Nguồn giá theo tỉnh, thời điểm và phiên bản.
4. Quy tắc khóa dữ liệu sau khi phát hành.
5. Mẫu công tác và định mức nội bộ.
6. Nhập/xuất BOQ và ánh xạ cột Excel.
7. Cơ chế hoàn tác/khôi phục thao tác trên lưới.

