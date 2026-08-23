using AlphaPMS.Application.Abstractions;
using AlphaPMS.Domain.Projects;
using Microsoft.EntityFrameworkCore;

namespace AlphaPMS.Infrastructure.Persistence;

internal sealed class AlphaPmsRepository(AlphaPmsDbContext dbContext) : IAlphaPmsRepository
{
    public async Task<IReadOnlyList<Project>> GetProjectsAsync(CancellationToken cancellationToken) =>
        await dbContext.Projects.OrderBy(x => x.Code).ToListAsync(cancellationToken);
    public Task<Project?> GetProjectAsync(Guid id, CancellationToken cancellationToken) => dbContext.Projects.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    public Task<bool> ProjectCodeExistsAsync(string code, Guid? exceptId, CancellationToken cancellationToken) =>
        dbContext.Projects.AnyAsync(x => x.Code == code && (!exceptId.HasValue || x.Id != exceptId), cancellationToken);
    public void AddProject(Project project) => dbContext.Projects.Add(project);
    public void RemoveProject(Project project) => dbContext.Projects.Remove(project);

    public async Task<IReadOnlyList<WorkItem>> GetProjectWorkItemsAsync(Guid projectId, CancellationToken cancellationToken) =>
        await dbContext.WorkItems.Where(x => x.ProjectId == projectId).OrderBy(x => x.ParentId).ThenBy(x => x.SortOrder).ToListAsync(cancellationToken);
    public Task<WorkItem?> GetWorkItemAsync(Guid id, CancellationToken cancellationToken) => dbContext.WorkItems.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    public void AddWorkItem(WorkItem workItem) => dbContext.WorkItems.Add(workItem);
    public void RemoveWorkItem(WorkItem workItem) => dbContext.WorkItems.Remove(workItem);
    public void RemoveWorkItems(IEnumerable<WorkItem> workItems) => dbContext.WorkItems.RemoveRange(workItems);

    public async Task<IReadOnlyList<TaskDependency>> GetProjectDependenciesAsync(Guid projectId, CancellationToken cancellationToken) =>
        await dbContext.TaskDependencies.Where(x => x.ProjectId == projectId).OrderBy(x => x.Id).ToListAsync(cancellationToken);
    public Task<TaskDependency?> GetDependencyAsync(Guid id, CancellationToken cancellationToken) => dbContext.TaskDependencies.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    public void AddDependency(TaskDependency dependency) => dbContext.TaskDependencies.Add(dependency);
    public void RemoveDependency(TaskDependency dependency) => dbContext.TaskDependencies.Remove(dependency);
    public Task SaveChangesAsync(CancellationToken cancellationToken) => dbContext.SaveChangesAsync(cancellationToken);

    public async Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> operation, CancellationToken cancellationToken)
    {
        if (!dbContext.Database.IsRelational()) return await operation(cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var result = await operation(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return result;
    }
}
