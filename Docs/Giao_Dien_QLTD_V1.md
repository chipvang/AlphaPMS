# GIAO DIỆN QUẢN LÝ TIẾN ĐỘ — PHIÊN BẢN V1

- **Trạng thái:** Đã chốt giao diện V1.
- **Ngày chốt:** 20/08/2026.
- **Phạm vi hoàn thành:** Bố cục, thao tác cây tiến độ, inline edit, Undo/Redo, lịch và thanh Gantt, quan hệ công việc FS/SS, vùng cuộn kiểu Excel, chú giải và các chế độ hiển thị `TaskDetail`.

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

Màn hình gồm bốn khu vực chính; từ ngày 20/08/2026 thống nhất tên kỹ thuật:

1. Thanh điều hướng bên trái — `LeftSlider`.
2. Tiêu đề và thanh tác vụ phía trên.
3. Bảng công việc bên trái — `TaskGrid` — kết hợp biểu đồ tiến độ bên phải — `GanttTimeline`.
4. Chú giải và vùng chi tiết công việc phía dưới — `TaskDetail`.

## 4. Thanh điều hướng bên trái

### 4.1. Danh sách dự án và phạm vi hiển thị

`LeftSlider` không hiển thị trực tiếp danh sách dự án và không chứa bộ checkbox bung/thu. Mục đầu tiên là **Danh sách dự án**, hoạt động thống nhất như các mục điều hướng khác.

Yêu cầu:

- Bấm **Danh sách dự án** phải mở màn hình **Quản lý dự án**.
- Bấm **Quản lý tiến độ** phải mở màn hình **Quản lý tiến độ nhiều dự án**.
- Trạng thái chọn của `LeftSlider` phải phản ánh đúng màn hình đang hiển thị.
- Việc chọn dự án tham gia phạm vi hiển thị được thực hiện tại màn hình Quản lý dự án hoặc bộ lọc/phạm vi của từng phân hệ, không bung danh sách ngay trong `LeftSlider`.
- Có thể hiển thị đồng thời nhiều dự án.
- Có thể bỏ chọn từng dự án mà không ảnh hưởng dữ liệu của dự án đó.
- Màn hình nghiệp vụ hiển thị số lượng dự án đang chọn, ví dụ `3/3`.
- Khi thay đổi danh sách chọn, bảng WBS và Gantt cập nhật đồng thời.
- Người dùng có thể nhập và chỉnh sửa dữ liệu của mọi dự án đang hiển thị nếu có quyền.
- Mọi thao tác sửa phải xác định rõ `project_id` của dòng dữ liệu.

### 4.2. Các phân hệ và chức năng dùng chung

Thanh trái dành chỗ cho các chức năng:

- Danh sách dự án.
- Quản lý tiến độ.
- Quản lý dự toán.
- Nguồn lực và chi phí.
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

Từ lần tinh chỉnh ngày 20/08/2026, màn hình tiến độ không duy trì Page Header riêng. Tiêu đề/caption cũ và thanh tác vụ được hợp nhất thành một `TopMenu` duy nhất, nằm ngay trên `TaskGrid + GanttTimeline`.

## 6. Thanh tác vụ trên bảng

Giữ cố định các nút sau:

1. **Nhập từ Excel**.
2. **Hoàn tác**.
3. **Làm lại**.
4. **Lọc**.
5. **Lịch làm việc**.
6. **Lịch sử**.
7. **Lưu thay đổi**.

### 6.1. Nhập từ Excel

Mở luồng nhập danh sách tiến độ từ Excel. Chi tiết mapping cột, kiểm tra dữ liệu và preview trước khi nhập sẽ được đặc tả ở bước riêng; nút hiện tại giữ vị trí chính bên trái TopMenu.

Thêm một dòng riêng lẻ vẫn thực hiện bằng hai thao tác trực tiếp trong cột Tác vụ:

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

### 6.6. Bố cục TopMenu chính thức

- Bên trái: **Nhập từ Excel**, **Hoàn tác**, **Làm lại**, **Lọc**.
- Bên phải: **Lịch làm việc**, **Cách nhau: n ngày**, **Lịch sử**, **Lưu thay đổi**.
- Không có Page Header, Caption Bar hoặc toolbar chính thứ hai nằm giữa TopMenu và vùng làm việc.
- Ngay dưới TopMenu là `TaskGrid | GanttTimeline`; tiếp theo là dải legend mỏng và `TaskDetail` hiện có.

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

TaskGrid tổ chức theo thứ tự cố định **Cơ bản | Tiến độ | Dự toán | Nguồn lực** và dùng header hai cấp: dòng trên là tên nhóm, dòng dưới là tên cột.

