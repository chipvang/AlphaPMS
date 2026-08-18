# GIAO DIỆN BIỂU ĐỒ VẬT LIỆU VÀ MÁY THI CÔNG — PHIÊN BẢN V1

## 1. Trạng thái tài liệu

- Trạng thái: **Đã chốt định hướng giao diện V1 theo thiết kế ban đầu**.
- Ngày chốt: **17/08/2026**.
- Phạm vi: biểu đồ nhu cầu vật liệu và máy thi công theo thời gian.
- Không bao gồm trong tài liệu này: biểu đồ nhân lực, chi phí và theo dõi thực tế chi tiết.

## 2. Mục tiêu

Hai màn hình biểu đồ giúp Ban chỉ huy công trường:

- Nhìn nhu cầu vật liệu và máy theo thời gian.
- Nhận biết thời điểm đạt đỉnh.
- Lọc theo một hoặc nhiều dự án, hạng mục, nhóm hoặc công tác.
- Đối chiếu nhu cầu với giới hạn cung ứng/năng lực hiện có.
- Truy ngược từ một điểm trên biểu đồ về các công tác tiến độ tạo ra nhu cầu.

Dữ liệu biểu đồ được tổng hợp từ hao phí của các công tác định mức, sau đó phân bổ theo thời gian của công tác tiến độ.

## 3. Quan hệ dữ liệu

```text
WorkItem loại Task
    → TaskEstimateItem
        → TaskEstimateResource
            → ResourceAllocation theo thời gian
                → Biểu đồ vật liệu hoặc máy thi công
```

Các công tác định mức không có thời gian độc lập. Hao phí của chúng sử dụng khoảng thời gian và phương pháp phân bổ của công tác tiến độ cha.

## 4. Bố cục chung

Hai màn hình sử dụng cùng một khung:

1. Thanh điều hướng trái và bộ chọn dự án.
2. Tiêu đề màn hình và thanh tác vụ.
3. Vùng bộ lọc.
4. Vùng chỉ số tóm tắt.
5. Biểu đồ chính theo thời gian.
6. Chú giải và bảng chi tiết phía dưới.

Khi mở từ màn hình Quản lý tiến độ, phạm vi thời gian của biểu đồ phải đồng bộ với phạm vi Gantt đang hiển thị.

## 5. Bộ lọc dùng chung

Nút **Lọc** mở cửa sổ có các nhóm điều kiện:

| Nhóm lọc | Trường kỹ thuật đề xuất |
|---|---|
| Dự án | `project_ids` |
| Hạng mục | `category_ids` |
| Nhóm công tác | `task_group_ids` |
| Công tác tiến độ | `task_ids` |
| Khoảng thời gian | `date_from`, `date_to` |
| Cấp thời gian | `time_granularity` |
| Loại tài nguyên | `resource_type` |
| Tài nguyên cụ thể | `resource_ids` |
| Phương án dữ liệu | `plan_version_id` |

`time_granularity` hỗ trợ:

- `Day` — ngày.
- `Week` — tuần.
- `Month` — tháng.

Việc chọn ngày/tuần/tháng nằm trong cửa sổ lọc, không đặt thành nhóm nút riêng trên màn hình chính.

## 6. Các chỉ số tóm tắt

Chỉ hiển thị các chỉ số phục vụ quyết định, tối đa bốn chỉ số:

- Nhu cầu đỉnh trong phạm vi đang xem.
- Thời điểm đạt đỉnh.
- Tổng nhu cầu trong kỳ.
- Mức vượt giới hạn hoặc chênh lệch so với năng lực.

Các chỉ số phải thay đổi theo bộ lọc và không dùng số liệu cố định.

## 7. Màn hình biểu đồ vật liệu

### 7.1. Biểu đồ chính

Thiết kế V1 sử dụng biểu đồ cột theo thời gian:

- Trục X: ngày, tuần hoặc tháng.
- Trục Y: khối lượng vật liệu.
- Mỗi chuỗi là một loại vật liệu được chọn.
- Có thể chồng cột khi các vật liệu cùng đơn vị và cần nhìn tổng nhu cầu.
- Không cộng hoặc chồng trực tiếp vật liệu khác đơn vị.
- Chỉ hiển thị đồng thời số chuỗi hợp lý; danh sách dài được chọn trong bộ lọc.

Thiết kế ban đầu minh họa nhu cầu cát, đá và vật liệu đắp bằng cột; ống cống BTCT có thể biểu diễn bằng chuỗi riêng để đối chiếu xu hướng.

### 7.2. Đường tham chiếu

Cho phép hiển thị các đường:

- Khả năng cung ứng.
- Kế hoạch nhập kho.
- Tồn kho an toàn.

