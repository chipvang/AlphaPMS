using AlphaPMS.Application.Common;
using AlphaPMS.Domain.Common;
using Microsoft.EntityFrameworkCore;
using AppException = AlphaPMS.Application.Common.ApplicationException;

namespace AlphaPMS.Api.Middleware;

public sealed class ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try { await next(context); }
        catch (DomainException exception) { await Write(context, 400, exception.Code, exception.Message); }
        catch (AppException exception)
        {
            var status = exception.Kind switch
            {
                ApplicationErrorKind.NotFound => 404,
                ApplicationErrorKind.Conflict => 409,
                _ => 400
            };
            await Write(context, status, exception.Code, exception.Message);
        }
        catch (DbUpdateException exception)
        {
            logger.LogWarning(exception, "Database constraint conflict");
            await Write(context, 409, "DATABASE_CONFLICT", "Dữ liệu xung đột với bản ghi hiện có.");
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Unhandled API error");
            await Write(context, 500, "INTERNAL_ERROR", "Máy chủ không thể xử lý yêu cầu.");
        }
    }

    private static async Task Write(HttpContext context, int status, string code, string message)
    {
        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new { error = new { code, message } });
    }
}
