# GIAO DIỆN QUẢN LÝ TIẾN ĐỘ — PHIÊN BẢN V1

## 1. Mục đích

Màn hình **Quản lý tiến độ** là màn hình đầu tiên của phần mềm, tích hợp đồng thời:

- Quản lý cây công việc/WBS.
- Nhập và hiệu chỉnh kế hoạch tiến độ.
- Hiển thị biểu đồ Gantt.
- Quản lý tiến độ của một hoặc nhiều dự án trên cùng màn hình.
- Liên kết công việc tiến độ với khối lượng dự toán/BOQ.
- Lọc và đối chiếu các hạng mục, nhóm hoặc công tác có cùng tính chất giữa nhiều dự án.

Người dùng có thể chỉnh sửa trực tiếp nhiều dự án đang được chọn hiển thị. Mọi dữ liệu phải luôn gắn với một dự án cụ thể để không trộn dữ liệu giữa các dự án.

## 2. Nguyên tắc ngôn ngữ và đặt tên

- Toàn bộ tiêu đề, nhãn, thông báo, hướng dẫn và đặc tả nghiệp vụ sử dụng tiếng Việt.
- Tên biến, hàm, API, model và trường dữ liệu sử dụng tiếng Anh.
- Tên tiếng Anh cần ngắn gọn, nhất quán và phù hợp thông lệ quốc tế.

Ví dụ:

| Nội dung tiếng Việt | Tên kỹ thuật đề xuất |
|---|---|
| Dự án | `Project` / `project_id` |
| Hạng mục | `WorkItem` / `work_item_id` |
| Nhóm công việc | `TaskGroup` / `task_group_id` |
| Công tác | `Task` / `task_id` |
| Mã WBS | `wbs_code` |
| Ngày bắt đầu | `start_date` |
| Ngày kết thúc | `finish_date` |
| Thời lượng | `duration` |
| Tiến độ hoàn thành | `progress_percent` |
| Tính chất công việc | `work_nature_id` |
| Khối lượng phân bổ | `allocated_quantity` |

## 3. Bố cục tổng thể

Màn hình gồm bốn khu vực chính:

1. Thanh điều hướng bên trái — `Left Sidebar`.
2. Tiêu đề và thanh tác vụ phía trên.
3. Bảng WBS kết hợp biểu đồ Gantt ở trung tâm.
4. Chú giải và vùng chi tiết công việc phía dưới.

## 4. Thanh điều hướng bên trái

### 4.1. Bộ chọn dự án

Thanh trái phải có khu vực **Dự án hiển thị**, cho phép chọn một hoặc nhiều dự án bằng checkbox.

Yêu cầu:

- Có thể hiển thị đồng thời nhiều dự án.
- Có thể bỏ chọn từng dự án mà không ảnh hưởng dữ liệu của dự án đó.
- Hiển thị số lượng dự án đang chọn, ví dụ `3/3`.
- Khi thay đổi danh sách chọn, bảng WBS và Gantt cập nhật đồng thời.
- Người dùng có thể nhập và chỉnh sửa dữ liệu của mọi dự án đang hiển thị nếu có quyền.
- Mọi thao tác sửa phải xác định rõ `project_id` của dòng dữ liệu.

### 4.2. Các phân hệ và chức năng dùng chung

Thanh trái dành chỗ cho các chức năng:

- Quản lý tiến độ.
- Quản lý dự toán.
- Nguồn lực và chi phí.
- Danh mục dự án.
- Danh mục dùng chung.
- Cấu hình.
- Thông tin phần mềm.
- Tài khoản đang đăng nhập và vai trò người dùng.

Trên màn hình này, mục **Quản lý tiến độ** ở trạng thái được chọn.

## 5. Tiêu đề màn hình

Tiêu đề: **Quản lý tiến độ nhiều dự án**.

Thông tin kèm theo:

- Số dự án đang hiển thị.
- Số dòng công việc đang hiển thị sau khi áp dụng bộ lọc.
- Trạng thái cho phép chỉnh sửa theo quyền người dùng.

