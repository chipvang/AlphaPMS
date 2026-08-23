using AlphaPMS.Application;
using AlphaPMS.Api.Middleware;
using AlphaPMS.Infrastructure;
using AlphaPMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context => new BadRequestObjectResult(new
    {
        error = new { code = "INVALID_REQUEST", message = "Dữ liệu gửi lên không hợp lệ.", details = context.ModelState }
    });
});
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseCors("Frontend");
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));

if (!app.Environment.IsEnvironment("Testing"))
{
    Directory.CreateDirectory(Path.Combine(app.Environment.ContentRootPath, "Data"));
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<AlphaPmsDbContext>().Database.MigrateAsync();
}

app.Run();

public partial class Program;
