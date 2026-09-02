# ALPHAPMS — BẢN ĐỒ VÀ QUY ƯỚC UI

**Tên file chính thức:** `UI.md`  
**Thư mục chính thức:** `D:\A VinAlpha\AlphaPMS\Docs`  
**Trạng thái:** Đang áp dụng cho chuẩn hóa kiến trúc UI  
**Mục tiêu:** Là từ điển và bản đồ giao diện gốc của AlphaPMS. Khi trao đổi, viết tài liệu hoặc giao việc cho Codex phải ưu tiên đúng tên View, Block, Region và Control được định nghĩa tại đây.

---

# 1. Tài liệu và ảnh tham chiếu chính thức

Khi cần hiểu bố cục tổng thể, Codex phải đọc `UI.md` trước và có thể đối chiếu hai ảnh:

```text
D:\A VinAlpha\AlphaPMS\Ảnh\UI_view_Tiendo.png
D:\A VinAlpha\AlphaPMS\Ảnh\UI_View_DuToan.png
```

Ý nghĩa:

- `UI_view_Tiendo.png`: bố cục tổng thể của `ScheduleView`.
- `UI_View_DuToan.png`: bố cục tổng thể của `EstimateView`.

Ảnh dùng để tham khảo:

- vị trí tương đối;
- ranh giới Region/Block;
- hướng ghép Block;
- Splitter;
- khoảng cách;
- tỷ lệ tổng thể.

**Tên gọi trong `UI.md` là chuẩn cao nhất.**

Nếu chữ ghi trên ảnh khác tên chuẩn trong `UI.md`, phải dùng tên trong `UI.md`, không tự đổi tên code theo chữ trên ảnh.

---

# 2. Hệ thuật ngữ UI chuẩn

## 2.1. View

`View` là một màn hình nghiệp vụ được chọn thông qua điều hướng chính.

Ví dụ:

```text
ProjectListView
ScheduleView
EstimateView
ResourceCostView
SharedCatalogView
```

View chủ yếu có trách nhiệm:

- chọn các UI Block cần hiển thị;
- bố trí các Block trong `ViewHost`;
- quản lý layout state của View;
- nối shared/domain state vào các Block.

View không được tạo lại implementation riêng của một Block chỉ vì Block đó xuất hiện ở View khác.

---

## 2.2. UI Block

Gọi ngắn trong trao đổi là **Block**.

Block là khối chức năng UI tương đối độc lập, có trách nhiệm rõ ràng và có thể:

- tái sử dụng;
- ghép với Block khác;
- bật/tắt;
- ẩn/hiện;
- thay đổi kích thước thông qua layout;
- được sử dụng trong nhiều View.

Các Block chính hiện đã chuẩn hóa:

```text
TaskGrid
GanttTimeline
TaskEstimateItemGrid
EstimateResourceGrid
```

Block không tự quyết định nó nằm bên trái, bên phải, phía trên hay phía dưới.

Vị trí của Block do View/layout trong `ViewHost` quyết định.

---

## 2.3. Region

`Region` là một vùng bố cục nằm bên trong một vùng UI cấp cao hơn hoặc bên trong một Block.

Region giúp xác định trách nhiệm trình bày.

Ví dụ:

```text
AppSidebar
├── SidebarHeader
├── SidebarNavigation
└── SidebarFooter
```

Region có thể được hiện thực bằng React Component riêng nếu cần, nhưng Region không mặc nhiên là một Block nghiệp vụ độc lập.

---

## 2.4. Component

`Component` là khái niệm kỹ thuật React.

Ví dụ:

```text
UI Block TaskGrid
    -> TaskGrid.tsx

UI Block GanttTimeline
    -> GanttTimeline.tsx

Region SidebarHeader
    -> có thể là SidebarHeader.tsx
```

Không dùng từ Component để thay thế cho View/Block/Region trong tài liệu nghiệp vụ UI.

---

## 2.5. Control

`Control` là phần tử tương tác nhỏ.

Ví dụ:

```text
Button
Input
Select
SearchBox
Tab
Toggle
MenuItem
ColumnResizer
BlockSplitter
```

Control không gọi là Block.