- **Cơ bản**: STT, Tác vụ, Tên công việc. Nhóm này luôn hiển thị để giữ ngữ cảnh cây WBS.
- **Tiến độ**: Thời lượng, Bắt đầu, Kết thúc, Trước, Tình trạng.
- **Dự toán**: Đơn vị, Khối lượng, Sản lượng/ngày. Sản lượng/ngày được tính từ `quantity / duration`; thiếu dữ liệu thì hiển thị `—`.
- **Nguồn lực**: HSM, SLM, NCLM, NCCH. Đây chỉ là caption rút gọn; tên field/model không thay đổi.

Ngay phía trên TaskGrid/Gantt có dải chọn nhóm mỏng gồm **Tiến độ, Dự toán, Nguồn lực, Tất cả**. Không có nút Cơ bản vì nhóm này luôn hiển thị và không thể tắt. Ba nhóm tùy chọn là các nút bật/tắt đồng thời, không dùng checkbox hoặc icon. Mặc định bật Tiến độ; Dự toán và Nguồn lực tắt, nên TaskGrid hiển thị Cơ bản + Tiến độ. Nút Tất cả chỉ bật đủ ba nhóm tùy chọn, không dùng để tắt toàn bộ; nút active khi cả ba nhóm tùy chọn đang bật và bấm lại vẫn giữ nguyên.

Khi tắt một nhóm, cả header nhóm, header cột và các ô dữ liệu tương ứng được loại khỏi lưới; các nhóm còn lại tự dồn liền nhau. Nếu tổng chiều rộng TaskGrid vượt khung nhìn thì TaskGrid được cuộn ngang riêng, còn Gantt giữ tối thiểu 320px và nhận toàn bộ phần chiều rộng còn lại. Việc bật/tắt nhóm không thay đổi dữ liệu và không tác động các chức năng Gantt, quan hệ công việc, Auto Schedule, Undo/Redo, WBS hoặc Outline.

Các trường Dự toán/Nguồn lực mới chỉ là thuộc tính tùy chọn của model giao diện V1, chưa thay đổi schema lưu trữ. Không tạo dữ liệu giả; mọi giá trị chưa được khai báo hiển thị `—`.

### 8.1. Chỉnh sửa trực tiếp trên lưới

Các cột nhập nhanh hỗ trợ inline edit theo nguyên tắc:

- **Tên công việc**: bấm kép vào tên để chuyển thành ô nhập; `Enter` hoặc rời ô để xác nhận, `Escape` để hủy nội dung đang sửa.
- **Thời lượng**: hiển thị số ngày gọn trong ô. Spinner tăng/giảm chỉ hiện khi rê chuột hoặc focus để giữ bảng sạch. Thời lượng tối thiểu là 1 ngày.
- Khi thay đổi thời lượng, ngày bắt đầu được giữ nguyên và ngày kết thúc được tính lại theo ngày lịch: `finish_date = start_date + duration - 1` vì ngày bắt đầu được tính là ngày làm việc thứ nhất.
- Khi thay đổi thời lượng, chiều rộng thanh Gantt của dòng được co giãn theo tỷ lệ thời lượng mới; vị trí bắt đầu giữ nguyên.
- Nhấn `Enter` trong ô thời lượng xác nhận giá trị và kết thúc trạng thái edit ngay, không cần đưa chuột ra ngoài ô.
- **Bắt đầu/Kết thúc**: luôn hiển thị và bắt buộc nhập theo `dd/MM/yy`. Ô nhập chia thành ba phần ngày/tháng/năm; nhập đủ hai số ngày tự chuyển sang tháng, đủ hai số tháng tự chuyển sang năm. Dấu `/` hoặc `.` chuyển ngay sang phần kế tiếp, nên có thể gõ `7/9` rồi `Enter`. Không cần quét toàn bộ text; mũi tên trái/phải và Backspace chuyển giữa các phần, `Enter` xác nhận, `Escape` hủy. Khi thiếu năm, giữ năm cũ hoặc dùng năm hiện tại nếu chưa có giá trị.
- Nút lịch tiếng Việt chỉ hiện khi hover/focus, dùng icon 16px đặt sát mép phải và không che chữ ngày; cột Bắt đầu/Kết thúc rộng 92px.
- Ô Bắt đầu/Kết thúc của Project, WorkPackage, Group và Task đều căn trái với cùng padding, line-height và định dạng `dd/MM/yy`, nên các ngày thẳng cột dọc.
- Bộ chọn ngày dùng giao diện tiếng Việt do AlphaPMS quản lý, gồm tiêu đề `Tháng ... năm ...`, thứ `T2–CN`, điều hướng tháng trước/sau và nút **Hôm nay**; không phụ thuộc ngôn ngữ lịch native của trình duyệt.
- Ngày không hợp lệ, ngày không tồn tại hoặc sai định dạng không được ghi nhận; hệ thống trả lại giá trị trước và thông báo lỗi.
- Khi sửa **Bắt đầu**: nếu ngày mới không sau Kết thúc cũ thì giữ Kết thúc và tính lại `duration = finish_date - start_date + 1`; nếu ngày mới sau Kết thúc cũ thì giữ thời lượng cũ và dịch Kết thúc theo `finish_date = start_date + duration - 1`.
- Khi sửa **Kết thúc**, giữ Bắt đầu và tính lại thời lượng; Kết thúc trước Bắt đầu bị từ chối và giữ lại giá trị cũ.
- Sau khi tính lại thời lượng, chiều rộng thanh Gantt của dòng được cập nhật theo cùng tỷ lệ ngày; vị trí bắt đầu của thanh Gantt giữ nguyên.
- Không đặt spinner ngày thường trực vì làm tăng nhiễu thị giác và nguy cơ thay đổi nhầm dữ liệu.
- Mỗi lần xác nhận sửa tên/ngày là một bước Undo/Redo; các lần tăng giảm thời lượng liên tiếp được phép gộp thành một bước.

