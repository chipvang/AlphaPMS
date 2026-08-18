# MÔ TẢ PHẦN MỀM QUẢN LÝ DỰ ÁN – V1

**Phiên bản:** V1  
**Ngày lập:** 15/08/2026  
**Trạng thái:** Bản mô tả sơ bộ để tiếp tục phân tích; chưa phải đặc tả cuối cùng để lập trình.

## 1. Mục tiêu sản phẩm

Xây dựng một phần mềm quản lý dự án xây dựng chạy trên nền web, ban đầu chạy local trên máy tính cá nhân, sau đó có thể triển khai lên Internet và hỗ trợ nhiều người sử dụng.

Phần mềm liên kết ba nhóm nghiệp vụ chính:

1. Dự toán và định mức hao phí.
2. Quản lý tiến độ thi công.
3. Biểu đồ nhu cầu vật liệu, nhân công, máy và chi phí theo thời gian.

Quan hệ nghiệp vụ cốt lõi:

```text
Khối lượng công tác
    → Định mức hao phí
    → Tổng nhu cầu vật liệu, nhân công, máy
    → Thời gian thi công
    → Nhu cầu tài nguyên theo ngày/tuần/tháng
    → Biểu đồ trực quan
```

Mục tiêu của phần mềm không chỉ là xác định tổng giá trị dự toán, mà còn trả lời được:

- Công việc nào được thực hiện vào thời điểm nào?
- Mỗi thời điểm cần bao nhiêu nhân công?
- Cần những loại máy nào và bao nhiêu ca máy?
- Vật liệu cần cung cấp vào thời điểm nào?
- Chi phí dự kiến phát sinh theo tiến độ ra sao?

## 2. Định hướng kỹ thuật đã thống nhất

### 2.1. Công nghệ dự kiến

| Thành phần | Công nghệ dự kiến |
|---|---|
| Backend | C# – ASP.NET Core |
| Frontend | React + TypeScript |
| Cơ sở dữ liệu bản local | SQLite |
| Cơ sở dữ liệu khi chạy online | PostgreSQL hoặc SQL Server, xem xét sau |
| Biểu đồ | Apache ECharts hoặc thư viện tương đương |
| Gantt | Tự hiển thị bằng HTML/CSS hoặc thư viện nhẹ; bản đầu không kéo thả |

### 2.2. Cách chạy ban đầu

Phần mềm chạy local trên Windows và được truy cập bằng trình duyệt:

```text
Trình duyệt
    → ASP.NET Core chạy tại localhost
    → SQLite lưu trong một file dữ liệu local
```

Giai đoạn phát triển có thể chạy riêng frontend và backend. Khi hoàn thiện bản local, React được build và đóng gói cùng ASP.NET Core để người dùng chỉ cần chạy một chương trình.

### 2.3. Nguyên tắc triển khai

- Bản đầu chạy local, một người dùng.
- Chưa cần Docker.
- Chưa cần tên miền hoặc máy chủ.
- Chưa cần đăng nhập và phân quyền.
- Thiết kế phần truy cập dữ liệu tách riêng để sau này có thể chuyển từ SQLite sang cơ sở dữ liệu máy chủ.

## 3. Cấu trúc quản lý dự án

Phần mềm quản lý nội dung theo cấu trúc cây:

```text
Dự án
└── Hạng mục
    └── Nhóm công việc
        └── Công tác tiến độ
```

Cấu trúc thực tế được phép linh hoạt. Có thể bỏ qua một số cấp trung gian, ví dụ công tác nằm trực tiếp dưới hạng mục nếu dự án không cần nhóm công việc.

### 3.1. Các thao tác trên cây công việc

Người dùng có thể:

- Thêm dòng.
- Xóa dòng.
- Sao chép và dán dòng.
- Chọn một hoặc nhiều dòng.
- Dịch dòng lên.
- Dịch dòng xuống.
- Đẩy dòng vào một cấp.
- Đẩy dòng ra một cấp.
- Thu gọn và mở rộng nhóm.
- Tự động đánh lại số thứ tự dạng `1`, `1.1`, `1.1.1`.

