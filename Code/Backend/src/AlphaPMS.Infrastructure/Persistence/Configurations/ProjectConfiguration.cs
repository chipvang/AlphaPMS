using AlphaPMS.Domain.Projects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlphaPMS.Infrastructure.Persistence.Configurations;

internal sealed class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("projects");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code").HasMaxLength(50).IsRequired();
        builder.HasIndex(x => x.Code).IsUnique().HasDatabaseName("ux_projects_code");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
        builder.Property(x => x.Description).HasColumnName("description").HasMaxLength(2000).IsRequired();
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.StartDate).HasColumnName("start_date");
        builder.Property(x => x.FinishDate).HasColumnName("finish_date");
        builder.Property(x => x.Investor).HasColumnName("investor").HasMaxLength(300);
        builder.Property(x => x.Location).HasColumnName("location").HasMaxLength(500);
        builder.Property(x => x.Manager).HasColumnName("manager").HasMaxLength(200);
        builder.Property(x => x.Budget).HasColumnName("budget").HasPrecision(18, 2);
        builder.Property(x => x.ProgressPercent).HasColumnName("progress_percent").HasPrecision(5, 2);
        builder.Property(x => x.IsVisible).HasColumnName("is_visible");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasMany(x => x.WorkItems).WithOne(x => x.Project).HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.TaskDependencies).WithOne(x => x.Project).HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
    }
}