### 8.2. Mật độ hiển thị cột

- Độ rộng chính thức: Cơ bản = STT 50px, Tác vụ 116px, Tên công việc 415px; tổng 581px.
- Tiến độ = Thời lượng 74px, Bắt đầu 92px, Kết thúc 92px, Trước 50px, Tình trạng 115px; tổng 423px.
- Cột Tên công việc có `min-width: 350px`, vẫn được phép resize rộng hơn. Ô nhập Thời lượng rộng `30px`, giữ suffix “ngày” trên cùng một dòng.
- Dự toán = Đơn vị 60px, Khối lượng 86px, Sản lượng/ngày 100px; tổng 246px.
- Nguồn lực = HSM 50px, SLM 50px, NCLM 60px, NCCH 60px; tổng 220px.
- Khi bật Tất cả, TaskGrid rộng 1.393px tại độ rộng mặc định của cột Tên công việc. Không tự co giãn các cột theo nội dung.
- Cột **Tên công việc** có độ rộng mặc định và tối thiểu **415px**. Cạnh phải header có tay nắm kéo; giới hạn giao diện V1 hiện tại là 915px.
- Header nhóm, header cột và body dùng chung một định nghĩa cột động. Khi ẩn nhóm, toàn bộ phần tương ứng bị loại khỏi lưới và nhóm phía sau dồn sát sang trái.
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

### 9.4. Chèn dòng trực tiếp

Không sử dụng menu trung gian. Cột **Tác vụ** có hai nút riêng:

- **Chèn phía trên** — `InsertAbove`: tạo một dòng mới cùng cấp ngay trước dòng hiện tại.
- **Chèn phía dưới** — `InsertBelow`: tạo một dòng mới cùng cấp ngay sau toàn bộ nhánh của dòng hiện tại.

Quy tắc:

- Dòng mới mặc định cùng loại và cùng `parent_id` với dòng hiện tại.
- Nếu dòng hiện tại là dự án gốc, hai lựa chọn tương ứng thêm hạng mục đầu tiên hoặc hạng mục cuối cùng của dự án; không tạo dự án mới tại màn hình tiến độ.
- Sau khi chèn, hệ thống chọn dòng mới để người dùng nhập thông tin.
- WBS và STT của các dòng bị ảnh hưởng phải được tính lại tự động.
- Một lần bấm thực hiện ngay thao tác; sau khi chèn, dòng mới được chọn và ô tên tự chuyển sang trạng thái nhập liệu.
- Toàn bộ việc chèn và tính lại dữ liệu dẫn xuất là một bước Undo/Redo.

### 9.5. ID, WBS và STT

- `id` là khóa nội bộ bất biến, không hiển thị và không thay đổi khi sắp xếp cây.
- WBS là dữ liệu cấu trúc/dẫn xuất, không phải khóa chính và vẫn được giữ nội bộ để quản lý cây.
- STT hiển thị theo quy tắc: Dự án `A, B, C...`; Hạng mục `I, II, III...`; Nhóm `I.1, I.2...`; Công tác `1, 2, 3...` trong nhóm.
- STT tự tính lại sau thêm, xóa, dịch chuyển, tăng/giảm cấp hoặc đổi quan hệ cha–con.

### 9.6. Outline 1–4

Header cột **Tên công việc** có bốn nút Outline nhỏ:

- `1`: chỉ Dự án.
- `2`: Dự án và Hạng mục.
- `3`: Dự án, Hạng mục và Nhóm.
- `4`: toàn bộ đến Công tác.

Outline chỉ đổi trạng thái hiển thị, không sửa cấu trúc dữ liệu. `TaskGrid` và `GanttTimeline` phải ẩn/hiện cùng lúc và giữ đúng thứ tự, chiều cao dòng.