Khi dịch chuyển một dòng có các dòng con, toàn bộ nhánh con phải được di chuyển cùng dòng cha.

### 3.2. Quy tắc cấu trúc

- Dự án là cấp cao nhất.
- Hạng mục, nhóm và công tác được xác định bằng quan hệ cha–con, không dựa vào màu sắc hoặc định dạng giao diện.
- Không cho phép đẩy một dòng vào chính nó hoặc vào một dòng con của nó.
- Dòng có con là dòng tổng hợp.
- Công tác tiến độ là dòng thực hiện cuối cùng và có thời gian thi công.
- Dòng dự án, hạng mục và nhóm có thể tổng hợp thời gian, giá trị và hao phí từ các dòng con.

### 3.3. Dữ liệu sơ bộ của một dòng

| Trường | Ý nghĩa |
|---|---|
| Id | Mã định danh nội bộ |
| ProjectId | Dự án chứa dòng |
| ParentId | Dòng cha |
| ItemType | Project, Category, Group hoặc Task |
| Name | Tên dòng |
| SortOrder | Thứ tự trong cùng một cấp |
| StartDate | Ngày bắt đầu |
| EndDate | Ngày kết thúc |
| Progress | Phần trăm hoàn thành, bổ sung ở giai đoạn sau |

## 4. Lưới nhập liệu

Lưới phía bên trái có cách sử dụng gần giống Excel hoặc MS Project.

Các cột dự kiến ban đầu:

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự phân cấp |
| Tên công việc | Tên dự án, hạng mục, nhóm hoặc công tác |
| Đơn vị đại diện | Có thể để trống đối với dòng tổng hợp |
| Khối lượng đại diện | Không dùng để cộng các công tác dự toán khác đơn vị |
| Ngày bắt đầu | Ngày bắt đầu kế hoạch |
| Ngày kết thúc | Ngày kết thúc kế hoạch |
| Thời lượng | Tính từ lịch làm việc |
| Hao phí/Định mức | Nút mở cửa sổ chi tiết |
| Trạng thái | Chưa gán định mức, đã hoàn chỉnh hoặc còn thiếu dữ liệu |

Yêu cầu giao diện:

- Cho phép sửa trực tiếp trong ô.
- Các cấp được thụt lề để thể hiện cấu trúc cây.
- Dự án, hạng mục, nhóm và công tác có cách định dạng khác nhau.
- Có thể cố định phần tiêu đề khi cuộn.
- Không hiển thị toàn bộ dữ liệu lớn cùng lúc nếu gây chậm; sử dụng phân trang hoặc virtual scrolling khi cần.

## 5. Khái niệm công tác tiến độ và công tác dự toán con

### 5.1. Quyết định thiết kế đã thống nhất

Không phân biệt “công tác thường” và “công tác gộp”.

**Mọi công tác tiến độ đều chứa danh sách từ một đến nhiều công tác dự toán con.**

- Có một mã định mức: về hình thức giống công tác thông thường.
- Có nhiều mã định mức: về nghiệp vụ là công tác gộp.
- Cả hai trường hợp dùng chung một cấu trúc dữ liệu và một công thức tổng hợp.

Trong lúc người dùng đang soạn thảo, phần mềm có thể tạm cho phép một công tác tiến độ chưa có mã định mức. Tuy nhiên, trước khi tính biểu đồ hoặc phát hành kế hoạch, phần mềm phải cảnh báo các công tác chưa có dữ liệu hao phí.

### 5.2. Ví dụ công tác có một công tác dự toán con

Công tác tiến độ: **Rải vải địa kỹ thuật**

| Mã hiệu | Tên công tác dự toán | Đơn vị | Khối lượng |
|---|---|---|---:|
| AL.16111 | Rải vải địa kỹ thuật | m² | 12.500 |

