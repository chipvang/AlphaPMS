using AlphaPMS.Domain.Projects;

namespace AlphaPMS.Application.Abstractions;

public interface IAlphaPmsRepository
{
    Task<IReadOnlyList<Project>> GetProjectsAsync(CancellationToken cancellationToken);
    Task<Project?> GetProjectAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> ProjectCodeExistsAsync(string code, Guid? exceptId, CancellationToken cancellationToken);
    void AddProject(Project project);
    void RemoveProject(Project project);

    Task<IReadOnlyList<WorkItem>> GetProjectWorkItemsAsync(Guid projectId, CancellationToken cancellationToken);
    Task<WorkItem?> GetWorkItemAsync(Guid id, CancellationToken cancellationToken);
    void AddWorkItem(WorkItem workItem);
    void RemoveWorkItem(WorkItem workItem);
    void RemoveWorkItems(IEnumerable<WorkItem> workItems);

    Task<IReadOnlyList<TaskDependency>> GetProjectDependenciesAsync(Guid projectId, CancellationToken cancellationToken);
    Task<TaskDependency?> GetDependencyAsync(Guid id, CancellationToken cancellationToken);
    void AddDependency(TaskDependency dependency);
    void RemoveDependency(TaskDependency dependency);

    Task SaveChangesAsync(CancellationToken cancellationToken);
    Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> operation, CancellationToken cancellationToken);
}
