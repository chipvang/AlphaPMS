# AlphaPMS Backend

## Chạy local

```powershell
dotnet tool restore
dotnet restore AlphaPMS.sln
dotnet tool run dotnet-ef database update --project src/AlphaPMS.Infrastructure --startup-project src/AlphaPMS.Api
dotnet run --project src/AlphaPMS.Api --urls http://localhost:5080
```

Frontend dùng `NEXT_PUBLIC_API_BASE_URL=http://localhost:5080` và chạy từ thư mục `Code` bằng `pnpm dev`.

Production đặt `Database__Provider=PostgreSql` và `ConnectionStrings__AlphaPms` bằng secret. Tạo/test migration PostgreSQL riêng trước khi deploy.