### 5.3. Ví dụ công tác có nhiều công tác dự toán con

Công tác tiến độ: **Thi công cống D600 đoạn 1**

| Mã hiệu | Tên công tác dự toán | Đơn vị | Khối lượng |
|---|---|---|---:|
| Mã 1 | Đào đất móng cống | m³ | 1.250 |
| Mã 2 | Vận chuyển đất | m³ | 1.250 |
| Mã 3 | Đệm cát đáy cống | m³ | 120 |
| Mã 4 | Lắp đặt cống D600 | m | 240 |
| Mã 5 | Xây hố ga | m³ | 48 |
| Mã 6 | Đắp cát hoàn trả | m³ | 850 |

Trên tiến độ và Gantt chỉ hiển thị một dòng:

```text
Thi công cống D600 đoạn 1
```

Các công tác dự toán con đóng góp hao phí nhưng không tự tạo thêm thanh Gantt.

### 5.4. Nguyên tắc khối lượng

Không cộng trực tiếp khối lượng của các công tác dự toán con vì chúng có thể khác đơn vị.

Ví dụ không được cộng:

```text
1.250 m³ + 240 m + 48 m³
```

Dòng tiến độ có thể:

- Không có khối lượng đại diện.
- Có khối lượng đại diện do người dùng nhập, ví dụ 240 m cống.
- Có đơn vị đại diện là `m`, `cấu kiện`, `đoạn` hoặc `gói`.

Phần mềm chỉ cộng dồn các đại lượng có thể tổng hợp được như giá trị, hao phí vật liệu, nhân công, máy và chi phí theo nhóm.

## 6. Cửa sổ gán định mức và tạo danh sách công tác dự toán con

Khi người dùng chọn một công tác tiến độ và bấm **Định mức và hao phí**, phần mềm mở một cửa sổ riêng.

### 6.1. Phần thông tin công tác tiến độ

- Tên công tác tiến độ.
- Ngày bắt đầu.
- Ngày kết thúc.
- Khối lượng và đơn vị đại diện nếu có.
- Phương pháp phân bổ tài nguyên.

### 6.2. Danh sách công tác dự toán con

| Trường | Nội dung |
|---|---|
| Mã hiệu | Mã định mức được chọn |
| Tên công tác | Tên theo định mức hoặc tên đã hiệu chỉnh |
| Đơn vị | Đơn vị của định mức |
| Khối lượng | Khối lượng riêng của công tác con |
| Hệ số | Hệ số điều chỉnh hao phí |
| Giá trị | Giá trị dự toán của công tác con |

Các thao tác dự kiến:

- Thêm công tác dự toán con.
- Xóa công tác con.
- Sao chép công tác con.
- Dịch lên và dịch xuống.
- Tra cứu định mức.
- Xem và hiệu chỉnh hao phí.
- Lưu danh sách thành mẫu dùng lại.
- Gán danh sách vào công tác tiến độ.

### 6.3. Công tác tạm tính

Nếu không có mã định mức phù hợp, người dùng tạo một công tác tạm tính. Công tác này vẫn là một công tác dự toán con và được phép nhập:

- Tên công tác.
- Đơn vị.
- Khối lượng.
- Hao phí vật liệu.
- Hao phí nhân công.
- Hao phí máy.
- Đơn giá hoặc giá trị tạm tính.

## 7. Tra cứu bộ định mức

Bộ dữ liệu ban đầu dự kiến khoảng 10.000 dòng và bốn cột chính. Quy mô này không phải trở ngại đối với ứng dụng web.

Phương án khuyến nghị:

- Dữ liệu định mức được lưu trong cơ sở dữ liệu.
- Khi người dùng nhập mã hoặc tên, frontend gửi yêu cầu tìm kiếm đến API.
- API chỉ trả về khoảng 30–50 kết quả phù hợp nhất.
- Chi tiết hao phí chỉ được tải khi người dùng chọn công tác.
- Có thể cache các kết quả đã tra và các công tác thường dùng.

