using AlphaPMS.Application.Abstractions;

namespace AlphaPMS.Application.Projects;

public sealed class ProjectScheduleService(IAlphaPmsRepository repository, WorkItemService workItemService,
    DependencyService dependencyService)
{
    public async Task<ProjectScheduleDto> GetAsync(Guid projectId, CancellationToken cancellationToken) =>
        new(await workItemService.GetProjectWorkItemsAsync(projectId, cancellationToken),
            await dependencyService.GetProjectDependenciesAsync(projectId, cancellationToken));

    public Task<ProjectScheduleDto> SaveAsync(Guid projectId, ProjectScheduleInput input,
        CancellationToken cancellationToken) => repository.ExecuteInTransactionAsync(async transactionToken =>
    {
        // Relations are cleared inside the same transaction before WBS mutation. If the proposed
        // WBS or any new relation is invalid, the transaction restores both collections.
        await dependencyService.ClearProjectDependenciesCoreAsync(projectId, transactionToken);
        var workItems = await workItemService.ReplaceProjectWorkItemsCoreAsync(projectId,
            new ReplaceWorkItemsInput(input.WorkItems), transactionToken);
        var dependencies = await dependencyService.ReplaceProjectDependenciesCoreAsync(projectId,
            new ReplaceDependenciesInput(input.Dependencies), transactionToken);
        return new ProjectScheduleDto(workItems, dependencies);
    }, cancellationToken);
}