Các nút cấp màn hình:

- **Lịch sử**: xem các lần thay đổi dữ liệu.
- **Lưu thay đổi**: lưu toàn bộ thay đổi chưa đồng bộ của các dự án đang hiển thị.

Khi lưu nhiều dự án, hệ thống phải kiểm tra quyền và lỗi dữ liệu theo từng dự án. Lỗi của một dự án không được làm mất thay đổi chưa lưu của dự án khác.

## 6. Thanh tác vụ trên bảng

Giữ cố định các nút sau:

1. **Thêm công việc**.
2. **Phân bổ BOQ**.
3. **Quan hệ công việc**.
4. **Lịch làm việc**.
5. **Lọc**.

### 6.1. Thêm công việc

Thêm một dòng mới vào dự án và vị trí WBS đang chọn. Loại phần tử có thể gồm:

- Hạng mục.
- Nhóm công việc.
- Công tác.

### 6.2. Phân bổ BOQ

Mở chức năng liên kết công việc tiến độ với một hoặc nhiều công tác dự toán, đồng thời nhập khối lượng được phân bổ.

### 6.3. Quan hệ công việc

Thiết lập quan hệ trước–sau giữa các công việc, dự kiến hỗ trợ:

- Finish-to-Start — `FS`.
- Start-to-Start — `SS`.
- Finish-to-Finish — `FF`.
- Start-to-Finish — `SF`.
- Thời gian trễ hoặc sớm — `lag` / `lead`.

### 6.4. Lịch làm việc

Thiết lập lịch làm việc, ngày nghỉ, ca làm việc và ngoại lệ lịch. Công việc có thể dùng lịch dự án hoặc lịch riêng.

### 6.5. Lọc

Trên thanh công cụ chỉ hiển thị một nút **Lọc**. Không đặt trực tiếp các lựa chọn lọc riêng lẻ trên thanh công cụ.

Nút Lọc sẽ mở một cửa sổ thiết lập điều kiện ở phiên bản thiết kế tiếp theo. Dự kiến cửa sổ này chứa:

- Dự án.
- Cấp WBS.
- Hạng mục.
- Nhóm công việc.
- Tính chất công việc: san lấp, base, thảm bê tông nhựa, cống và hố ga...
- Khoảng thời gian.
- Trạng thái tiến độ.
- Đường găng.
- Công việc chậm tiến độ.
- Cấp hiển thị lịch: tháng/tuần/ngày hoặc quý/tháng/tuần.

## 7. Cấu trúc cây công việc

Cột **Tên công việc** hiển thị cây theo đúng trình tự:

```text
Dự án
└── Hạng mục
    └── Nhóm công việc
        └── Công tác
```

Ví dụ:

```text
DỰ ÁN THOÁT NƯỚC BẮC AN
└── Hạng mục đường giao thông
    └── Nhóm san lấp nền đường
        └── Đắp đất K95 đoạn KM0–KM0+480
```

Quy tắc:

- Mỗi dự án là một nút gốc trong cây.
- Mã WBS được đánh độc lập trong phạm vi từng dự án.
- Hạng mục, nhóm và công tác phải có cấp cha rõ ràng.
- Cho phép thu gọn/mở rộng từng nút.
- Dòng tổng hợp tự động lấy ngày bắt đầu sớm nhất, ngày kết thúc muộn nhất và tiến độ tổng hợp của các dòng con.
- Các công tác cùng tính chất ở nhiều dự án có thể được lọc để so sánh trực quan.

## 8. Các cột của bảng

Thứ tự cột đề xuất:

1. **WBS** — `wbs_code`.
2. **Tác vụ**.
3. **Tên công việc** — `name`.
4. **Thời lượng** — `duration`.
5. **Bắt đầu** — `start_date`.
6. **Kết thúc** — `finish_date`.

Có thể bổ sung ở giai đoạn hoàn thiện:

- Tiến độ hoàn thành — `progress_percent`.
- Trạng thái — `status`.
- Khối lượng kế hoạch — `planned_quantity`.
- Khối lượng thực hiện — `actual_quantity`.
- Đơn vị — `unit_id`.