Nhóm bốn nút đặt ở góc trái phía dưới của header cột. Caption **Tên công việc** vẫn căn giữa theo toàn bộ chiều rộng cột và không bị nhóm nút Outline đẩy lệch.

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
- Ngày cuối cùng của lịch bằng ngày kết thúc lớn nhất của toàn bộ công tác thuộc các dự án đang chọn cộng `7 × day_step`, kể cả công tác đang bị ẩn do thu gọn cây hoặc Outline. Nếu dự án chưa có công tác, dùng ngày kết thúc dự án làm giá trị dự phòng rồi vẫn cộng khoảng đệm. Mục tiêu là luôn có đúng bảy cột trống sau công tác cuối.
- Sau nút **Lọc** có ô spin **Cách nhau: n ngày**, giá trị nguyên tối thiểu 1. Mỗi cột lịch đại diện lần lượt 1, 2, 3... `n` ngày.
- Giá trị mặc định là 1 ngày/cột; giới hạn giao diện V1 là 365 ngày/cột.
- Độ rộng chuẩn của một cột thời gian là **20px**. Giá trị này là design token kỹ thuật dùng chung cho header và thân Gantt.
- Khi đổi số ngày/cột, tháng, tuần, ngày, vị trí và chiều rộng thanh Gantt được dựng lại từ ngày thực tế; không thay đổi dữ liệu công tác.

### 10.2. Hiển thị thanh tiến độ

- Dự án dùng `ProBar`, Hạng mục dùng `WPBar`, Nhóm dùng `WGBar`, Công tác dùng `TaskBar`.
- Ngày bắt đầu/kết thúc của Summary Bar lấy từ ngày nhỏ nhất/lớn nhất của toàn bộ Công tác hậu duệ có ngày hợp lệ. Không lưu riêng nếu có thể tính lại.
- Summary không có Công tác con hợp lệ thì không vẽ thanh.
- `ProBar`, `WPBar`, `WGBar` dùng thân ngang xám, marker tam giác hướng xuống ở hai đầu; kích thước tổng lần lượt 14px, 13px và 12px, thân ngang lần lượt khoảng 10px, 9px và 8px.
- Màu nền, màu viền và marker của Summary Bar phải giống nhau. Không dùng màu viền riêng tương phản với nền.
- Mỗi Summary Bar có `SummaryProgressLine` cao 2px, nằm giữa thân thanh và dài theo `progress_percent` hiện có, giới hạn an toàn trong 0–100%. Màu Progress là màu xám đậm hơn màu nền Summary, không dùng màu cam.
- Hai nhãn `StartSideLabel` và `EndSideLabel` nằm phía trên hai đầu thanh, định dạng `dd/MM`, cỡ chữ 10px và không làm tăng chiều cao dòng 35px.
- Công tác giữ thanh chữ nhật hiện tại và khả năng gán màu theo tính chất công tác về sau.
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
- Header của `TaskGrid` và `GanttTimeline` luôn khóa ở phía trên, không cuộn theo các dòng dữ liệu.
- Toàn bộ khung ứng dụng, `LeftSlider`, TopMenu, thanh tác vụ, chú giải và `TaskDetail` không cuộn theo danh sách công tác.
- Khi số dòng vượt chiều cao vùng làm việc, chỉ vùng chung `TaskGrid + GanttTimeline` cuộn dọc. Hai pane sử dụng cùng một giá trị cuộn để giữ dòng thẳng hàng; thanh VScroll duy nhất nằm ngoài cùng bên phải của `GanttTimeline`.
- Gantt vẫn có thanh cuộn ngang riêng; cuộn ngang không làm dịch chuyển TaskGrid.
- Bố cục vùng làm việc vận hành tương tự Excel: `LeftSlider`, TopMenu, thanh tác vụ, chú giải và `TaskDetail` luôn neo cố định; chỉ vùng dữ liệu chung `TaskGrid + GanttTimeline` được cuộn dọc.
- Caption của `GanttTimeline` gồm đủ ba cấp Tháng/Tuần/Ngày khóa ở đầu vùng làm việc giống header của `TaskGrid`. Hai header là khối cố định nằm ngoài vùng cuộn dọc, không chỉ dùng hiệu ứng `sticky` bên trong vùng cuộn.
- Thanh VScroll duy nhất đặt tại mép phải của `GanttTimeline` và điều khiển đồng thời các dòng của TaskGrid và GanttTimeline.
- Phạm vi VScroll chỉ bắt đầu dưới header TaskGrid và caption Tháng/Tuần/Ngày, kết thúc phía trên thanh HScroll. Track VScroll không bao trùm các vùng header cố định.
- Thanh HScroll của Gantt được tách khỏi nội dung và neo cố định ở đáy vùng Gantt, luôn hiển thị khi vùng thời gian rộng hơn khung nhìn. Thanh này cuộn đồng thời caption Timeline và thân biểu đồ nhưng không làm dịch chuyển TaskGrid.
- Không phân trang công tác trong màn hình tiến độ vì phân trang làm mất khả năng quan sát tổng thể Gantt.

