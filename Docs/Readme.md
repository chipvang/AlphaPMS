# AlphaPMS — Quy tắc làm việc và quản lý đặc tả

## 1. Mục đích của tài liệu

Đây là tài liệu quy tắc chung bắt buộc áp dụng khi phân tích, thiết kế, lập trình, kiểm thử hoặc cập nhật dự án **AlphaPMS**.

Mỗi phiên làm việc mới phải đọc toàn bộ file này trước khi thực hiện công việc. Nếu yêu cầu trong phiên làm việc mâu thuẫn với file này, phải nêu rõ điểm mâu thuẫn và chờ người phụ trách dự án quyết định, trừ khi yêu cầu mới xác nhận rõ việc sửa quy tắc.

## 2. Trình tự bắt buộc khi bắt đầu phiên làm việc

1. Đọc toàn bộ `Docs/Readme.md`.
2. Đọc tài liệu đặc tả liên quan trực tiếp đến nội dung cần xử lý.
3. Kiểm tra cấu trúc thư mục, trạng thái mã nguồn và các thay đổi chưa hoàn tất.
4. Xác định công việc hiện tại thuộc giai đoạn nào: phân tích nghiệp vụ, chốt tính năng, thiết kế giao diện, thiết kế dữ liệu, thiết kế kiến trúc, lập trình hay kiểm thử.
5. Không tự chuyển sang giai đoạn lập trình khi đặc tả hoặc kiến trúc liên quan chưa được chốt.
6. Khi hoàn thành, cập nhật tài liệu, mã nguồn và lịch sử thay đổi tương ứng.

## 3. Thứ tự phát triển sản phẩm

Dự án thực hiện theo thứ tự sau:

1. Phân tích đầy đủ nghiệp vụ.
2. Tổng hợp nghiệp vụ từ phần mềm Delta do chủ dự án sở hữu, các sản phẩm tham khảo hợp pháp và quy định hiện hành.
3. Chốt phạm vi và danh sách tính năng.
4. Chốt luồng nghiệp vụ và các quy tắc tính toán.
5. Chốt giao diện và hành vi tương tác.
6. Chốt mô hình dữ liệu, danh mục dùng chung và nguồn dữ liệu.
7. Chốt kiến trúc hệ thống, module, ranh giới trách nhiệm và tích hợp.
8. Chốt model, interface, service, API, hàm dùng chung và quy tắc đặt tên.
9. Lập kế hoạch triển khai theo module và mức ưu tiên.
10. Chỉ sau đó mới lập trình từng phần.
11. Kiểm thử theo nghiệp vụ, dữ liệu, giao diện, hiệu năng và phân quyền.

Mục tiêu là tránh vừa viết code vừa thay đổi cấu trúc lớn, gây phụ thuộc chéo và khó kiểm soát như các bản thử nghiệm trước đây.

## 4. Nguyên tắc ngôn ngữ

- Tài liệu đặc tả, mô tả nghiệp vụ, tiêu đề giao diện, nhãn, thông báo và hướng dẫn sử dụng viết bằng **tiếng Việt**.
- Tên biến, hàm, class, interface, model, API, bảng, cột và khóa dữ liệu viết bằng **tiếng Anh**.
- Không dùng tên biến hoặc tên trường không dấu bằng tiếng Việt.
- Tên tiếng Anh phải thống nhất, dễ hiểu và phù hợp cách dùng quốc tế.
- Thuật ngữ tiếng Việt quan trọng phải có ánh xạ sang tên kỹ thuật tiếng Anh trong tài liệu dữ liệu hoặc từ điển thuật ngữ.

Ví dụ:

| Tiếng Việt | Tên kỹ thuật |
|---|---|
| Dự án | `Project`, `project_id` |
| Hạng mục | `WorkItem`, `work_item_id` |
| Nhóm công việc | `TaskGroup`, `task_group_id` |
| Công tác | `Task`, `task_id` |
| Khối lượng | `quantity` |
| Định mức | `Norm`, `norm_id` |
| Đơn giá | `UnitPrice`, `unit_price` |
| Hao phí | `ResourceConsumption` |

