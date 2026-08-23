using AlphaPMS.Application.Common;
using AlphaPMS.Application.Projects;
using Microsoft.Extensions.DependencyInjection;

namespace AlphaPMS.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services) => services
        .AddSingleton<IClock, SystemClock>()
        .AddScoped<ProjectService>()
        .AddScoped<WorkItemService>()
        .AddScoped<DependencyService>()
        .AddScoped<ProjectScheduleService>();
}