### 10.4. Quan hệ công việc

#### 10.4.1. Model và nguồn dữ liệu

Quan hệ trước–sau dùng model logic `TaskDependency`:

```ts
type DependencyType = "FS" | "SS" | "FF" | "SF";

type TaskDependency = {
  id: string;
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: DependencyType;
  lag: number;
};
```

- Khóa liên kết bắt buộc là `task_id`; không lưu STT, WBS, chỉ số dòng hoặc thứ tự hiển thị làm khóa.
- Kéo trực tiếp TaskBar tạo `FS 0`; Dependency Editor cho sửa đủ `FS`, `SS`, `FF`, `SF`.
- TaskGrid, Dependency Editor và Gantt Dependency Layer dùng chung một danh sách `TaskDependency`.
- Dữ liệu công tác và dependency nằm trong cùng `ScheduleState`, sử dụng chung cơ chế Undo/Redo.
- Persistence tiến độ chính thức dùng `Project`, `WorkItem` và `TaskDependency` qua ASP.NET Core/EF Core. Frontend tải và lưu theo từng dự án bằng `GET/PUT /api/projects/{projectId}/schedule`; một lần bấm **Lưu thay đổi** là application boundary và mỗi dự án được lưu trong một transaction riêng.
- `WorkItem` lưu dữ liệu nguồn: ID, ProjectId, ParentId, ItemType, SortOrder, Name, Unit, Quantity, Duration, StartDate, FinishDate, ProgressPercent, MachineShiftFactor, Nclm, PermanentLabor và timestamp.
- `TaskDependency` lưu ID thật của predecessor/successor, loại FS/SS/FF/SF và LagDays. Không lưu chuỗi rút gọn theo STT.
- STT, WBS hiển thị, ngày/thời lượng summary, trạng thái dẫn xuất, sản lượng/ngày, hình học Gantt và connector đều được tính lại từ dữ liệu tải về; không lưu như dữ liệu nguồn.
- SLM và các cấu trúc Dự toán/Nguồn lực chi tiết chưa được triển khai trong iteration persistence này. SQLite là database development; PostgreSQL là provider mục tiêu production.

#### 10.4.2. Cột Trước — Predecessors

- Cột **Trước** nằm ngay sau **Kết thúc**, rộng 50px và không làm tăng chiều cao dòng.
- Không có quan hệ hiển thị `—`.
- Hiển thị rút gọn theo STT hiện tại của predecessor: `1FS`, `2FS+2`, `4SS-1`, nhiều quan hệ phân cách bằng dấu `;`.
- `lag = 0` không hiển thị `+0`; lag dương có dấu `+`, lead âm giữ dấu `-`.
- Nội dung dài dùng ellipsis; hover hiển thị STT, tên công tác, loại quan hệ và lag đầy đủ.
- Sau khi đổi thứ tự cây, text STT được tính lại nhưng `predecessorTaskId` không thay đổi.
- Double-click cell của TaskItem mở Dependency Editor; dòng Summary chỉ hiển thị `—` và không cho sửa.

#### 10.4.3. Dependency Editor

- Popup nhỏ, modal, không dùng cửa sổ lớn và không dùng alert native.
- Hiển thị công tác sau, ô tìm predecessor theo STT/tên, danh sách quan hệ gồm Công tác trước, Quan hệ, Lag và nút xóa.
- Selector chỉ liệt kê TaskItem cùng dự án, không liệt kê chính task hiện tại hoặc Summary.
- Quan hệ mới mặc định `FS`, `lag = 0`; cho chọn `FS`, `SS`, `FF`, `SF`, nhập lag dương hoặc lead âm.
- **OK** kiểm tra toàn bộ và lưu thành một bước Undo/Redo; **Hủy** đóng popup và không thay đổi dữ liệu.

#### 10.4.4. Kéo trực tiếp TaskBar trên Gantt

- Không sử dụng `DependencyStartAnchor` hoặc `DependencyFinishAnchor`; TaskBar luôn là hình chữ nhật sạch, không có vòng tròn ở hai đầu.
- Nhấn và kéo trực tiếp thân `TaskBar A` rồi thả vào `TaskBar B` tạo ngay quan hệ `A → B`, loại `FS`, `lag = 0`; không mở hộp thoại xác nhận.
- Chuyển động dưới 5px được coi là click chọn công tác. Chỉ khi vượt ngưỡng mới bắt đầu dependency drag; click không thay đổi ngày.
- Trong lúc kéo, preview xuất phát từ cạnh phải TaskBar nguồn; nguồn active nhẹ và target hợp lệ có outline nhẹ. Thả vùng trống hoặc nhấn `Escape` thì hủy và không tạo history entry.
- Trong V1, kéo thân TaskBar chỉ có nghĩa tạo dependency; không dùng để đổi ngày hoặc resize Duration.

