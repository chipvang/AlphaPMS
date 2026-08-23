using AlphaPMS.Domain.Projects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlphaPMS.Infrastructure.Persistence.Configurations;

internal sealed class TaskDependencyConfiguration : IEntityTypeConfiguration<TaskDependency>
{
    public void Configure(EntityTypeBuilder<TaskDependency> builder)
    {
        builder.ToTable("task_dependencies");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ProjectId).HasColumnName("project_id");
        builder.Property(x => x.PredecessorTaskId).HasColumnName("predecessor_task_id");
        builder.Property(x => x.SuccessorTaskId).HasColumnName("successor_task_id");
        builder.Property(x => x.DependencyType).HasColumnName("dependency_type").HasConversion<string>().HasMaxLength(2);
        builder.Property(x => x.LagDays).HasColumnName("lag_days");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.ProjectId).HasDatabaseName("ix_task_dependencies_project_id");
        builder.HasIndex(x => x.PredecessorTaskId).HasDatabaseName("ix_task_dependencies_predecessor");
        builder.HasIndex(x => x.SuccessorTaskId).HasDatabaseName("ix_task_dependencies_successor");
        builder.HasIndex(x => new { x.ProjectId, x.PredecessorTaskId, x.SuccessorTaskId, x.DependencyType })
            .IsUnique().HasDatabaseName("ux_task_dependencies_relation");
        builder.HasOne(x => x.PredecessorTask).WithMany().HasForeignKey(x => x.PredecessorTaskId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.SuccessorTask).WithMany().HasForeignKey(x => x.SuccessorTaskId).OnDelete(DeleteBehavior.Restrict);
    }
}