Tìm kiếm phải hỗ trợ:

- Mã hiệu chính xác.
- Mã bắt đầu bằng nội dung nhập.
- Từ khóa trong tên công tác.
- Tiếng Việt có dấu và không dấu.
- Tìm theo nhiều từ không nhất thiết liền nhau.
- Có thể bổ sung tìm gần đúng khi người dùng gõ sai.

Thứ tự ưu tiên kết quả:

1. Khớp chính xác mã hiệu.
2. Mã hiệu bắt đầu bằng từ khóa.
3. Tên công tác bắt đầu bằng từ khóa.
4. Tên chứa đầy đủ các từ khóa.
5. Tìm gần đúng.

## 8. Hao phí vật liệu, nhân công và máy

Mỗi công tác dự toán con chứa các tài nguyên định mức thuộc ba nhóm:

```text
Vật liệu
Nhân công
Máy thi công
```

Người dùng được phép:

- Sửa hao phí gốc.
- Áp dụng hệ số điều chỉnh.
- Thêm hoặc xóa tài nguyên.
- Thay thế tài nguyên tương đương.
- Điều chỉnh đơn giá.
- Lưu công tác đã hiệu chỉnh làm định mức nội bộ.

### 8.1. Công thức tổng hợp

Với một công tác tiến độ `T`, gồm các công tác dự toán con `i = 1..n`, hao phí của tài nguyên `r` được tính:

```text
Tổng hao phí (T, r)
    = Tổng của [Khối lượng công tác con i
               × Hao phí định mức của tài nguyên r
               × Hệ số điều chỉnh của công tác con i]
```

Nếu nhiều công tác con dùng cùng một tài nguyên thì phần mềm cộng dồn tài nguyên đó.

Ví dụ:

| Công tác con | Khối lượng | Định mức nhân công | Thành tiền hao phí |
|---|---:|---:|---:|
| Đào đất | 1.250 m³ | 0,05 công/m³ | 62,5 công |
| Đắp cát | 850 m³ | 0,08 công/m³ | 68 công |

Tổng nhân công của công tác tiến độ là `130,5 công`.

## 9. Quản lý tiến độ và Gantt

### 9.1. Dữ liệu tiến độ ban đầu

Mỗi công tác tiến độ có:

- Ngày bắt đầu.
- Ngày kết thúc.
- Thời lượng.
- Lịch làm việc.
- Phương pháp phân bổ hao phí.
- Phần trăm hoàn thành, bổ sung sau.
- Khối lượng kế hoạch và thực hiện, bổ sung sau.

### 9.2. Gantt bản đầu

- Gantt chỉ hiển thị, chưa cần kéo thả.
- Người dùng thay đổi ngày bằng cách sửa trực tiếp trên lưới hoặc trong cửa sổ công tác.
- Thanh Gantt tự cập nhật theo ngày bắt đầu và kết thúc.
- Dòng dự án, hạng mục và nhóm có thể hiển thị thanh tổng hợp.
- Cho phép phóng đại theo ngày, tuần hoặc tháng ở giai đoạn sau.

Việc chưa làm kéo thả giúp giảm đáng kể độ phức tạp, gồm xử lý chuột, thay đổi thời lượng, lịch nghỉ, quan hệ phụ thuộc và hoàn tác khi kéo sai.

### 9.3. Quan hệ công việc

Quan hệ trước–sau chưa thuộc phạm vi bản thử đầu tiên. Cấu trúc dữ liệu nên cho phép bổ sung sau các quan hệ:

- Kết thúc – Bắt đầu.
- Bắt đầu – Bắt đầu.
- Kết thúc – Kết thúc.
- Độ trễ hoặc thời gian chờ.

## 10. Phân bổ hao phí theo thời gian

Tổng hao phí của công tác tiến độ được phân bổ trong khoảng ngày bắt đầu đến ngày kết thúc.

Các phương pháp có thể hỗ trợ về lâu dài:

| Phương pháp | Ý nghĩa |
|---|---|
| Chia đều | Hao phí được chia đều trong thời gian thi công |
| Theo khối lượng ngày | Người dùng nhập khối lượng kế hoạch từng ngày |
| Tập trung đầu kỳ | Tài nguyên được huy động chủ yếu lúc bắt đầu |
| Tập trung cuối kỳ | Tài nguyên được sử dụng chủ yếu khi hoàn thành |
| Đường cong | Tăng dần, đạt đỉnh rồi giảm |
| Nhập thủ công | Nhập trực tiếp nhu cầu từng ngày |

Bản đầu chỉ cần:

1. Chia đều theo ngày.
2. Nhập khối lượng kế hoạch từng ngày.

Ví dụ tổng hao phí nhân công là `130,5 công`, thời gian thi công 15 ngày:

```text
Nhu cầu trung bình = 130,5 / 15 = 8,7 người/ngày
```

Phần mềm cần xác định rõ cách làm tròn khi hiển thị và cách giữ giá trị chính xác khi tính toán.

## 11. Biểu đồ tài nguyên

Biểu đồ nằm phía dưới Gantt và dùng chung trục thời gian.

Khi người dùng cuộn ngang hoặc thay đổi khoảng ngày trên Gantt, biểu đồ tài nguyên phải hiển thị cùng khoảng thời gian.

Các loại biểu đồ dự kiến:

- Tổng nhân lực theo ngày, tuần hoặc tháng.
- Nhân lực phân theo nhóm nghề hoặc bậc thợ.
- Máy thi công theo loại máy.
- Vật liệu theo chủng loại.
- Chi phí theo thời gian.
- So sánh kế hoạch và thực tế ở giai đoạn sau.
- Đường giới hạn nguồn lực và cảnh báo quá tải ở giai đoạn sau.

Người dùng có thể lọc biểu đồ theo:

- Toàn dự án.
- Hạng mục.
- Nhóm công việc.
- Một hoặc nhiều công tác.
- Loại tài nguyên.
- Khoảng thời gian.

## 12. Mẫu công tác

Phần mềm nên cho phép lưu một công tác tiến độ cùng danh sách công tác dự toán con thành mẫu để sử dụng lại.

Ví dụ:

- Thi công cống D600 hoàn chỉnh.
- Thi công cống D800 hoàn chỉnh.
- Thi công hố ga.
- Thi công kết cấu đường loại 1.
- Thi công vỉa hè.
- Thi công bó vỉa.
- Thi công cấp nước.
- Thi công chiếu sáng.

Về lâu dài, một mẫu có thể chứa công thức tính khối lượng. Ví dụ người dùng chỉ nhập chiều dài tuyến và số lượng hố ga, phần mềm tính khối lượng các công tác dự toán con.

Chức năng công thức khối lượng chưa thuộc bản thử đầu tiên nhưng cần được lưu ý khi thiết kế dữ liệu.

## 13. Mô hình dữ liệu sơ bộ

### 13.1. Dòng cây dự án

```text
WorkItems
- Id
- ProjectId
- ParentId
- ItemType
- Name
- RepresentativeUnit
- RepresentativeQuantity
- StartDate
- EndDate
- SortOrder
```

### 13.2. Công tác dự toán con

```text
TaskEstimateItems
- Id
- WorkItemId
- NormCodeId
- Description
- Unit
- Quantity
- Coefficient
- SortOrder
```

Quan hệ:

```text
Một WorkItem loại Task
    → có từ một đến nhiều TaskEstimateItems
```

### 13.3. Hao phí của công tác dự toán con

```text
TaskEstimateResources
- Id
- TaskEstimateItemId
- ResourceId
- ResourceType
- OriginalConsumptionRate
- AdjustedConsumptionRate
- UnitPrice
```

`ResourceType` dự kiến gồm:

```text
Material
Labor
Machine
```

### 13.4. Nguyên tắc lưu hao phí