#### 10.4.5. Gantt Dependency Layer

- Connector được vẽ trong một SVG overlay duy nhất phủ thân Gantt, dùng đường gấp khúc ngang–đứng–ngang và arrow head ở target.
- Layer nằm trên nền grid nhưng dưới TaskBar, không tạo scrollbar riêng và dùng cùng hệ tọa độ nội dung Gantt nên đồng bộ với cuộn ngang/dọc, Outline, collapse, resize và `day_step`.
- Chỉ vẽ connector khi cả predecessor và successor đang visible. Dependency vẫn tồn tại khi endpoint bị ẩn.
- Click connector đặt `selectedDependencyId`; nhấn `Delete` xóa dependency, không xóa Task. Khi focus input/select/textarea, phím Delete không bị chiếm.
- Connector có hit-path trong suốt 10px để dễ thao tác. Double-click connector mở cùng Dependency Editor đang dùng bởi cell **Trước**.

#### 10.4.6. Validation và Undo/Redo

Trước khi tạo hoặc lưu phải kiểm tra:

- Không liên kết một task với chính nó.
- Không tạo trùng cặp predecessor–successor; đổi FS/SS thực hiện trên quan hệ hiện có.
- Không tạo vòng phụ thuộc; phát hiện cycle trong helper nghiệp vụ độc lập với component UI.
- Không liên kết Summary.
- V1 không cho dependency khác dự án.

Tạo bằng kéo, thêm/sửa/xóa bằng editor, đổi FS/SS/FF/SF, đổi lag và xóa connector đều là một bước Undo/Redo hoàn chỉnh. Việc tạo/sửa/xóa dependency, dịch toàn bộ successor, cập nhật Summary và connector là một commit duy nhất.

#### 10.4.7. Auto Schedule theo dependency

- Logic đặt trong helper nghiệp vụ `lib/schedule/dependencies.ts`, độc lập với component React.
- Direct edit của người dùng là authoritative: sau khi đổi ngày, chỉ **incoming dependency** của Task được recalibrate trong cùng một bước Undo/Redo, trước khi Auto Schedule lan xuống successor. Sửa Start recalibrate FS/SS; FF/SF chỉ recalibrate khi Finish cũng đổi do dịch toàn bộ Task. Sửa Finish recalibrate FF/SF. Auto Schedule không recalibrate quan hệ khi tự dịch successor.
- Lag/lead là chênh lệch ngày lịch: FS = `successor.start - (predecessor.finish + 1)`; SS = `successor.start - predecessor.start`; FF = `successor.finish - predecessor.finish`; SF = `successor.finish - predecessor.start`. Chênh lệch dương là lag, âm là lead. Với Finish predecessor `04/09`: FS-2 → `03/09`, FS-1 → `04/09`, FS0 → `05/09`, FS+2 → `07/09`.
- Mọi dependency được quy đổi thành constraint lên ngày bắt đầu của successor: FS = `predecessor.finish + 1 + lag`; SS = `predecessor.start + lag`; FF/SF lấy mốc finish tương ứng rồi trừ `duration - 1` để ra start.
- Nếu có nhiều predecessor, successor lấy ngày bắt đầu lớn nhất trong toàn bộ constraint. Không lấy ngày nhập tay cũ làm giới hạn.
- Duration của successor được giữ nguyên; `finish = start + duration - 1`.
- Thay đổi ngày predecessor, tạo/sửa/xóa quan hệ sẽ lan truyền theo thứ tự topo xuống toàn bộ successor trong DAG.
- Khi xóa link mà successor không còn predecessor, giữ nguyên Start/Finish hiện tại; nếu còn predecessor khác thì tính lại theo các constraint còn lại.
- Summary không nhận dependency trực tiếp; Start/Finish tiếp tục dẫn xuất bằng min/max từ TaskItem hậu duệ.

#### 10.4.8. Màu và nền mặc định

- TaskBar mới và TaskBar không có màu do người dùng gán dùng thống nhất `--gantt-task-default: #4F81BD`, border `#3B6FA5`; không random và không tự đổi theo dự án, nhóm hoặc tính chất.
- ProBar, WPBar, WGBar giữ tông xám trung tính đã chốt.
- Nền mặc định của mọi dòng Project, Hạng mục, Nhóm và Task trong TaskGrid và GanttTimeline là trắng. Phân cấp thể hiện bằng STT, indent, font, expand/collapse và Summary Bar.
- Hover/selected chỉ dùng chỉ báo nhẹ, không lưu màu nền theo `ItemType`; cột ngày hiện tại vẫn giữ nền đánh dấu riêng.
- Đường kẻ dọc/ngang, border header và splitter giữa TaskGrid/GanttTimeline dùng chung token xám trung tính của form/control: `--line: #D9D9D9`, `--line-strong: #BFBFBF`; không dùng đường lưới mang sắc xanh. Nền body hai vùng giữ `#FFFFFF`.
- Chân khối header dùng một border xám đậm 2px chạy liền mạch qua TaskGrid và toàn bộ caption ba dòng Tháng/Tuần/Ngày, phân cách rõ header cố định với vùng dữ liệu bên dưới mà không làm lệch hai pane.