---

## 2.6. Layout Group

`Layout Group` là nhóm bố cục chỉ dùng để sắp xếp Block.

Ví dụ trong `EstimateView`:

```text
EstimateDetailStack
├── TaskEstimateItemGrid
├── HorizontalBlockSplitter
└── EstimateResourceGrid
```

`EstimateDetailStack` không phải Block nghiệp vụ.

---

# 3. Bản đồ UI cấp ứng dụng

Cấu trúc cấp cao nhất:

```text
AlphaPMS Application
│
├── AppSidebar
│
└── AppMain
```

`AppSidebar` và `AppMain` là hai vùng cấp ứng dụng ngang hàng.

---

# 4. `AppSidebar`

**Tên chuẩn:** `AppSidebar`  
**Vai trò:** Thanh điều hướng chính của toàn ứng dụng.

Chỉ có **một implementation `AppSidebar`** trong ứng dụng.

Cấu trúc:

```text
AppSidebar
├── SidebarHeader
├── SidebarNavigation
└── SidebarFooter
```

## 4.1. `SidebarHeader`

Trách nhiệm:

- nhận diện AlphaPMS;
- logo/brand;
- tên sản phẩm;
- phụ đề nếu có;
- `SidebarToggle`.

Cấu trúc logic:

```text
SidebarHeader
├── AppBrand
│   ├── BrandMark
│   ├── ProductName
│   └── ProductSubtitle
└── SidebarToggle
```

---

## 4.2. `SidebarNavigation`

Trách nhiệm:

- điều hướng giữa các View;
- hiển thị View active;
- chiếm vùng chiều cao linh hoạt ở giữa.

Các mục hiện tại:

```text
Danh sách dự án
Quản lý tiến độ
Quản lý dự toán
Nguồn lực & chi phí
Danh mục dùng chung
```

Khoảng trống bên dưới menu vẫn thuộc `SidebarNavigation`.

---

## 4.3. `SidebarFooter`

Trách nhiệm:

```text
SidebarFooter
├── SettingsEntry
└── UserSummary
    ├── UserAvatar
    ├── UserName
    └── UserRole
```

---

## 4.4. Trạng thái `AppSidebar`

Kiến trúc phải hỗ trợ:

```text
expanded
collapsed
hidden
```

Nguyên tắc:

- state Sidebar thuộc cấp ứng dụng;
- không thuộc `ScheduleView`;
- không thuộc `EstimateView`;
- chuyển View không tạo Sidebar mới.

Tham chiếu kích thước:

```text
Expanded: khoảng 248–280 px tùy UI thực tế
Collapsed: khoảng 58–64 px
Hidden: 0 px
```

Kích thước thực tế phải ưu tiên design token/code đã chốt sau cùng.

---

# 5. `AppMain`

**Tên chuẩn:** `AppMain`  
**Vai trò:** Toàn bộ vùng bên phải `AppSidebar`.

Cấu trúc:

```text
AppMain
├── AppHeader
├── AppToolbar
├── ViewHost
└── AppStatusBar
```

Bốn thành phần trên là **Region của `AppMain`**.

---

# 6. `AppHeader`

**Loại:** Region của `AppMain`.

Trách nhiệm:

- tiêu đề/ngữ cảnh cấp cao;
- dự án đang chọn;
- gói thầu/phạm vi nếu có;
- các thông tin context cấp ứng dụng/View;
- các control context phù hợp.

Không chứa Grid nghiệp vụ.

Baseline hiện tại khoảng:

```text
height ≈ 66 px
```

Chiều cao phải thống nhất giữa các View.

---

# 7. `AppToolbar`

**Loại:** Region của `AppMain`.

Trách nhiệm:

- các lệnh cấp View;
- nội dung có thể thay đổi theo View.

Ví dụ `ScheduleView` có thể có:

```text
Nhập từ Excel
Hoàn tác
Làm lại
Lọc
Lịch làm việc
Cách nhau N ngày
Lịch sử
Lưu thay đổi
```

Ví dụ `EstimateView`:

```text
Nhập từ Excel
Hoàn tác
Làm lại
Lọc
Lịch sử
Lưu thay đổi
```