Đây là **đề xuất mở rộng**; V1 có thể chỉ hiển thị nhu cầu kế hoạch nếu chưa có dữ liệu cung ứng/kho.

### 7.3. Tooltip và chọn điểm

Khi trỏ/chọn một cột:

- Tên vật liệu và mã vật liệu.
- Khoảng thời gian.
- Nhu cầu trong kỳ và đơn vị.
- Nhu cầu lũy kế.
- Số công tác tiến độ đóng góp.

Khi chọn điểm, bảng chi tiết phía dưới hiển thị các công tác đóng góp vào nhu cầu đó.

### 7.4. Bảng chi tiết

| Cột | Tên trường dự kiến |
|---|---|
| Dự án | `project_name` |
| WBS | `wbs_code` |
| Công tác tiến độ | `task_name` |
| Mã vật liệu | `resource_code` |
| Tên vật liệu | `resource_name` |
| Đơn vị | `unit` |
| Nhu cầu trong kỳ | `period_quantity` |
| Nhu cầu lũy kế | `cumulative_quantity` |
| Ngày bắt đầu | `start_date` |
| Ngày kết thúc | `finish_date` |

### 7.5. Cảnh báo

- Vượt khả năng cung ứng.
- Nhu cầu tăng đột biến.
- Thiếu đơn giá hoặc thiếu dữ liệu phân bổ.
- Tài nguyên khác đơn vị nhưng bị chọn vào chế độ tổng hợp không hợp lệ.

## 8. Màn hình biểu đồ máy thi công

### 8.1. Biểu đồ chính

Thiết kế V1 sử dụng biểu đồ đường có điểm theo thời gian:

- Trục X: ngày, tuần hoặc tháng.
- Trục Y: số ca máy bình quân hoặc tổng ca máy trong kỳ.
- Mỗi chuỗi là một nhóm máy hoặc một loại máy.
- Điểm đỉnh hiển thị trực tiếp giá trị, ví dụ `9,4 ca/ngày`.
- Có thể bật/tắt từng chuỗi từ chú giải.

Không cộng các máy khác đơn vị sử dụng nếu dữ liệu đơn vị không tương thích. Khi hiển thị nhiều nhóm máy, mỗi nhóm giữ một chuỗi riêng.

### 8.2. Giới hạn năng lực

Cho phép hiển thị đường giới hạn số máy/ca hiện có:

- `available_capacity` — năng lực sẵn có.
- `planned_demand` — nhu cầu kế hoạch.
- Phần vượt giới hạn được cảnh báo rõ trên biểu đồ và trong bảng chi tiết.

Giới hạn năng lực là **đề xuất mở rộng** nếu V1 chưa quản lý danh mục thiết bị sở hữu/thuê.

### 8.3. Tooltip và chọn điểm

Khi trỏ/chọn một điểm:

- Mã và tên máy/nhóm máy.
- Khoảng thời gian.
- Tổng ca máy.
- Ca máy bình quân theo ngày làm việc.
- Năng lực hiện có nếu đã khai báo.
- Chênh lệch thừa/thiếu.
- Số công tác tiến độ đóng góp.

### 8.4. Bảng chi tiết

| Cột | Tên trường dự kiến |
|---|---|
| Dự án | `project_name` |
| WBS | `wbs_code` |
| Công tác tiến độ | `task_name` |
| Mã máy | `resource_code` |
| Tên máy | `resource_name` |
| Đơn vị | `unit` |
| Tổng ca trong kỳ | `period_machine_shifts` |
| Bình quân/ngày | `average_shifts_per_day` |
| Năng lực | `available_capacity` |
| Chênh lệch | `capacity_variance` |

### 8.5. Cảnh báo

- Nhu cầu vượt năng lực.
- Hai công tác yêu cầu cùng một máy trong khoảng thời gian trùng nhau.
- Máy thiếu giá ca máy.
- Công tác có hao phí máy nhưng chưa có lịch tiến độ.

## 9. Phân bổ theo thời gian

V1 hỗ trợ tối thiểu:

1. Chia đều theo ngày làm việc — `Uniform`.
2. Theo khối lượng kế hoạch từng ngày — `DailyQuantity`.

Công thức chia đều:

```text
daily_resource_quantity = total_resource_quantity / working_day_count
```

Khi hiển thị theo tuần hoặc tháng, hệ thống cộng các giá trị ngày thuộc kỳ tương ứng. Việc làm tròn chỉ áp dụng khi hiển thị; giá trị tính toán phải giữ độ chính xác gốc.

Các phương pháp tập trung đầu kỳ, cuối kỳ, đường cong và nhập thủ công là phạm vi mở rộng.