## 11. Chú giải và dòng đang chọn

Bên dưới bảng/Gantt hiển thị:

- Kế hoạch hiện tại.
- Baseline.
- Chậm tiến độ.
- Đường găng.
- Tên công việc đang chọn.

## 12. Chi tiết công việc

Vùng chi tiết được giữ cố định bên dưới phần chú giải.

`TaskDetail` có ba chế độ hiển thị:

- **Ghim dưới** — `docked`: hiển thị đầy đủ và khóa ở đáy màn hình tiến độ.
- **Thu nhỏ** — `collapsed`: chỉ giữ thanh tiêu đề, tên công việc đang chọn và nút mở rộng.
- **Ẩn** — `hidden`: giải phóng toàn bộ chiều cao cho TaskGrid/GanttTimeline; người dùng có thể bật lại từ thanh chú giải.

Việc đổi chế độ `TaskDetail` không làm thay đổi dữ liệu, lựa chọn dòng hoặc trạng thái Undo/Redo.

### 12.1. Nội dung chi tiết

Các trường cơ bản:

- Tên công việc — `name`.
- Thời lượng — `duration`.
- Ngày bắt đầu — `start_date`.
- Ngày kết thúc — `finish_date`.

Khi người dùng chọn một dòng khác, vùng chi tiết cập nhật theo dòng đó.

Đối với dòng dự án, hạng mục hoặc nhóm, vùng chi tiết sẽ dùng bộ trường tương ứng với loại phần tử. Chỉ dòng công tác mới hiển thị đầy đủ dữ liệu lập tiến độ và phân bổ BOQ.

### 12.2. Quy tắc cỡ chữ tối thiểu

- Font của caption, label và nội dung grid trong tất cả vùng giao diện không được nhỏ hơn **10px**.
- Các đối tượng giao diện tạo mới phải dùng design token chung, mặc định `--ui-min-font-size: 10px`, thay vì hard-code 8px hoặc 9px.
- Có thể dùng cỡ lớn hơn theo cấp nhấn mạnh; 10px chỉ là giới hạn tối thiểu.

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
- Có `LeftSlider` cấp ứng dụng.
- Chọn và chỉnh sửa nhiều dự án đồng thời.
- Cây dữ liệu theo `Dự án → Hạng mục → Nhóm → Công tác`.
- Cột tác vụ nằm ngay sau WBS.
- TopMenu giữ các nút: Nhập từ Excel, Hoàn tác, Làm lại, Lọc, Lịch làm việc, Lịch sử và Lưu thay đổi; Lọc nằm ngay sau Làm lại.
- Cấp lịch nằm trong cửa sổ Lọc, không có nút riêng trên thanh công cụ.
- Lịch Gantt mặc định hiển thị Tháng/Tuần/Ngày.
- Giữ vùng chú giải, công việc đang chọn, chi tiết công việc và khối lượng dự toán đã phân bổ.
- Thiết kế cửa sổ Lọc chi tiết sẽ thực hiện ở bước sau.
- TaskGrid hiển thị STT dẫn xuất, có Outline 1–4 và hai nút chèn trực tiếp.
- GanttTimeline có ProBar/WPBar/WGBar dẫn xuất từ Công tác con và bảy cột trống sau ngày kết thúc lớn nhất.

## 17. Bản mô phỏng tham chiếu

Nguồn mô phỏng giao diện đã chốt:

`Code/public/alpha-pms-interface.html`

## Quy tắc cây WBS linh hoạt

- Nhóm là cấp tùy chọn. Công tác có thể trực tiếp dưới Hạng mục hoặc nằm dưới Nhóm.
- Hạng mục và Nhóm là node tổng hợp (summary); chỉ Công tác (`ItemType = Task`) là công tác thi công thực và được phép gán định mức, hao phí trong các module tương lai.
- Nút **+** tại Hạng mục hoặc Nhóm tạo trực tiếp một Công tác con ở cuối danh sách con của node đó. Dòng Công tác không hiển thị nút này.
- **Chèn phía trên** và **Chèn phía dưới** tiếp tục tạo item cùng cấp, không có ý nghĩa tạo con.
- Khi giảm cấp một Công tác từ Nhóm ra Hạng mục, `ItemType` vẫn là `Task`; Gantt và capability luôn phân loại theo `ItemType`, không theo độ sâu của cây.

## Bộ action UI chính thức của cột Tác vụ

