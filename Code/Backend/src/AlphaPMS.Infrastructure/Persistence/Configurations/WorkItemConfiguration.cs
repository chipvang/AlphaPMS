using AlphaPMS.Domain.Projects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AlphaPMS.Infrastructure.Persistence.Configurations;

internal sealed class WorkItemConfiguration : IEntityTypeConfiguration<WorkItem>
{
    public void Configure(EntityTypeBuilder<WorkItem> builder)
    {
        builder.ToTable("work_items");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ProjectId).HasColumnName("project_id");
        builder.Property(x => x.ParentId).HasColumnName("parent_id");
        builder.Property(x => x.ItemType).HasColumnName("item_type").HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(500).IsRequired();
        builder.Property(x => x.Unit).HasColumnName("unit").HasMaxLength(50);
        builder.Property(x => x.Quantity).HasColumnName("quantity").HasPrecision(18, 4);
        builder.Property(x => x.Duration).HasColumnName("duration");
        builder.Property(x => x.StartDate).HasColumnName("start_date");
        builder.Property(x => x.FinishDate).HasColumnName("finish_date");
        builder.Property(x => x.ProgressPercent).HasColumnName("progress_percent").HasPrecision(5, 2);
        builder.Property(x => x.MachineShiftFactor).HasColumnName("machine_shift_factor").HasPrecision(18, 4);
        builder.Property(x => x.Nclm).HasColumnName("nclm").HasPrecision(18, 4);
        builder.Property(x => x.PermanentLabor).HasColumnName("permanent_labor").HasPrecision(18, 4);
        builder.Property(x => x.SortOrder).HasColumnName("sort_order");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.ProjectId).HasDatabaseName("ix_work_items_project_id");
        builder.HasIndex(x => x.ParentId).HasDatabaseName("ix_work_items_parent_id");
        builder.HasIndex(x => new { x.ProjectId, x.ParentId, x.SortOrder }).HasDatabaseName("ix_work_items_project_parent_sort");
        builder.HasOne(x => x.Parent).WithMany(x => x.Children).HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Restrict);
    }
}