## 5. Nơi lưu trữ tài liệu

Thư mục tài liệu chính thức duy nhất của dự án:

`D:\A VinAlpha\AlphaPMS\Docs`

Thư mục mã nguồn chính thức dùng chung cho VS Code và Codex:

`D:\A VinAlpha\AlphaPMS\Code`

Workspace đề xuất để mở đồng thời mã nguồn và tài liệu:

`D:\A VinAlpha\AlphaPMS\Code\AlphaPMS.code-workspace`

Quy tắc:

- Mọi tài liệu chính thức phải được lưu trong thư mục trên.
- Mọi thay đổi mã nguồn chính thức phải thực hiện trong thư mục `Code`; không tiếp tục phát triển trên các bản sao thử nghiệm hoặc thư mục đính kèm.
- Không coi tài liệu trong thư mục tạm, thư mục tải xuống, thư mục đính kèm hoặc vùng làm việc của công cụ là bản chính thức.
- Nếu phải tạo tài liệu ở vùng tạm để xử lý, sau khi chốt phải sao chép bản cuối vào `Docs`.
- Trước khi tạo file mới, kiểm tra xem tài liệu cùng mục đích đã tồn tại hay chưa.
- Không tạo nhiều file trùng nội dung với tên khác nhau.
- File `Readme.md` này là quy tắc gốc của dự án.

## 6. Quy tắc đặt tên tài liệu

Tên file nên theo mẫu:

`<Nhom>_<Noi_Dung>_V<So_Phien_Ban>.md`

Ví dụ:

- `Mo_ta_phan_mem_V1.md`
- `Giao_Dien_QLTD_V1.md`
- `Giao_Dien_Du_Toan_V1.md`
- `Du_Lieu_Dinh_Muc_V1.md`
- `Kien_Truc_He_Thong_V1.md`

Quy tắc phiên bản:

- Thay đổi nhỏ trong quá trình trao đổi vẫn cập nhật file phiên bản đang làm.
- Khi nội dung đã chốt và bắt đầu một vòng thay đổi lớn, tạo phiên bản mới.
- Không ghi đè mất phiên bản đã được xác nhận chính thức.
- Mỗi tài liệu nên có mục trạng thái: Nháp, Đang rà soát hoặc Đã chốt.

## 7. Nguyên tắc quản lý đặc tả

Mỗi đặc tả tính năng tối thiểu phải có:

1. Mục tiêu nghiệp vụ.
2. Phạm vi áp dụng.
3. Vai trò người dùng.
4. Dữ liệu đầu vào.
5. Luồng xử lý chính.
6. Luồng ngoại lệ và thông báo lỗi.
7. Kết quả đầu ra.
8. Quy tắc tính toán.
9. Quy tắc phân quyền.
10. Yêu cầu lưu vết và lịch sử thay đổi.
11. Giao diện và hành vi tương tác.
12. Model và trường dữ liệu dự kiến.
13. Tiêu chí nghiệm thu.
14. Các vấn đề chưa chốt.

Không được diễn giải một giả định thành yêu cầu đã chốt. Nội dung chưa được chủ dự án xác nhận phải ghi rõ là **Đề xuất** hoặc **Chưa chốt**.

## 8. Nguyên tắc thiết kế giao diện

- Thiết kế giao diện phải bám sát nghiệp vụ đã phân tích.
- Giao diện phải thống nhất về bố cục, màu sắc, khoảng cách, kiểu nút, bảng dữ liệu, cửa sổ và trạng thái.
- Các phân hệ dùng chung một hệ thiết kế; không tự tạo phong cách riêng cho từng màn hình.
- Mỗi màn hình phải thể hiện rõ phạm vi dự án, dữ liệu đang chọn và quyền chỉnh sửa.
- Chức năng cấp ứng dụng đặt ở thanh điều hướng hoặc vùng tiêu đề chung.
- Chức năng cục bộ đặt gần bảng hoặc thành phần chịu tác động.
- Không đưa quá nhiều lựa chọn lên thanh công cụ; các điều kiện phức tạp phải đặt trong cửa sổ lọc hoặc cấu hình riêng.
- Các bảng cây phải thể hiện rõ cấp cha–con, thao tác dòng và trạng thái chọn.
- Trước khi lập trình giao diện, phải có bản mô phỏng được rà soát và tài liệu giao diện đã chốt.
- Khi sửa giao diện đã chốt, phải cập nhật đồng thời bản mô phỏng và tài liệu đặc tả.