- Không nên chỉ lưu tổng hao phí cố định tại công tác tiến độ.
- Tổng hao phí phải có thể tính lại từ các công tác dự toán con.
- Khi người dùng sửa khối lượng, hệ số hoặc hao phí con, tổng và biểu đồ phải cập nhật.
- Cần cân nhắc lưu kết quả tổng hợp dạng cache để tăng tốc, nhưng dữ liệu chi tiết vẫn là nguồn chính.

## 14. Phạm vi bản thử nghiệm đầu tiên

### 14.1. Chức năng bắt buộc

1. Tạo và mở dự án.
2. Lưới dự án, hạng mục, nhóm và công tác.
3. Thêm, xóa, dịch lên, dịch xuống, đẩy vào và đẩy ra.
4. Lưu dữ liệu vào SQLite.
5. Nhập tên, ngày bắt đầu và ngày kết thúc.
6. Tra cứu bộ định mức khoảng 10.000 mã.
7. Tạo danh sách từ một đến nhiều công tác dự toán con cho mỗi công tác tiến độ.
8. Gắn và hiệu chỉnh hao phí vật liệu, nhân công, máy.
9. Tổng hợp hao phí lên công tác tiến độ.
10. Hiển thị Gantt không kéo thả.
11. Hiển thị biểu đồ tổng nhân lực theo ngày.
12. Cảnh báo các công tác chưa có định mức hoặc chưa đủ dữ liệu.

### 14.2. Chưa làm trong bản thử đầu tiên

- Đăng nhập và phân quyền.
- Nhiều người cùng sửa một dự án.
- Máy chủ Internet và tên miền.
- Kéo thả thanh Gantt.
- Quan hệ tiến độ phức tạp.
- Tự động cân bằng tài nguyên.
- Thanh toán, quyết toán và hồ sơ chất lượng.
- Theo dõi thực tế đầy đủ.
- Ứng dụng điện thoại riêng.
- Xuất toàn bộ biểu mẫu dự toán theo quy định.

## 15. Trình tự phát triển dự kiến

### Giai đoạn 1 – Khung dự án và lưới cây

- Tạo solution backend và frontend.
- Tạo SQLite.
- Tạo dự án.
- Hiển thị lưới cây.
- Thêm, xóa, dịch lên, dịch xuống, đẩy vào, đẩy ra.

### Giai đoạn 2 – Dự toán và định mức

- Nhập bộ định mức.
- Tìm kiếm mã và tên công tác.
- Cửa sổ công tác dự toán con.
- Gắn hao phí vật liệu, nhân công, máy.
- Tính tổng hao phí.

### Giai đoạn 3 – Tiến độ và Gantt

- Nhập ngày.
- Lịch làm việc cơ bản.
- Vẽ Gantt chỉ đọc.
- Tổng hợp ngày của dự án, hạng mục và nhóm.

### Giai đoạn 4 – Biểu đồ tài nguyên

- Phân bổ đều theo thời gian.
- Nhập khối lượng kế hoạch từng ngày.
- Biểu đồ nhân lực.
- Sau đó bổ sung biểu đồ máy, vật liệu và chi phí.

### Giai đoạn 5 – Hoàn thiện bản local

- Nhập và xuất Excel.
- Sao lưu dữ liệu.
- Kiểm tra lỗi và hoàn tác thao tác.
- Đóng gói cài đặt hoặc chạy một file thực thi.

## 16. Ước lượng thời gian ban đầu

Nếu yêu cầu được chốt rõ, làm đều và có Codex hỗ trợ:

| Mức hoàn thiện | Thời gian ước tính |
|---|---:|
| Trang mẫu có lưới cây và Gantt giả lập | 3–5 ngày |
| Bản thử có lưới, SQLite và thao tác cây | 1–2 tuần |
| Dự toán, định mức và hao phí cơ bản | 2–3 tuần tiếp theo |
| Tiến độ và biểu đồ nhân lực | 2–3 tuần tiếp theo |
| Bản local tương đối ổn định | Khoảng 1,5–2 tháng làm việc tập trung |