### 8.1. Chỉnh sửa trực tiếp trên lưới

Các cột nhập nhanh hỗ trợ inline edit theo nguyên tắc:

- **Tên công việc**: bấm kép vào tên để chuyển thành ô nhập; `Enter` hoặc rời ô để xác nhận, `Escape` để hủy nội dung đang sửa.
- **Thời lượng**: hiển thị số ngày gọn trong ô. Spinner tăng/giảm chỉ hiện khi rê chuột hoặc focus để giữ bảng sạch. Thời lượng tối thiểu là 1 ngày.
- Khi thay đổi thời lượng, ngày bắt đầu được giữ nguyên và ngày kết thúc được tính lại theo ngày lịch: `finish_date = start_date + duration - 1` vì ngày bắt đầu được tính là ngày làm việc thứ nhất.
- Khi thay đổi thời lượng, chiều rộng thanh Gantt của dòng được co giãn theo tỷ lệ thời lượng mới; vị trí bắt đầu giữ nguyên.
- Nhấn `Enter` trong ô thời lượng xác nhận giá trị và kết thúc trạng thái edit ngay, không cần đưa chuột ra ngoài ô.
- **Bắt đầu/Kết thúc**: luôn hiển thị và bắt buộc nhập theo `dd/MM/yy`. Người dùng có thể nhập trực tiếp hoặc bấm nút lịch nhỏ chỉ xuất hiện khi hover/focus.
- Bộ chọn ngày dùng giao diện tiếng Việt do AlphaPMS quản lý, gồm tiêu đề `Tháng ... năm ...`, thứ `T2–CN`, điều hướng tháng trước/sau và nút **Hôm nay**; không phụ thuộc ngôn ngữ lịch native của trình duyệt.
- Ngày không hợp lệ, ngày không tồn tại hoặc sai định dạng không được ghi nhận; hệ thống trả lại giá trị trước và thông báo lỗi.
- Khi thay đổi ngày bắt đầu hoặc ngày kết thúc, hệ thống giữ nguyên đầu mốc còn lại và tính lại thời lượng theo công thức bao gồm cả hai đầu mốc: `duration = finish_date - start_date + 1`.
- Ngày kết thúc không được trước ngày bắt đầu. Thay đổi không hợp lệ bị từ chối và giữ lại giá trị cũ.
- Sau khi tính lại thời lượng, chiều rộng thanh Gantt của dòng được cập nhật theo cùng tỷ lệ ngày; vị trí bắt đầu của thanh Gantt giữ nguyên.
- Không đặt spinner ngày thường trực vì làm tăng nhiễu thị giác và nguy cơ thay đổi nhầm dữ liệu.
- Mỗi lần xác nhận sửa tên/ngày là một bước Undo/Redo; các lần tăng giảm thời lượng liên tiếp được phép gộp thành một bước.

### 8.2. Mật độ hiển thị cột

- Cột **Thời lượng** đủ rộng để caption hiển thị trên một dòng.
- Cột **Tên công việc** có độ rộng mặc định và tối thiểu **300px**. Cạnh phải header có tay nắm kéo để mở rộng hoặc thu lại, nhưng không được nhỏ hơn 300px; giới hạn giao diện V1 là 900px.
- Hai cột dữ liệu **Bắt đầu/Kết thúc** có độ rộng 88px, tăng thêm 4px so với thiết kế ngay trước đó và dùng cùng cỡ font với toàn bộ phần bảng công việc.
- Việc điều chỉnh trên chỉ áp dụng cho vùng bảng bên trái. Vùng lịch và biểu đồ Gantt phía sau giữ nguyên kích thước để được thiết kế riêng ở bước tiếp theo.
- Font caption bảng dùng design token chung `--table-header-font-size`, không khai báo rời theo từng cột; sau này có thể đưa token này vào cấu hình giao diện.

## 9. Cột tác vụ

Cột **Tác vụ** nằm ngay sau cột WBS.