Quy tắc:

- action chỉ tác động một Block nên ưu tiên đặt trong Block hoặc cột `Tác vụ`;
- không dồn mọi action lên `AppToolbar`.

Baseline:

```text
height ≈ 50 px
```

---

# 8. `ViewHost`

**Loại:** Region chính của `AppMain`.

`ViewHost` chiếm phần không gian linh hoạt còn lại.

Trách nhiệm:

- render View active;
- ghép các Block;
- quản lý layout;
- quản lý Block visibility;
- quản lý `BlockSplitter`;
- quản lý khoảng cách giữa các Block.

`ViewHost` không tạo implementation riêng của Block.

---

# 9. `AppStatusBar`

**Loại:** Region cuối của `AppMain`.

Trách nhiệm:

- trạng thái backend/kết nối;
- trạng thái lưu;
- context hiện tại;
- thông tin kỹ thuật ngắn.

Ví dụ:

```text
Localhost đang hoạt động
Đang ở Quản lý tiến độ
ASP.NET Core · SQLite
```

Baseline:

```text
height ≈ 30 px
```

Không đặt action nghiệp vụ chính tại đây.

---

# 10. Hệ khoảng cách chuẩn

Dùng hệ spacing:

```text
4 px   = micro
8 px   = small / khoảng cách chuẩn giữa thành phần gần nhau
12 px  = medium / padding chuẩn cấp View
16 px  = large
```

Design token đề xuất:

```text
--ui-space-xs: 4px;
--ui-space-sm: 8px;
--ui-space-md: 12px;
--ui-space-lg: 16px;
```

Quy định:

- gap chuẩn giữa hai Block cùng cấp: **8 px**;
- `ViewHost` padding tham chiếu:
  - top: 8 px;
  - left: 12 px;
  - right: 12 px;
  - bottom: 12 px;
- padding trong Block: 8–12 px tùy nội dung;
- không tự sinh các khoảng 5/7/11 px nếu không có lý do cụ thể.

---

# 11. Khung chuẩn của UI Block

Block nghiệp vụ mặc định:

```text
background: var(--surface)
border: 1px solid var(--line)
border-radius: 8px
min-width: 0
min-height: 0
overflow: hidden
```

Block có thể chứa:

```text
BlockHeader        [optional]
BlockControlBar    [optional]
BlockBody
BlockTabs          [optional]
BlockScrollbar     [optional]
```

Không bắt buộc mọi Block phải có đủ các Region trên.

---

# 12. Quy tắc ghép Block

Block không tự quyết định:

```text
left
right
top
bottom
adjacentBlock
gap
splitter
```

Các thuộc tính này thuộc View/layout.

Do đó cùng một `TaskGrid` có thể được ghép ở nhiều View mà không sửa implementation.

---

# 13. `BlockSplitter`

**Loại:** Layout Control.

Splitter thuộc quan hệ giữa hai Block kề nhau, không thuộc riêng Block nào.

Hai loại:

```text
VerticalBlockSplitter
HorizontalBlockSplitter
```

## 13.1. Vertical

Dùng giữa Block trái/phải.

```text
cursor: col-resize
```

## 13.2. Horizontal

Dùng giữa Block trên/dưới.

```text
cursor: row-resize
```

## 13.3. Kích thước

Chuẩn:

```text
hit area: 8 px
visible line: khoảng 1 px
```

Hover/drag dùng màu nhấn của hệ thống.

Không cần tay nắm lớn cố định ở cạnh Block.

## 13.4. Quy định

Không đặt resize handle cố định bên phải/bottom của từng Block.

Nếu cần resize giữa hai Block, View dùng `BlockSplitter`.

Không kéo Block về 0 để giả lập ẩn.

Ẩn Block phải dùng visibility/layout state rõ ràng.

---

# 14. Thuộc tính logic chuẩn của Block

Đây là mô hình khái niệm, không bắt buộc biến toàn bộ thành React props.

## Identity

```text
blockId
blockType
title
```

## Visibility

```text
isVisible
canHide
canCollapse
```

## Sizing

```text
minWidth
minHeight
preferredWidth
preferredHeight
canResize
```