Ước lượng này cần điều chỉnh sau khi chốt chi tiết giao diện, cấu trúc dữ liệu định mức, nhập Excel và các biểu mẫu đầu ra.

## 17. Các quyết định đã chốt trong V1

1. Phần mềm là hệ thống quản lý dự án xây dựng, không chỉ là phần mềm dự toán.
2. Ba trục nghiệp vụ chính là dự toán, tiến độ và biểu đồ tài nguyên.
3. Ban đầu chạy local bằng trình duyệt.
4. Backend dùng C# ASP.NET Core; frontend dùng React + TypeScript.
5. Bản local dùng SQLite.
6. Gantt bản đầu không cần kéo thả.
7. Lưới cây cho phép lên, xuống, đẩy vào và đẩy ra.
8. Mọi công tác tiến độ đều có danh sách công tác dự toán con.
9. Không tồn tại hai loại “công tác thường” và “công tác gộp”.
10. Một công tác tiến độ chính thức có tối thiểu một công tác dự toán con.
11. Trong khi soạn thảo có thể tạm thời chưa gán định mức nhưng phải được cảnh báo.
12. Công tác dự toán con không tạo thanh Gantt riêng.
13. Hao phí của công tác tiến độ được cộng từ tất cả công tác dự toán con.
14. Không cộng khối lượng khác đơn vị của các công tác con.
15. Gantt ở trên và biểu đồ tài nguyên ở dưới dùng chung trục thời gian.

## 18. Các nội dung cần thảo luận tiếp

1. Có cần tách hoàn toàn cây dự toán và cây tiến độ hay tiếp tục dùng một dòng tiến độ làm điểm liên kết chính?
2. Quy tắc xác định loại dòng Project, Category, Group và Task khi đẩy vào hoặc đẩy ra.
3. Dòng có con có được đồng thời chứa công tác dự toán hay chỉ là dòng tổng hợp?
4. Cách nhập khối lượng kế hoạch từng ngày.
5. Cách xử lý ngày nghỉ, ngày lễ và số ca làm việc.
6. Quy tắc làm tròn nhân lực và ca máy.
7. Một công tác dự toán có được sử dụng đồng thời cho nhiều công tác tiến độ hay phải phân bổ khối lượng?
8. Cách tránh tính trùng hao phí khi sao chép hoặc liên kết công tác.
9. Mô hình giá vật liệu, nhân công và máy theo tỉnh, thời điểm và nguồn giá.
10. Cấu trúc dữ liệu thực tế của bộ định mức hiện có.
11. Cách nhập dữ liệu từ Excel và xuất trở lại Excel.
12. Giao diện chi tiết của cửa sổ gán định mức.
13. Cách lưu mẫu công tác và công thức khối lượng.
14. Phân biệt kế hoạch, điều chỉnh và thực tế.
15. Cách quản lý phiên bản tiến độ và dự toán.
16. Phạm vi các bảng biểu dự toán cần xuất ở phiên bản đầu.

## 19. Điểm bắt đầu cho buổi thảo luận sau

Khi tiếp tục, nên thực hiện theo thứ tự:

1. Xem lại các quyết định tại Mục 17.
2. Giải quyết lần lượt các vấn đề tại Mục 18.
3. Chốt mô hình dữ liệu của dự án, cây công việc, công tác dự toán con và tài nguyên.
4. Phác thảo giao diện chính và cửa sổ gán định mức.
5. Xác định dữ liệu mẫu dùng cho bản thử.
6. Chỉ bắt đầu viết code sau khi các quy tắc nghiệp vụ cốt lõi đã được thống nhất.

---

**Ghi chú sử dụng:** Khi bắt đầu buổi làm việc mới, nạp file này và yêu cầu tiếp tục phân tích từ phần “Các nội dung cần thảo luận tiếp”. Khi các nội dung được chốt, cập nhật file thành V2 trước khi bắt đầu lập trình.