## 9. Nguyên tắc kiến trúc

- Kiến trúc phải được chốt trước khi phát triển quy mô lớn.
- Phân tách rõ các lớp: trình bày, ứng dụng, nghiệp vụ, dữ liệu và tích hợp.
- Nghiệp vụ cốt lõi không phụ thuộc trực tiếp vào framework giao diện hoặc cơ sở dữ liệu cụ thể.
- Các module phải có ranh giới trách nhiệm rõ ràng.
- Không gọi chéo tùy tiện giữa các module.
- Logic dùng chung phải đặt trong module dùng chung phù hợp, không sao chép nhiều nơi.
- Không tạo abstraction khi chưa có nhu cầu thực tế, nhưng cũng không đặt toàn bộ nghiệp vụ trong controller, component hoặc form.
- Mọi thay đổi ảnh hưởng kiến trúc, model gốc, khóa dữ liệu hoặc hợp đồng API phải được ghi lại trong tài liệu quyết định kiến trúc.

## 10. Nguyên tắc thiết kế dữ liệu

- Mọi dữ liệu nghiệp vụ phải có nguồn gốc, phạm vi và đơn vị rõ ràng.
- Dữ liệu dự án phải luôn gắn `project_id` khi nghiệp vụ có phạm vi dự án.
- Danh mục dùng chung và dữ liệu riêng của dự án phải được tách rõ.
- Sử dụng khóa định danh ổn định; không dùng tên hiển thị làm khóa liên kết.
- Lưu đơn vị đo và quy tắc quy đổi một cách tường minh.
- Không lưu cùng một giá trị dẫn xuất ở nhiều nơi nếu không có chiến lược đồng bộ rõ ràng.
- Dữ liệu định mức, đơn giá, giá vật liệu, nhân công và máy phải có phiên bản, thời gian hiệu lực, nguồn ban hành và phạm vi áp dụng.
- Không sửa trực tiếp dữ liệu lịch sử đã được phát hành; phải tạo phiên bản hoặc bản điều chỉnh.
- Các thay đổi quan trọng phải có audit log.
- Thiết kế migration trước khi thay đổi schema đã có dữ liệu.

## 11. Nguyên tắc đặt tên trong code

- Class, interface, enum và type dùng `PascalCase`.
- Biến, hàm và tham số dùng `camelCase`.
- Bảng và cột cơ sở dữ liệu ưu tiên `snake_case`.
- Hằng số dùng quy ước thống nhất của ngôn ngữ; nếu không có quy định khác thì dùng `UPPER_SNAKE_CASE`.
- Tên hàm bắt đầu bằng động từ và phản ánh hành động, ví dụ `calculateEstimate`, `allocateBoqQuantity`, `updateTaskProgress`.
- Tên boolean thể hiện câu hỏi đúng/sai, ví dụ `isActive`, `canEdit`, `hasBaseline`.
- Không dùng viết tắt khó hiểu, ngoại trừ thuật ngữ ngành đã thống nhất như `WBS`, `BOQ`, `BIM`.
- Không đặt tên chung chung như `data`, `item`, `temp`, `process` nếu không có ngữ cảnh rõ ràng.

## 12. Nguyên tắc viết hàm và model

- Mỗi hàm có một trách nhiệm chính.
- Hàm nghiệp vụ phải tách khỏi thao tác giao diện.
- Không nhúng truy vấn dữ liệu phức tạp trực tiếp trong component giao diện.
- Model nghiệp vụ phải thể hiện quy tắc và bất biến quan trọng, không chỉ là túi chứa dữ liệu.
- DTO/API model, domain model và persistence model phải được tách khi có khác biệt thực tế.
- Hàm tính toán dự toán phải xác định rõ đầu vào, đơn vị, quy tắc làm tròn, kết quả và nguồn quy định.
- Các hàm quan trọng phải có test cho trường hợp chuẩn, biên và lỗi.
- Không sửa chữ ký hàm dùng chung mà không kiểm tra toàn bộ nơi sử dụng.

