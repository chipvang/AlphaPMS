using AlphaPMS.Domain.Common;

namespace AlphaPMS.Domain.Projects;

public sealed class TaskDependency
{
    private TaskDependency() { }

    public TaskDependency(Guid id, Guid projectId, Guid predecessorTaskId, Guid successorTaskId,
        DependencyType dependencyType, int lagDays, DateTimeOffset now)
    {
        if (id == Guid.Empty || projectId == Guid.Empty) throw new DomainException("DEPENDENCY_ID_REQUIRED", "ID quan hệ hoặc dự án không hợp lệ.");
        Id = id;
        ProjectId = projectId;
        CreatedAt = now;
        Update(predecessorTaskId, successorTaskId, dependencyType, lagDays, now);
    }

    public Guid Id { get; private set; }
    public Guid ProjectId { get; private set; }
    public Guid PredecessorTaskId { get; private set; }
    public Guid SuccessorTaskId { get; private set; }
    public DependencyType DependencyType { get; private set; }
    public int LagDays { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public Project Project { get; private set; } = null!;
    public WorkItem PredecessorTask { get; private set; } = null!;
    public WorkItem SuccessorTask { get; private set; } = null!;

    public void Update(Guid predecessorTaskId, Guid successorTaskId, DependencyType dependencyType, int lagDays, DateTimeOffset now)
    {
        if (predecessorTaskId == Guid.Empty || successorTaskId == Guid.Empty)
            throw new DomainException("DEPENDENCY_TASK_REQUIRED", "Công tác trước và sau là bắt buộc.");
        if (predecessorTaskId == successorTaskId)
            throw new DomainException("DEPENDENCY_SELF", "Một công tác không thể phụ thuộc chính nó.");
        PredecessorTaskId = predecessorTaskId;
        SuccessorTaskId = successorTaskId;
        DependencyType = dependencyType;
        LagDays = lagDays;
        UpdatedAt = now;
    }
}
