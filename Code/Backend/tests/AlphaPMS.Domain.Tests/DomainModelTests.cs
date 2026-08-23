using AlphaPMS.Domain.Common;
using AlphaPMS.Domain.Projects;

namespace AlphaPMS.Domain.Tests;

public sealed class DomainModelTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 23, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Creates_project_with_immutable_id_and_normalized_code()
    {
        var id = Guid.NewGuid();
        var project = new Project(id, " p-01 ", "Dự án A", Now);
        Assert.Equal(id, project.Id);
        Assert.Equal("P-01", project.Code);
        Assert.Equal("Dự án A", project.Name);
    }

    [Fact]
    public void Creates_work_item_hierarchy_with_real_ids()
    {
        var projectId = Guid.NewGuid();
        var parent = new WorkItem(Guid.NewGuid(), projectId, null, WorkItemType.WorkPackage, "Hạng mục", 1, Now);
        var child = new WorkItem(Guid.NewGuid(), projectId, parent.Id, WorkItemType.Group, "Nhóm", 1, Now);
        Assert.Equal(parent.Id, child.ParentId);
        Assert.Equal(projectId, child.ProjectId);
    }

    [Fact]
    public void Rejects_self_dependency()
    {
        var taskId = Guid.NewGuid();
        var error = Assert.Throws<DomainException>(() => new TaskDependency(Guid.NewGuid(), Guid.NewGuid(), taskId, taskId, DependencyType.FS, 0, Now));
        Assert.Equal("DEPENDENCY_SELF", error.Code);
    }
}