## 13. Nguyên tắc chỉnh sửa code

Trước khi sửa:

1. Đọc file liên quan và các interface/model mà file đó phụ thuộc.
2. Tìm tất cả nơi sử dụng bằng công cụ tìm kiếm mã nguồn.
3. Kiểm tra thay đổi chưa commit hoặc thay đổi của người khác.
4. Xác định ảnh hưởng tới dữ liệu, API, giao diện và test.
5. Đối chiếu với đặc tả đã chốt.

Trong khi sửa:

- Chỉ sửa trong phạm vi yêu cầu.
- Không tự tái cấu trúc diện rộng khi đang sửa một lỗi nhỏ.
- Không xóa hoặc ghi đè thay đổi không liên quan.
- Không sao chép logic nghiệp vụ để giải quyết nhanh.
- Không hard-code quy định, hệ số, định mức, đơn giá hoặc ngày hiệu lực nếu chúng phải cấu hình/phiên bản hóa.
- Giữ khả năng tương thích ngược nếu chưa có quyết định phá vỡ.
- Mọi thay đổi schema phải kèm migration.

Sau khi sửa:

1. Chạy kiểm tra build, test và lint phù hợp.
2. Kiểm tra lại luồng nghiệp vụ chính.
3. Kiểm tra dữ liệu mẫu và trường hợp biên.
4. Cập nhật đặc tả hoặc tài liệu kỹ thuật nếu hành vi thay đổi.
5. Tóm tắt file đã sửa, lý do và kết quả kiểm tra.

## 14. Nguyên tắc cập nhật cấu trúc

- Không thay đổi cấu trúc thư mục, namespace, module hoặc model gốc chỉ để xử lý nhanh một tính năng.
- Nếu thay đổi cấu trúc là cần thiết, phải lập đề xuất gồm: vấn đề hiện tại, cấu trúc mới, ảnh hưởng, kế hoạch migration và rủi ro.
- Ưu tiên thay đổi nhỏ, có thể kiểm chứng và có đường quay lại.
- Không duy trì song song hai cấu trúc cho cùng một nghiệp vụ nếu không có kế hoạch loại bỏ rõ ràng.
- Sau khi chốt cấu trúc, cập nhật tài liệu kiến trúc trước hoặc đồng thời với code.

## 15. Nguyên tắc nguồn tham khảo và bản quyền

- Có thể nghiên cứu chức năng, quy trình nghiệp vụ công khai và hành vi người dùng của các phần mềm tham khảo.
- Chỉ sử dụng mã nguồn Delta khi chủ dự án xác nhận đó là mã nguồn thuộc quyền sở hữu của mình.
- Không tìm, trích xuất hoặc sử dụng mật khẩu, khóa mã hóa, cơ chế vượt bảo vệ hoặc dữ liệu bản quyền của phần mềm bên thứ ba.
- Không sao chép mã nguồn, tài nguyên, cơ sở dữ liệu hoặc nội dung được bảo hộ của phần mềm G8, F1 hay sản phẩm khác.
- Khi tham khảo quy định pháp luật, tiêu chuẩn hoặc văn bản chuyên ngành, phải ghi rõ nguồn, số hiệu, ngày hiệu lực và kiểm tra phiên bản mới nhất.
- Kết quả tham khảo phải được chuyển hóa thành đặc tả nghiệp vụ độc lập của AlphaPMS.

## 16. Nguyên tắc kiểm thử

Tối thiểu phải xem xét các nhóm kiểm thử:

- Unit test cho công thức và nghiệp vụ cốt lõi.
- Integration test cho cơ sở dữ liệu, API và dịch vụ ngoài.
- UI test cho luồng quan trọng.
- Kiểm thử phân quyền theo vai trò và dự án.
- Kiểm thử dữ liệu đa dự án, nhiều phiên bản và thời gian hiệu lực.
- Kiểm thử nhập/xuất Excel và định dạng số.
- Kiểm thử làm tròn, đơn vị và quy đổi.
- Kiểm thử hiệu năng với dự án lớn.
- Kiểm thử xung đột khi nhiều người cùng chỉnh sửa.
- Regression test trước khi phát hành.

