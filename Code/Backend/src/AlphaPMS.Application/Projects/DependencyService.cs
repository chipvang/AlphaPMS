using AlphaPMS.Application.Abstractions;
using AlphaPMS.Application.Common;
using AlphaPMS.Domain.Projects;

namespace AlphaPMS.Application.Projects;

public sealed class DependencyService(IAlphaPmsRepository repository, IClock clock)
{
    public async Task<IReadOnlyList<TaskDependencyDto>> GetProjectDependenciesAsync(Guid projectId, CancellationToken cancellationToken) =>
        (await repository.GetProjectDependenciesAsync(projectId, cancellationToken)).Select(ContractMapper.ToDto).ToList();

    public async Task<TaskDependencyDto> CreateDependencyAsync(Guid projectId, TaskDependencyInput input, CancellationToken cancellationToken)
    {
        var current = await repository.GetProjectDependenciesAsync(projectId, cancellationToken);
        var tasks = await GetEndpointTasks(input, cancellationToken);
        Validate(projectId, input, tasks, current, null);
        var entity = new TaskDependency(Guid.NewGuid(), projectId, input.PredecessorTaskId, input.SuccessorTaskId,
            ContractMapper.ParseDependencyType(input.DependencyType), input.LagDays, clock.UtcNow);
        repository.AddDependency(entity);
        await repository.SaveChangesAsync(cancellationToken);
        return ContractMapper.ToDto(entity);
    }

    public async Task<TaskDependencyDto> UpdateDependencyAsync(Guid id, TaskDependencyInput input, CancellationToken cancellationToken)
    {
        var entity = await Find(id, cancellationToken);
        var current = await repository.GetProjectDependenciesAsync(entity.ProjectId, cancellationToken);
        var tasks = await GetEndpointTasks(input, cancellationToken);
        Validate(entity.ProjectId, input, tasks, current, id);
        entity.Update(input.PredecessorTaskId, input.SuccessorTaskId, ContractMapper.ParseDependencyType(input.DependencyType), input.LagDays, clock.UtcNow);
        await repository.SaveChangesAsync(cancellationToken);
        return ContractMapper.ToDto(entity);
    }

    public async Task DeleteDependencyAsync(Guid id, CancellationToken cancellationToken)
    {
        repository.RemoveDependency(await Find(id, cancellationToken));
        await repository.SaveChangesAsync(cancellationToken);
    }

    public Task<IReadOnlyList<TaskDependencyDto>> ReplaceProjectDependenciesAsync(Guid projectId, ReplaceDependenciesInput input, CancellationToken cancellationToken) =>
        repository.ExecuteInTransactionAsync(async transactionToken =>
        {
            var current = await repository.GetProjectDependenciesAsync(projectId, transactionToken);
            var tasks = await repository.GetProjectWorkItemsAsync(projectId, transactionToken);
            var validated = new List<TaskDependency>();
            foreach (var item in input.Items)
            {
                Validate(projectId, item, tasks, validated, null);
                validated.Add(new TaskDependency(Guid.NewGuid(), projectId, item.PredecessorTaskId, item.SuccessorTaskId,
                    ContractMapper.ParseDependencyType(item.DependencyType), item.LagDays, clock.UtcNow));
            }
            foreach (var dependency in current) repository.RemoveDependency(dependency);
            foreach (var dependency in validated) repository.AddDependency(dependency);
            await repository.SaveChangesAsync(transactionToken);
            return (IReadOnlyList<TaskDependencyDto>)validated.Select(ContractMapper.ToDto).ToList();
        }, cancellationToken);

    private static void Validate(Guid projectId, TaskDependencyInput input, IReadOnlyList<WorkItem> tasks,
        IReadOnlyList<TaskDependency> dependencies, Guid? exceptId)
    {
        var predecessor = tasks.FirstOrDefault(x => x.Id == input.PredecessorTaskId);
        var successor = tasks.FirstOrDefault(x => x.Id == input.SuccessorTaskId);
        if (predecessor is null || successor is null) throw Validation("DEPENDENCY_TASK_NOT_FOUND", "Không tìm thấy công tác trước hoặc sau.");
        if (predecessor.ProjectId != projectId || successor.ProjectId != projectId) throw Validation("DEPENDENCY_CROSS_PROJECT", "Hai công tác phải thuộc cùng dự án.");
        if (predecessor.ItemType != WorkItemType.Task || successor.ItemType != WorkItemType.Task) throw Validation("DEPENDENCY_TASK_ONLY", "Quan hệ chỉ được tạo giữa hai Công tác.");
        if (input.PredecessorTaskId == input.SuccessorTaskId) throw Conflict("DEPENDENCY_SELF", "Một công tác không thể phụ thuộc chính nó.");
        if (dependencies.Any(x => x.Id != exceptId && x.PredecessorTaskId == input.PredecessorTaskId && x.SuccessorTaskId == input.SuccessorTaskId && x.DependencyType == ContractMapper.ParseDependencyType(input.DependencyType)))
            throw Conflict("DEPENDENCY_DUPLICATE", "Quan hệ công việc đã tồn tại.");

        var edges = dependencies.Where(x => x.Id != exceptId).Select(x => (x.PredecessorTaskId, x.SuccessorTaskId)).ToList();
        edges.Add((input.PredecessorTaskId, input.SuccessorTaskId));
        if (HasCycle(edges)) throw Conflict("DEPENDENCY_CYCLE", "Quan hệ công việc không được tạo chu trình.");
    }

    private static bool HasCycle(IEnumerable<(Guid From, Guid To)> edges)
    {
        var graph = edges.GroupBy(x => x.From).ToDictionary(x => x.Key, x => x.Select(y => y.To).ToList());
        var visiting = new HashSet<Guid>();
        var visited = new HashSet<Guid>();
        bool Visit(Guid node)
        {
            if (visiting.Contains(node)) return true;
            if (!visited.Add(node)) return false;
            visiting.Add(node);
            foreach (var next in graph.GetValueOrDefault(node) ?? []) if (Visit(next)) return true;
            visiting.Remove(node);
            return false;
        }
        return graph.Keys.Any(Visit);
    }

    private async Task<TaskDependency> Find(Guid id, CancellationToken cancellationToken) =>
        await repository.GetDependencyAsync(id, cancellationToken) ?? throw new Common.ApplicationException("DEPENDENCY_NOT_FOUND", "Không tìm thấy quan hệ công việc.", ApplicationErrorKind.NotFound);

    private async Task<IReadOnlyList<WorkItem>> GetEndpointTasks(TaskDependencyInput input, CancellationToken cancellationToken)
    {
        var predecessor = await repository.GetWorkItemAsync(input.PredecessorTaskId, cancellationToken);
        var successor = await repository.GetWorkItemAsync(input.SuccessorTaskId, cancellationToken);
        return new[] { predecessor, successor }.Where(x => x is not null).Cast<WorkItem>().ToList();
    }

    private static Common.ApplicationException Validation(string code, string message) => new(code, message, ApplicationErrorKind.Validation);
    private static Common.ApplicationException Conflict(string code, string message) => new(code, message, ApplicationErrorKind.Conflict);
}
