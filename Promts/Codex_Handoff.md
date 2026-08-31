# Codex Handoff - 2026-08-31

## Muc dich

File nay luu lai trang thai lam viec trong ngay 2026-08-31 de khi mo AlphaPMS tren may khac co the doc nhanh va tiep tuc dung mach.

Phan dang lam: **Du toan**.

Nguoi dung yeu cau phat trien phan Du toan trong cuoc chat nay, gom:

- Tra cuu dinh muc.
- Hien thi thong tin du toan.
- Sua thong tin phan du toan.
- Ghi nhan cac trao doi va quy dinh vao tai lieu Du toan.

## Workspace

- Thu muc goc: `D:\A VinAlpha\AlphaPMS`
- Ma nguon: `D:\A VinAlpha\AlphaPMS\Code`
- Tai lieu: `D:\A VinAlpha\AlphaPMS\Docs`
- Shell dang dung: PowerShell
- Ngay lam viec: 2026-08-31
- Mui gio: Asia/Bangkok

## Tai lieu da doc

Da doc cac file sau trong `Docs`:

- `Readme.md`
- `Giao_Dien_DuToan_V1.md`
- `Mo_ta_phan_mem_V1.md`
- `Dutoan.md`

Ghi chu: luc kiem tra, `Docs/Dutoan.md` da ton tai nhung dang la file moi chua duoc Git theo doi.

## Trang thai Git luc handoff

Trong `Code`, lenh:

```powershell
git -C "D:\A VinAlpha\AlphaPMS\Code" status --short
```

tra ve:

```text
?? ../Docs/Dutoan.md
```

Nghia la:

- Chua thay co thay doi code trong `Code`.
- `Docs/Dutoan.md` dang untracked tu goc nhin repo `Code`.
- Khong duoc tu y xoa, doi ten, hay ghi de `Dutoan.md` neu chua kiem tra lai voi nguoi dung.

## Quy tac bat buoc cua du an

Can tuan thu `Docs/Readme.md` va `AGENTS.md`:

- Truoc khi phan tich, thiet ke, sua code: doc `Docs/Readme.md` va dac ta lien quan.
- Tai lieu nghiep vu va giao dien viet bang tieng Viet.
- Ten bien, ham, model, API, bang va truong du lieu viet bang tieng Anh.
- Khong tu thay doi kien truc, model goc hoac schema khi chua co dac ta duoc chot.
- Noi dung chua chot phai ghi ro la **De xuat** hoac **Chua chot**.
- Khi nguoi phu trach noi **"chot"**, moi chuyen noi dung tu thao luan thanh quy dinh chinh thuc.
- Sau khi sua code, chay `pnpm lint` va `pnpm build` hoac kiem tra tuong duong.
- Font caption, label va noi dung grid khong nho hon `10px`; component moi dung token `--ui-min-font-size`.

## Diem nen ghi nho ve uu tien tai lieu

Thu tu uu tien hien tai:

1. `Readme.md` la quy tac goc cua du an.
2. `Giao_Dien_DuToan_V1.md` la dac ta giao dien Du toan V1 da chot.
3. `Mo_ta_phan_mem_V1.md` la mo ta tong the san pham, co mot so noi dung cu hon.
4. `Dutoan.md` la tai lieu nhap dang tong hop nghiep vu Du toan va se duoc cap nhat theo trao doi.

Neu co khac nhau giua `Giao_Dien_DuToan_V1.md` va `Mo_ta_phan_mem_V1.md`, uu tien `Giao_Dien_DuToan_V1.md` cho giao dien V1.

Vi du: giao dien Du toan V1 dung bo cuc 3 khoi doc cung hien thi, khong uu tien mo cua so rieng theo mo ta cu.

## Nen hieu phan Du toan nhu sau

Phan Du toan khong chi la tinh tien. Trong V1, trong tam la:

```text
Khoi luong cong viec
    -> Cong tac du toan / dinh muc
    -> Hao phi vat lieu, nhan cong, may
    -> Nhu cau tai nguyen cua cong tac tien do
    -> Phan bo tai nguyen theo thoi gian
    -> Bieu do tai nguyen
    -> Phuc vu lap va theo doi tien do
```

Gia, don gia, thanh tien la huong mo rong can de san duong, nhung chua phai trong tam nghiep vu V1.

## Thuat ngu va quan he dang dung

Thuat ngu chinh:

- `TaskItem`: cong tac tien do, nam tren WBS/Gantt.
- `TaskEstimateItem`: cong tac du toan truc thuoc `TaskItem`.
- `TaskEstimateResource`: hao phi tai nguyen cua mot `TaskEstimateItem`.
- `TaskItemResource`: tai nguyen da tong hop cua mot `TaskItem`, dung cho tien do va bieu do tai nguyen.

Quan he nen giu:

```text
TaskItem
    -> 1..n TaskEstimateItem

TaskEstimateItem
    -> 1..n TaskEstimateResource

TaskItem
    -> 0..n TaskItemResource
```

Nguyen tac quan trong:

- Khong tao cay du toan doc lap.
- Dung chung cay WBS voi tien do.
- Mot `TaskItem` co the co nhieu `TaskEstimateItem`.
- Khong co loai du lieu rieng "cong tac gop".
- `TaskEstimateItem` khong tao dong Gantt rieng.
- Khong cong khoi luong khac don vi cua cac `TaskEstimateItem`.
- Tong hop tai nguyen phai dua tren khoa on dinh nhu `resource_id`, khong dua rieng vao ten hien thi.
- Dinh muc nguon khong bi sua truc tiep khi nguoi dung sua du lieu du an; can copy hao phi nguon thanh du lieu du an.

## Giao dien Du toan V1 da chot

`Giao_Dien_DuToan_V1.md` chot mo hinh 3 khoi hien thi dong thoi theo chieu doc:

1. Khoi 1: cay cong tac tien do va gia tri tong hop.
2. Khoi 2: danh sach `TaskEstimateItem` cua `TaskItem` dang chon.
3. Khoi 3: tai nguyen cua `TaskEstimateItem` dang chon.

Toolbar tong quat V1:

- Them cong tac.
- Tra dinh muc.
- Nhap BOQ.
- Lien ket tien do.
- Loc.
- Lich su.
- Xuat Excel.
- Luu.

Khoi 3 co 3 nhom/tabs:

- Vat lieu.
- Nhan cong.
- May.

Can can nhac bo sung che do xem tong hop `TaskItemResource` ben canh che do xem chi tiet `TaskEstimateResource`, vi `Dutoan.md` da neu nhu mot nhu cau quan sat quan trong.

## Cong thuc dang tam dung

Cong thuc khoi luong co ban trong UI doc:

```text
quantity = component_count * length * width * height * coefficient + additional_quantity
```

Cong thuc nhu cau tai nguyen dang tam dung:

```text
EstimateResourceQuantity
    = TaskEstimateItem.Quantity
    * TaskEstimateResource.AdjustedConsumptionRate
    * ResourceCoefficient
```

Chua chot:

- Cong thuc khoi luong nang cao nhieu dong.
- Quy tac lam tron.
- He so nam o cap nao la chinh: cap cong tac du toan, cap tai nguyen, hay ca hai.
- Co che cache/tinh lai `TaskItemResource`.

## Tra cuu dinh muc

Yeu cau tim kiem:

- Tim chinh xac theo ma.
- Tim ma bat dau bang tu khoa.
- Tim theo ten cong tac.
- Tim nhieu tu khoa.
- Ho tro tieng Viet co dau va khong dau.
- Co loc theo bo dinh muc/chuong/nhom cong tac neu du lieu cho phep.

API khong nen tai toan bo danh muc len UI cung luc. Ket qua goi y khoang 30-50 dong. Chi tiet hao phi tai nguyen chi can tai khi nguoi dung chon mot cong tac dinh muc.

## Noi dung con chua chot

Can thao luan tiep:

- Chon mot hay nhieu ma dinh muc trong mot lan tra.
- Cau truc phan nhom dinh muc thuc te theo bo du lieu nap vao.
- Cac cot hien thi mac dinh o Khoi 2 va Khoi 3.
- Cach chuyen giua xem chi tiet `TaskEstimateResource` va xem tong hop `TaskItemResource`.
- Trang thai du lieu du toan cua `TaskItem` va mau/canh bao tuong ung.
- Quy tac tinh lai, cache va dong bo bieu do tai nguyen.
- Gia tai nguyen, don gia va thanh tien se de san o muc nao trong V1.
- Khoa/phat hanh du lieu du toan sau khi chot tien do hoặc du toan.

## Viec nen lam tiep

Khi tiep tuc tren may khac:

1. Doc lai `Docs/Readme.md`.
2. Doc `Docs/Giao_Dien_DuToan_V1.md`.
3. Doc `Docs/Mo_ta_phan_mem_V1.md`.
4. Doc `Docs/Dutoan.md`.
5. Kiem tra Git status trong `Code`.
6. Tiep tuc trao doi voi nguoi dung de chot tung quy dinh vao `Dutoan.md`.

Huong trao doi nen bat dau:

- Chot luong **Tra dinh muc**.
- Sau do chot cach hien thi/sua **TaskEstimateItem**.
- Tiep theo chot cach hien thi/sua **TaskEstimateResource** va tong hop **TaskItemResource**.
- Cuoi cung moi chot model du lieu, DB/API va code.

## Trang thai ket luan trong ngay

Da doc va tong hop boi canh tai lieu cho phan Du toan.

Chua code.

Chua sua file code.

Da tao file handoff nay de tiep tuc cong viec tren may khac.