Không coi việc build thành công là đủ để xác nhận nghiệp vụ đúng.

## 17. Nguyên tắc bảo mật và phân quyền

- Kiểm tra quyền tại backend/API, không chỉ ẩn nút trên giao diện.
- Mọi truy vấn dữ liệu dự án phải kiểm tra quyền theo `project_id`.
- Không ghi khóa bí mật, mật khẩu hoặc token vào code, tài liệu hoặc log.
- Dữ liệu tải lên phải được kiểm tra loại file, kích thước và nội dung.
- Các thao tác xóa, phát hành, khóa dữ liệu, phê duyệt hoặc thay đổi định mức phải có xác nhận và lưu vết.
- Log không được chứa dữ liệu nhạy cảm không cần thiết.

## 18. Nguyên tắc Git và lịch sử thay đổi

- Không commit file tạm, file build, dữ liệu cá nhân hoặc bí mật.
- Mỗi commit nên tập trung vào một mục đích rõ ràng.
- Nội dung commit mô tả kết quả thay đổi, không chỉ tên file.
- Không dùng thao tác phá hủy lịch sử hoặc xóa thay đổi của người khác nếu chưa được cho phép.
- Trước khi bàn giao, báo rõ các file đã thay đổi và test đã chạy.
- Tài liệu đã chốt phải được quản lý phiên bản cùng mã nguồn hoặc có liên kết phiên bản rõ ràng.

## 19. Quy tắc làm việc với trợ lý AI

- Trợ lý phải đọc file này trước mỗi phiên làm việc mới.
- Trợ lý phải ưu tiên phân tích và kiểm chứng thay vì tự suy đoán nghiệp vụ.
- Khi thiếu thông tin nhưng có thể tiếp tục bằng giả định an toàn, phải ghi rõ giả định.
- Khi giả định có thể làm thay đổi kiến trúc, dữ liệu hoặc phạm vi sản phẩm, phải hỏi lại trước khi thực hiện.
- Không tự viết code khi người dùng đang yêu cầu phân tích, đặc tả hoặc thiết kế.
- Khi được yêu cầu sửa code, phải kiểm tra tài liệu liên quan và cấu trúc hiện tại trước.
- Mọi đặc tả mới hoặc đã chốt phải được lưu vào thư mục `Docs`.
- Khi người dùng nói “chốt”, phải cập nhật tài liệu chính thức tương ứng.
- Phản hồi và tài liệu nghiệp vụ sử dụng tiếng Việt; tên kỹ thuật dùng tiếng Anh.

## 20. Danh mục tài liệu hiện tại

- `Readme.md`: Quy tắc chung của dự án.
- `Mo_ta_phan_mem_V1.md`: Mô tả tổng quan sản phẩm.
- `Giao_Dien_QLTD_V1.md`: Đặc tả giao diện Quản lý tiến độ V1.
- `Giao_Dien_DuToan_V1.md`: Đặc tả giao diện Quản lý dự toán ba khối V1.
- `Giao_Dien_Chart_V1.md`: Đặc tả giao diện biểu đồ vật liệu và máy thi công V1.
- `Kien_Truc_Undo_Redo_V1.md`: Kiến trúc Undo/Redo dùng chung cho các thao tác chỉnh sửa dữ liệu.
- `Kien_Truc_Quan_Ly_Du_An_V1.md`: Kiến trúc dữ liệu, API và luồng lưu trữ thật của module Quản lý dự án/WBS.

Danh mục này phải được cập nhật khi tạo hoặc chốt thêm tài liệu.

## 21. Trạng thái và quyền thay đổi quy tắc

- Trạng thái: **Đang áp dụng**.
- Chủ dự án có quyền bổ sung hoặc thay đổi quy tắc.
- Khi quy tắc thay đổi, cập nhật trực tiếp file này và ghi ngày cập nhật ở cuối tài liệu.

Ngày cập nhật gần nhất: **21/08/2026**.