## 10. Đồng bộ với Gantt

- Biểu đồ dùng chung trục thời gian với Gantt.
- Cuộn ngang hoặc đổi khoảng ngày trên Gantt phải cập nhật phạm vi biểu đồ.
- Chọn công tác trên Gantt có thể giới hạn biểu đồ theo công tác đó.
- Chọn một điểm trên biểu đồ có thể làm nổi bật các công tác liên quan trên Gantt — **đề xuất mở rộng**.
- Công tác định mức không tạo hàng thời gian riêng; dữ liệu được phân bổ theo công tác tiến độ cha.

## 11. Trạng thái dữ liệu và lỗi

- Không có dữ liệu trong khoảng chọn: hiển thị trạng thái rỗng và giữ bộ lọc.
- Công tác chưa có ngày: đưa vào danh sách cảnh báo, không tự phân bổ.
- Công tác chưa có định mức/hao phí: cảnh báo thiếu dữ liệu.
- Tài nguyên thiếu đơn vị: không đưa vào phép tổng hợp.
- Dữ liệu nhiều dự án: luôn hiển thị tên dự án trong tooltip và bảng chi tiết.
- Phiên bản kế hoạch đã khóa: chỉ xem, không sửa dữ liệu nguồn từ màn hình biểu đồ.

## 12. Quyền và lưu vết

Các quyền dự kiến:

- `resource_chart.view`.
- `resource_chart.export`.
- `resource_capacity.edit` — khi bổ sung giới hạn năng lực.

Thay đổi bộ lọc không cần audit. Thay đổi dữ liệu năng lực, phương pháp phân bổ hoặc kế hoạch nguồn lực phải được lưu vết.

## 13. Yêu cầu giao diện và hiệu năng

- Cỡ chữ cơ bản 11–12px, phù hợp màn hình dữ liệu dày.
- Biểu đồ là thành phần chính, không để các thẻ chỉ số chiếm quá nhiều chiều cao.
- Màu chuỗi ổn định theo tài nguyên và phải đi kèm tên/chú giải.
- Tooltip không che điểm đang xem.
- Trục phải ghi rõ đơn vị.
- Hỗ trợ màn hình hẹp bằng cách xếp dọc biểu đồ và bảng chi tiết.
- Chỉ tải dữ liệu trong khoảng thời gian và phạm vi bộ lọc.
- Với dữ liệu lớn, backend tổng hợp theo cấp thời gian trước khi trả về.

## 14. Model dữ liệu dự kiến

```text
ResourceAllocation
- id
- project_id
- work_item_id
- task_estimate_resource_id
- allocation_date
- allocated_quantity
- allocation_method
- plan_version_id

ResourceCapacity
- id
- project_id
- resource_id
- effective_from
- effective_to
- available_capacity
- unit

ResourceChartQuery
- project_ids
- category_ids
- task_group_ids
- task_ids
- resource_type
- resource_ids
- date_from
- date_to
- time_granularity
- plan_version_id
```

Model trên là định hướng từ giao diện và phải được chốt lại trong tài liệu thiết kế dữ liệu.

## 15. Tiêu chí nghiệm thu V1

1. Biểu đồ vật liệu hiển thị đúng nhu cầu theo ngày/tuần/tháng và đúng đơn vị.
2. Biểu đồ máy hiển thị đúng tổng ca hoặc ca bình quân theo ngày.
3. Bộ lọc dự án, WBS, công tác, tài nguyên và thời gian tác động đúng đến biểu đồ.
4. Dữ liệu nhiều dự án không bị trộn sai phạm vi.
5. Tooltip và bảng chi tiết truy được về công tác tiến độ nguồn.
6. Khoảng thời gian đồng bộ được với Gantt.
7. Công tác thiếu lịch hoặc thiếu hao phí được cảnh báo và không phân bổ sai.
8. Không cộng các tài nguyên khác đơn vị trong cùng một tổng không hợp lệ.
9. Thay đổi khối lượng/hao phí/tiến độ làm mới dữ liệu biểu đồ.
10. Xuất dữ liệu biểu đồ giữ đúng bộ lọc và đơn vị.

## 16. Nội dung chưa chốt

1. Quy tắc quản lý tồn kho, nhập–xuất và kế hoạch giao vật liệu.
2. Mô hình máy sở hữu, máy thuê và giới hạn năng lực.
3. Quy tắc xử lý nhiều ca/ngày.
4. Cách thể hiện kế hoạch, baseline và thực tế trên cùng biểu đồ.
5. Ngưỡng cảnh báo tăng đột biến.
6. Định dạng xuất Excel/PDF của biểu đồ.