- Mỗi action button có kích thước render cố định `16px × 16px`; khoảng cách giữa hai button liền kề là `1px`.
- Icon mono màu trung tính, kích thước thị giác khoảng `10–12px`; không border, không shadow và nền mặc định trong suốt.
- `▲` là **Chèn lên trên**, `▼` là **Chèn xuống dưới** và icon thùng rác là **Xóa**. Hai action **Đẩy vào/Đẩy ra** đã được loại bỏ; reorder/reparent dùng drag từ ô STT.
- Dòng Dự án chỉ hiển thị `+` để thêm Hạng mục. Hạng mục/Nhóm hiển thị `+`, Chèn trên, Chèn dưới và Xóa. Công tác không có `+` và không dùng placeholder cho action bị thiếu.

## Kéo thả sắp xếp cây WBS

- Không dùng grip trong cột Tên công việc. Toàn bộ ô STT của Hạng mục, Nhóm và Công tác là drag handle; Project không kéo trong iteration này.
- Drag dùng chuột trái và Pointer Events, giữ pointer capture trong toàn thao tác; chỉ bắt đầu sau khi con trỏ di chuyển tối thiểu `4px`.
- Vị trí thả được biểu diễn bằng duy nhất một insertion line giữa các dòng. Chỉ slot hợp lệ theo ItemType mới được highlight; vị trí không hợp lệ hoặc phím `Escape` sẽ hủy thao tác.
- Hạng mục và Nhóm di chuyển cùng toàn bộ subtree. Công tác có thể chuyển giữa các Nhóm hoặc giữa Nhóm và Hạng mục theo hierarchy đã chốt.
- Drag không đổi `ItemType` hay dữ liệu nghiệp vụ; thao tác chỉ cập nhật `ParentId`, chuẩn hóa `SortOrder` trong sibling list và giữ nguyên ID.
- Một lần drag-drop hợp lệ là một action duy nhất trong shared Undo/Redo. Save/Reload dùng API WBS hiện tại để giữ nguyên hierarchy và thứ tự mới.

## Context menu của Công tác

- Right-click chỉ trên dòng Công tác mở menu theo thứ tự: **Xem / sửa thông tin công tác**, **Chuyển công tác thành Nhóm**, separator, **Xóa công tác**.
- Công tác trực tiếp dưới Hạng mục có thể chuyển thành Nhóm ở mọi vị trí đầu, giữa hoặc cuối. Các Công tác sibling liên tiếp ngay phía sau sẽ tự trở thành con của Nhóm mới cho đến trước Nhóm kế tiếp hoặc đến hết Hạng mục; một Nhóm rỗng ở cuối vẫn hợp lệ.
- Cây hỗn hợp gồm Công tác trực tiếp dưới Hạng mục, Nhóm và Công tác trong Nhóm là hợp lệ. Summary của Hạng mục lấy toàn bộ Công tác descendant ở cả hai nhánh trực tiếp và trong Nhóm.
- Mục xem/sửa chọn đúng Công tác và mở vùng `TaskDetail` hiện có; mục xóa dùng lại luồng xác nhận/xóa hiện tại.
- Chuyển `Task → Group` giữ nguyên ID, ProjectId, ParentId, vị trí và SortOrder; là một action Undo/Redo duy nhất và không tạo endpoint hay entity mới.
- Chỉ Công tác trực tiếp dưới Hạng mục mới được chuyển; Công tác dưới Nhóm vẫn bị từ chối để không tạo cấu trúc Nhóm dưới Nhóm.
- Nếu Công tác có **quan hệ công việc** hoặc dữ liệu Task-specific, giao diện phải hỏi xác nhận bằng tiếng Việt. Chỉ khi người dùng đồng ý mới xóa các quan hệ công việc liên quan, chuẩn hóa dữ liệu Group và thực hiện conversion trong cùng một action Undo/Redo.

## Common Dialog dùng chung

- Mọi xác nhận, cảnh báo và câu hỏi cần quyết định của người dùng phải sử dụng Common Dialog thống nhất của AlphaPMS; không dùng hộp thoại mặc định của trình duyệt và không tạo dialog riêng theo từng màn hình.
- Common Dialog thống nhất bố cục tiêu đề, biểu tượng trạng thái, nội dung, diễn giải, nút Hủy bỏ và nút xác nhận; hỗ trợ các tone `info`, `warning`, `danger` nhưng giữ cùng hệ thiết kế.
- Nội dung giao diện viết bằng tiếng Việt và dùng thuật ngữ nghiệp vụ thống nhất. `Dependency` luôn hiển thị là **Quan hệ công việc**.
- Các luồng đang dùng Common Dialog gồm: xóa dòng tiến độ, bỏ quan hệ công việc, chuyển Công tác thành Nhóm khi phải bỏ liên kết/dữ liệu, hoàn thành dự án và xóa dự án.
