using AlphaPMS.Application.Abstractions;
using AlphaPMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AlphaPMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var provider = configuration["Database:Provider"] ?? "Sqlite";
        var connectionString = configuration.GetConnectionString("AlphaPms")
            ?? throw new InvalidOperationException("Thiếu connection string 'AlphaPms'.");

        services.AddDbContext<AlphaPmsDbContext>(options =>
        {
            if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase)) options.UseSqlite(connectionString);
            else if (provider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase)) options.UseNpgsql(connectionString);
            else throw new InvalidOperationException($"Database provider '{provider}' không được hỗ trợ.");
        });
        services.AddScoped<IAlphaPmsRepository, AlphaPmsRepository>();
        return services;
    }
}