## Display state

```text
activeTab
viewMode
selectedEntityId
```

## Communication

Block giao tiếp thông qua:

- props;
- callbacks;
- shared state/store/context phù hợp.

Không gọi trực tiếp method nội bộ của Block khác để đồng bộ nghiệp vụ.

---

# 15. `ScheduleView`

Ảnh tham chiếu:

```text
D:\A VinAlpha\AlphaPMS\Ảnh\UI_view_Tiendo.png
```

Bố cục:

```text
ViewHost / ScheduleView
┌──────────────────────────┬─┬───────────────────────────────┐
│                          │ │                               │
│         TaskGrid         │S│        GanttTimeline          │
│                          │ │                               │
└──────────────────────────┴─┴───────────────────────────────┘
                           ^
                VerticalBlockSplitter
```

`S` là vùng hit của Splitter.

Hai Block:

```text
Block 1: TaskGrid
Block 2: GanttTimeline
```

Default ratio chỉ là layout state của `ScheduleView`.

Tham chiếu ban đầu:

```text
TaskGrid: khoảng 40–55%
GanttTimeline: phần còn lại
```

Tỷ lệ thực tế có thể lưu theo người dùng sau này.

---

# 16. `EstimateView`

Ảnh tham chiếu:

```text
D:\A VinAlpha\AlphaPMS\Ảnh\UI_View_DuToan.png
```

Bố cục:

```text
ViewHost / EstimateView
┌──────────────────────────┬─┬───────────────────────────────┐
│                          │ │    TaskEstimateItemGrid       │
│                          │ │                               │
│         TaskGrid         │S├───────────────────────────────┤
│                          │ │S                              │
│                          │ │    EstimateResourceGrid       │
└──────────────────────────┴─┴───────────────────────────────┘
                           ^ ^
                           │ └ HorizontalBlockSplitter
                           └ VerticalBlockSplitter
```

Ba Block:

```text
Block 1: TaskGrid
Block 2: TaskEstimateItemGrid
Block 3: EstimateResourceGrid
```

`EstimateDetailStack` chỉ là Layout Group chứa Block 2 và Block 3.

Tham chiếu default:

```text
TaskGrid: khoảng 38–42% chiều rộng
Estimate detail: phần còn lại

TaskEstimateItemGrid: khoảng 45–55% chiều cao vùng phải
EstimateResourceGrid: phần còn lại
```

Không hard-code tỷ lệ vào từng Block.

---

# 17. Bốn Block nghiệp vụ đã chuẩn hóa tên

## 17.1. `TaskGrid`

Vai trò:

- hiển thị cây `TaskItem`;
- WBS;
- hierarchy;
- thêm/sửa/xóa;
- reorder;
- selection;
- copy/paste;
- inline edit;
- column visibility.

**Chỉ có một implementation.**

Dùng chung trong:

```text
ScheduleView
EstimateView
```

Nguồn dữ liệu:

```text
TaskItem[]
```

Không tồn tại `ScheduleTaskGrid` và `EstimateTaskGrid`.

---

## 17.2. `GanttTimeline`

Vai trò:

- trình bày `TaskItem` theo thời gian;
- task bar;
- summary bar;
- dependency;
- timeline/calendar;
- selected task synchronization.

Chỉ xuất hiện trong `ScheduleView` ở phạm vi hiện tại.

---

## 17.3. `TaskEstimateItemGrid`

Vai trò:

```text
selected TaskItem
    -> TaskEstimateItem[]
```

Hiển thị/quản lý các công tác dự toán thuộc TaskItem đang chọn.

Không render WBS TaskItem.

---

## 17.4. `EstimateResourceGrid`

Hai mode:

```text
TaskEstimateItem
    -> TaskEstimateResource

TaskItem
    -> TaskItemResource
```

Vai trò:

- hao phí chi tiết;
- tài nguyên tổng hợp;
- Material/Labor/Machine.

---

# 18. Data flow giữa các Block

## Schedule

```text
TaskItem[]
    ├── TaskGrid
    └── GanttTimeline
```

Shared state quan trọng:

```text
selectedTaskItemId
visibleTaskItems
tree/collapse context phù hợp
```

---

## Estimate

```text
TaskItem[]
    ↓
TaskGrid
    ↓ selectedTaskItemId
TaskEstimateItemGrid
    ↓ selectedTaskEstimateItemId
EstimateResourceGrid
```

Domain relation:

```text
TaskItem
├── TaskItemResource[]
└── TaskEstimateItem[]
    └── TaskEstimateResource[]
```

Block không tạo bản sao dữ liệu domain chỉ để hiển thị ở View khác.

---

# 19. `TaskGrid` — quy tắc bắt buộc

Tên chuẩn:

```text
TaskGrid
```

Các tên legacy cần tránh:

```text
GridTask
ScheduleGrid
ScheduleTaskGrid
EstimateTaskGrid
WbsGrid
```

## 19.1. Một implementation

Schedule và Estimate dùng cùng:

- component;
- WBS tree engine;
- action logic;
- selection;
- copy/paste;
- drag/reorder;
- inline edit;
- column engine;
- data source.

## 19.2. Column groups

Chuẩn:

```text
basic
schedule
estimate
resource
```

### Basic

Tối thiểu:

```text
STT / WBS theo model thực tế
Tác vụ
Tên công việc
Đơn vị
```

`Đơn vị` thuộc Basic.

### Schedule

```text
Thời lượng
Bắt đầu
Kết thúc
Trước
Tình trạng
```

### Estimate

Tối thiểu hiện tại:

```text
Khối lượng
```

### Resource

Hiện tại:

```text
Hệ số CM
NCLM
NCCH
```

Các field phải bám model thực tế và tài liệu nghiệp vụ.

---

# 20. Column Engine — quy tắc chống lệch cột

Header và body phải dùng cùng một:

```text
visibleColumns[]
```

Luồng chuẩn:

```text
allColumns
    ↓
visibleColumns
    ├── header
    ├── body cells
    ├── grid-template-columns
    ├── width
    ├── selection mapping
    ├── copy mapping
    └── paste mapping
```

Không được:

- thêm header nhưng quên thêm body cell;
- map meaning bằng index cứng;
- render body bằng một danh sách cell hard-code khác với header.

Mỗi cột cần `id` ổn định.

Lỗi kiểu:

```text
Header Đơn vị -> dữ liệu Thời lượng
Header Thời lượng -> dữ liệu Bắt đầu
```

phải được xem là lỗi Column Engine, không chỉ là lỗi hiển thị một cell.

---

# 21. State ownership

## App-level UI state

Ví dụ:

```text
sidebarMode
activeView
projectContext
```

## Shared domain state

Ví dụ:

```text
TaskItem[]
selectedTaskItemId
```

`selectedTaskItemId` nên được giữ khi chuyển:

```text
ScheduleView -> EstimateView
```

để người dùng vẫn đứng đúng Task đang làm việc.

## View layout state

Ví dụ:

```text
ScheduleViewLayout
- taskGridVisible
- ganttVisible
- taskGridWidth

EstimateViewLayout
- taskGridVisible
- estimateItemGridVisible
- resourceGridVisible
- taskGridWidth
- estimateTopHeight
```

## Block local UI state

Ví dụ:

```text
cellSelection
editingCell
scrollPosition
columnResize
activeTab
temporaryDragState
```

Domain state không được nhân bản theo từng View.

---

# 22. Scroll ownership

Mỗi Block quản lý scroll nội bộ của mình.

Không để View dùng DOM query ngẫu nhiên để điều khiển Block khác nếu có thể thiết kế contract/state rõ ràng.

Riêng `ScheduleView` cần đồng bộ hàng giữa:

```text
TaskGrid
GanttTimeline
```

Việc đồng bộ phải được coi là layout/shared interaction contract, không làm hai Block thành một component.

---

# 23. Quy tắc icon

Sidebar icon:

```text
visual box ≈ 24 × 24 px
```

Quy định:

- một hệ icon thống nhất;
- không trộn emoji/Unicode/SVG tùy tiện;
- active state phải có background/indicator;
- icon không phải nguồn xác định loại View.

---

# 24. Bản đồ UI chuẩn hiện tại