Đối với dòng công tác, hiển thị các nút biểu tượng:

- Dịch lên — `move_up`.
- Dịch xuống — `move_down`.
- Dịch trái/giảm cấp — `outdent`.
- Dịch phải/tăng cấp — `indent`.
- Thêm — `add_child` hoặc `add_after`.
- Xóa — `delete`.

Quy tắc:

- Nút không hợp lệ theo vị trí hoặc cấp cây phải bị vô hiệu hóa.
- Không cho phép kéo công việc sang dự án khác bằng thao tác tăng/giảm cấp.
- Xóa dòng có con phải yêu cầu xác nhận và nêu rõ phạm vi bị xóa.
- Thay đổi thứ tự hoặc cấp WBS phải cập nhật đồng thời mã WBS và Gantt.

### 9.1. Dịch lên và dịch xuống

- Thao tác lên/xuống di chuyển cả dòng và toàn bộ nhánh con của dòng đó.
- Hạng mục chỉ đổi thứ tự với hạng mục trong cùng dự án.
- Nhóm công việc đổi thứ tự với nhóm công việc; khi đi qua ranh giới hạng mục, nhóm nhận hạng mục cha của vị trí đích.
- Công tác đổi thứ tự với công tác; khi đi qua ranh giới nhóm, công tác nhận nhóm cha của vị trí đích.
- Không được di chuyển bất kỳ hạng mục, nhóm hay công tác nào lên thành cấp dự án hoặc sang dự án khác.
- Nếu không tồn tại dòng cùng loại ở hướng cần dịch, nút tương ứng bị vô hiệu hóa.
- Sau khi dịch phải đánh lại WBS; cả việc dịch nhánh và đánh lại WBS là một bước Undo/Redo.

### 9.2. Giảm cấp — dịch trái

- `Công tác → Nhóm công việc`.
- `Nhóm công việc → Hạng mục`.
- Hạng mục không được giảm thành dự án; nút trái bị vô hiệu hóa.
- Khi dòng có nhánh con, toàn bộ nhánh giảm đồng thời một cấp để bảo toàn quan hệ cha–con.
- Dòng sau khi giảm cấp được đặt sau toàn bộ nhánh của cha cũ.

### 9.3. Tăng cấp — dịch phải

- `Hạng mục → Nhóm công việc`.
- `Nhóm công việc → Công tác`.
- Công tác là cấp cuối nên không được tăng tiếp; nút phải bị vô hiệu hóa.
- Dòng được đưa vào làm con của phần tử cùng loại gần nhất đứng ngay trước và cùng cha hiện tại.
- Nếu không có phần tử cùng loại phù hợp phía trước thì không được tăng cấp.
- Toàn bộ nhánh tăng đồng thời một cấp. Nếu nhánh có phần tử sẽ vượt quá cấp Công tác thì thao tác bị vô hiệu hóa để không phá cấu trúc cây.
- Tăng/giảm cấp, đổi `parent_id`, đổi loại phần tử và đánh lại WBS là một bước Undo/Redo duy nhất.

### 9.4. Menu chèn dòng

Khi bấm nút **Thêm công việc** trên thanh công cụ hoặc biểu tượng **＋** tại cột Tác vụ, hệ thống mở một menu nhỏ tại vị trí nút với hai lựa chọn:

- **Chèn phía trên**: tạo một dòng mới cùng cấp ngay trước dòng hiện tại.
- **Chèn phía dưới**: tạo một dòng mới cùng cấp ngay sau toàn bộ nhánh của dòng hiện tại.

Quy tắc:

- Dòng mới mặc định cùng loại và cùng `parent_id` với dòng hiện tại.
- Nếu dòng hiện tại là dự án gốc, hai lựa chọn tương ứng thêm hạng mục đầu tiên hoặc hạng mục cuối cùng của dự án; không tạo dự án mới tại màn hình tiến độ.
- Sau khi chèn, hệ thống chọn dòng mới để người dùng nhập thông tin.
- WBS của các dòng bị ảnh hưởng phải được đánh lại tự động.
- Toàn bộ việc chèn và đánh lại WBS là một bước Undo/Redo.
- Menu đóng khi chọn một lệnh, bấm ra ngoài, cuộn/đổi kích thước cửa sổ hoặc nhấn `Escape`.
- Có thể di chuyển giữa hai lựa chọn bằng phím mũi tên lên/xuống.

