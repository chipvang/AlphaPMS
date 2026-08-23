using AlphaPMS.Domain.Projects;
using Microsoft.EntityFrameworkCore;

namespace AlphaPMS.Infrastructure.Persistence;

public sealed class AlphaPmsDbContext(DbContextOptions<AlphaPmsDbContext> options) : DbContext(options)
{
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<TaskDependency> TaskDependencies => Set<TaskDependency>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) => modelBuilder.ApplyConfigurationsFromAssembly(typeof(AlphaPmsDbContext).Assembly);
}