```text
AlphaPMS
│
├── AppSidebar
│   ├── SidebarHeader
│   │   ├── AppBrand
│   │   └── SidebarToggle
│   │
│   ├── SidebarNavigation
│   │   └── PrimaryNavigation
│   │
│   └── SidebarFooter
│       ├── SettingsEntry
│       └── UserSummary
│
└── AppMain
    ├── AppHeader
    ├── AppToolbar
    ├── ViewHost
    │   │
    │   ├── ScheduleView
    │   │   ├── TaskGrid
    │   │   ├── VerticalBlockSplitter
    │   │   └── GanttTimeline
    │   │
    │   └── EstimateView
    │       ├── TaskGrid
    │       ├── VerticalBlockSplitter
    │       └── EstimateDetailStack          [Layout Group]
    │           ├── TaskEstimateItemGrid
    │           ├── HorizontalBlockSplitter
    │           └── EstimateResourceGrid
    │
    └── AppStatusBar
```

---

# 25. Quy tắc sử dụng tên khi trao đổi

Sau khi một đối tượng đã được định nghĩa trong `UI.md`, khi giao việc phải dùng đúng tên.

Ví dụ:

Đúng:

```text
Sửa padding của ViewHost.
Tăng minWidth của TaskGrid.
Sửa HorizontalBlockSplitter trong EstimateView.
Ẩn GanttTimeline.
Sửa SidebarNavigation.
Sửa cột Đơn vị của basicColumns trong TaskGrid.
```

Tránh:

```text
Sửa khối bên trái.
Sửa grid dự toán.
Sửa cái bảng tiến độ.
Sửa thanh dưới.
Sửa div ở giữa.
```

Nếu yêu cầu không rõ tên đối tượng, Codex phải đối chiếu `UI.md` trước khi sửa.

---

# 26. Nguyên tắc tổ chức code theo bản đồ UI

Mục tiêu kiến trúc:

```text
components/
├── app-sidebar/
│   └── AppSidebar.tsx
│
├── task-grid/
│   ├── TaskGrid.tsx
│   └── columns/
│
├── gantt/
│   └── GanttTimeline.tsx
│
└── estimate/
    ├── TaskEstimateItemGrid.tsx
    └── EstimateResourceGrid.tsx

views/
├── ScheduleView.tsx
└── EstimateView.tsx
```

Đường dẫn thực tế có thể theo convention hiện hữu, nhưng ranh giới trách nhiệm phải tương đương.

Không tạo hai implementation của cùng Block.

---

# 27. Quy tắc dành cho Codex trước khi chỉnh UI

Khi nhận yêu cầu sửa UI:

1. Đọc `Docs/Readme.md`.
2. Đọc `Docs/UI.md`.
3. Nếu liên quan Dự toán, đọc `Docs/Dutoan.md`.
4. Xác định yêu cầu đang tác động:
   - View;
   - Block;
   - Region;
   - Control;
   - domain state.
5. Tìm component implementation hiện tại.
6. Kiểm tra có duplicate implementation cùng Block hay không.
7. Không tự tạo Block mới nếu đối tượng đã tồn tại trong `UI.md`.
8. Không copy component giữa hai View.
9. Nếu code hiện tại mâu thuẫn `UI.md`, báo rõ trước khi refactor diện rộng.
10. Sau sửa phải test các View khác đang dùng cùng Block.

---

# 28. Trạng thái tài liệu

Các tên và ranh giới sau được coi là **đã thống nhất**:

```text
AppSidebar
SidebarHeader
SidebarNavigation
SidebarFooter

AppMain
AppHeader
AppToolbar
ViewHost
AppStatusBar

ScheduleView
EstimateView

TaskGrid
GanttTimeline
TaskEstimateItemGrid
EstimateResourceGrid

VerticalBlockSplitter
HorizontalBlockSplitter
EstimateDetailStack
```

Các đặc tả chi tiết sâu hơn bên trong từng Block sẽ được bổ sung khi tiếp tục thiết kế.

Không thay đổi tên chuẩn trên trong code/tài liệu nếu chưa có quyết định mới của chủ dự án.