## 10. Biểu đồ Gantt

Biểu đồ Gantt nằm bên phải bảng và đồng bộ từng dòng với cây WBS.

### 10.1. Cấu trúc lịch

Lịch mặc định có ba cấp:

1. Tháng.
2. Tuần.
3. Ngày.

Việc đổi cấp lịch không đặt thành một nút riêng trên thanh công cụ mà nằm trong cửa sổ **Lọc**.

Phạm vi và mật độ lịch:

- Xác định ngày bắt đầu nhỏ nhất trong các dự án đang được chọn hiển thị, sau đó lùi thêm đúng ba cột để tạo khoảng hở trước thanh Gantt: `timeline_start = minimum_project_start_date - 3 × day_step`.
- Ngày cuối cùng của lịch là ngày kết thúc lớn nhất của toàn bộ công tác thuộc các dự án đang chọn, kể cả công tác đang bị ẩn do thu gọn cây. Nếu dự án chưa có công tác, dùng ngày kết thúc dự án làm giá trị dự phòng.
- Sau nút **Lọc** có ô spin **Cách nhau: n ngày**, giá trị nguyên tối thiểu 1. Mỗi cột lịch đại diện lần lượt 1, 2, 3... `n` ngày.
- Giá trị mặc định là 1 ngày/cột; giới hạn giao diện V1 là 365 ngày/cột.
- Độ rộng chuẩn của một cột thời gian là **20px**. Giá trị này là design token kỹ thuật dùng chung cho header và thân Gantt.
- Khi đổi số ngày/cột, tháng, tuần, ngày, vị trí và chiều rộng thanh Gantt được dựng lại từ ngày thực tế; không thay đổi dữ liệu công tác.

### 10.2. Hiển thị thanh tiến độ

- Dự án và hạng mục sử dụng thanh tổng hợp.
- Công tác sử dụng thanh kế hoạch có nhãn ngắn.
- Có đường ngày hiện tại.
- Có thể hiển thị Baseline.
- Công việc chậm tiến độ và đường găng phải phân biệt bằng màu và chú giải.
- Màu có thể dùng để biểu thị tính chất công việc khi đang so sánh, ví dụ san lấp, base, thảm bê tông nhựa.

### 10.3. Đồng bộ bảng–Gantt

- Cuộn dọc bảng và Gantt phải đồng bộ.
- Chọn dòng ở bảng phải làm nổi bật thanh Gantt tương ứng.
- Chọn thanh Gantt phải chọn dòng ở bảng.
- Thu gọn cây phải ẩn các dòng Gantt con.
- Lọc phải tác động đồng thời lên cả bảng và Gantt.
- Vùng bảng và vùng Gantt là hai pane riêng nhưng các dòng luôn có cùng chiều cao và thứ tự.
- Chiều cao dòng bảng và dòng Gantt khóa cố định **35px**. Tên, nhãn nhóm và tính chất công tác dài phải cắt ngang/ellipsis, không được làm tăng chiều cao và gây lệch dòng.
- Gantt có thanh cuộn ngang riêng; cuộn ngang lịch không làm dịch chuyển WBS và các cột dữ liệu bên trái.
- Ngày hiện tại được tô nền mờ trên toàn bộ cột thời gian, từ header ngày đến tất cả dòng Gantt; thanh công tác vẫn hiển thị phía trên nền này.
- Khi thay đổi danh sách dự án hoặc ngày bắt đầu nhỏ nhất, thanh cuộn Gantt tự trở về cạnh trái để ngày đầu lịch luôn nhìn thấy.

## 11. Chú giải và dòng đang chọn

Bên dưới bảng/Gantt hiển thị:

- Kế hoạch hiện tại.
- Baseline.
- Chậm tiến độ.
- Đường găng.
- Tên công việc đang chọn.

## 12. Chi tiết công việc

Vùng chi tiết được giữ cố định bên dưới phần chú giải.

Các trường cơ bản:

- Tên công việc — `name`.
- Thời lượng — `duration`.
- Ngày bắt đầu — `start_date`.
- Ngày kết thúc — `finish_date`.

Khi người dùng chọn một dòng khác, vùng chi tiết cập nhật theo dòng đó.

Đối với dòng dự án, hạng mục hoặc nhóm, vùng chi tiết sẽ dùng bộ trường tương ứng với loại phần tử. Chỉ dòng công tác mới hiển thị đầy đủ dữ liệu lập tiến độ và phân bổ BOQ.

## 13. Khối lượng dự toán đã phân bổ

Phần này nằm dưới **Chi tiết công việc**, hiển thị:

- Mã công tác dự toán — `estimate_item_code`.
- Tên công tác dự toán — `estimate_item_name`.
- Khối lượng đã phân bổ — `allocated_quantity`.
- Tổng khối lượng BOQ — `boq_quantity`.
- Đơn vị — `unit_id`.
- Nguồn dự toán hoặc phiên bản dự toán — `estimate_version_id`.
- Tỷ lệ phân bổ — `allocation_percent`.

Một công việc tiến độ có thể liên kết nhiều công tác dự toán. Một công tác dự toán cũng có thể được phân bổ cho nhiều công việc tiến độ, nhưng tổng khối lượng phân bổ không được vượt quá khối lượng BOQ được duyệt nếu không có quyền hoặc quy trình điều chỉnh.

## 14. Hành vi lọc theo tính chất

Khi lọc một tính chất như **San lấp**, hệ thống phải:

- Giữ lại các dự án có công tác phù hợp.
- Hiển thị các nút cha cần thiết để giữ ngữ cảnh cây: dự án, hạng mục và nhóm.
- Chỉ hiển thị công tác phù hợp hoặc làm nổi bật chúng tùy chế độ lọc.
- Đồng bộ kết quả trên Gantt.
- Cho phép chỉnh sửa công tác sau khi lọc.
- Hiển thị số dự án và số dòng kết quả.

## 15. Phân quyền và lưu dữ liệu đa dự án

- Quyền xem/sửa được kiểm tra theo từng dự án.
- Dự án chỉ có quyền xem vẫn được hiển thị nhưng ô nhập và nút tác vụ bị khóa.
- Mỗi thay đổi phải lưu `project_id`, người sửa và thời điểm sửa.
- Nên hỗ trợ lưu nháp phía máy khách và cơ chế chống xung đột khi nhiều người cùng sửa.
- Khi có xung đột, hệ thống phải chỉ rõ dự án và dòng công việc bị xung đột.

## 16. Trạng thái chốt V1

Các nội dung đã thống nhất:

- Quản lý tiến độ và Gantt gộp thành một màn hình.
- Quản lý tiến độ là phân hệ đầu tiên.
- Có Left Sidebar cấp ứng dụng.
- Chọn và chỉnh sửa nhiều dự án đồng thời.
- Cây dữ liệu theo `Dự án → Hạng mục → Nhóm → Công tác`.
- Cột tác vụ nằm ngay sau WBS.
- Giữ năm nút: Thêm công việc, Phân bổ BOQ, Quan hệ công việc, Lịch làm việc và Lọc.
- Cấp lịch nằm trong cửa sổ Lọc, không có nút riêng trên thanh công cụ.
- Lịch Gantt mặc định hiển thị Tháng/Tuần/Ngày.
- Giữ vùng chú giải, công việc đang chọn, chi tiết công việc và khối lượng dự toán đã phân bổ.
- Thiết kế cửa sổ Lọc chi tiết sẽ thực hiện ở bước sau.

## 17. Bản mô phỏng tham chiếu

Nguồn mô phỏng giao diện đã chốt:

`Code/public/alpha-pms-interface.html`
