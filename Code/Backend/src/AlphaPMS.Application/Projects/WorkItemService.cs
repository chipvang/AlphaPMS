using AlphaPMS.Application.Abstractions;
using AlphaPMS.Application.Common;
using AlphaPMS.Domain.Projects;

namespace AlphaPMS.Application.Projects;

public sealed class WorkItemService(IAlphaPmsRepository repository, IClock clock)
{
    public async Task<IReadOnlyList<WorkItemDto>> GetProjectWorkItemsAsync(Guid projectId, CancellationToken cancellationToken)
    {
        await EnsureProject(projectId, cancellationToken);
        return (await repository.GetProjectWorkItemsAsync(projectId, cancellationToken)).Select(ContractMapper.ToDto).ToList();
    }

    public async Task<WorkItemDto> CreateWorkItemAsync(Guid projectId, WorkItemInput input, CancellationToken cancellationToken)
    {
        await EnsureProject(projectId, cancellationToken);
        var existing = await repository.GetProjectWorkItemsAsync(projectId, cancellationToken);
        ValidateParent(input.ParentId, projectId, ContractMapper.ParseWorkItemType(input.Type), existing);
        var entity = CreateEntity(input.Id ?? Guid.NewGuid(), projectId, input);
        repository.AddWorkItem(entity);
        await repository.SaveChangesAsync(cancellationToken);
        return ContractMapper.ToDto(entity);
    }

    public async Task<WorkItemDto> UpdateWorkItemAsync(Guid id, WorkItemInput input, CancellationToken cancellationToken)
    {
        var entity = await FindWorkItem(id, cancellationToken);
        var existing = await repository.GetProjectWorkItemsAsync(entity.ProjectId, cancellationToken);
        var requestedType = ContractMapper.ParseWorkItemType(input.Type);
        ValidateParent(input.ParentId, entity.ProjectId, requestedType, existing, entity.Id);
        ValidateTaskConversion(entity, requestedType, await repository.GetProjectDependenciesAsync(entity.ProjectId, cancellationToken));
        Apply(entity, input);
        await repository.SaveChangesAsync(cancellationToken);
        return ContractMapper.ToDto(entity);
    }

    public async Task DeleteWorkItemAsync(Guid id, CancellationToken cancellationToken)
    {
        var target = await FindWorkItem(id, cancellationToken);
        var items = await repository.GetProjectWorkItemsAsync(target.ProjectId, cancellationToken);
        var deleteIds = new HashSet<Guid> { target.Id };
        var changed = true;
        while (changed)
        {
            changed = false;
            foreach (var item in items.Where(x => x.ParentId.HasValue && deleteIds.Contains(x.ParentId.Value)))
                changed |= deleteIds.Add(item.Id);
        }
        repository.RemoveWorkItems(items.Where(x => deleteIds.Contains(x.Id)).OrderByDescending(GetDepth));
        await repository.SaveChangesAsync(cancellationToken);
    }

    public Task<IReadOnlyList<WorkItemDto>> ReplaceProjectWorkItemsAsync(Guid projectId, ReplaceWorkItemsInput input, CancellationToken cancellationToken) =>
        repository.ExecuteInTransactionAsync(async transactionToken =>
        {
            await EnsureProject(projectId, transactionToken);
            ValidateTree(projectId, input.Items);
            var current = await repository.GetProjectWorkItemsAsync(projectId, transactionToken);
            ValidateTaskConversions(current, input.Items, await repository.GetProjectDependenciesAsync(projectId, transactionToken));
            var currentById = current.ToDictionary(x => x.Id);
            var incomingIds = input.Items.Select(x => x.Id!.Value).ToHashSet();
            var removedIds = current.Where(x => !incomingIds.Contains(x.Id)).Select(x => x.Id).ToHashSet();
            repository.RemoveWorkItems(current.Where(x => removedIds.Contains(x.Id)).OrderByDescending(GetDepth));
            foreach (var item in input.Items)
            {
                if (currentById.TryGetValue(item.Id!.Value, out var existing)) Apply(existing, item);
                else repository.AddWorkItem(CreateEntity(item.Id.Value, projectId, item));
            }
            await repository.SaveChangesAsync(transactionToken);
            return (IReadOnlyList<WorkItemDto>)(await repository.GetProjectWorkItemsAsync(projectId, transactionToken)).Select(ContractMapper.ToDto).ToList();
        }, cancellationToken);

    private static int GetDepth(WorkItem item)
    {
        var depth = 0;
        for (var parent = item.Parent; parent is not null; parent = parent.Parent) depth++;
        return depth;
    }

    private WorkItem CreateEntity(Guid id, Guid projectId, WorkItemInput input)
    {
        var entity = new WorkItem(id, projectId, input.ParentId, ContractMapper.ParseWorkItemType(input.Type), input.Name, input.SortOrder, clock.UtcNow);
        Apply(entity, input);
        return entity;
    }

    private void Apply(WorkItem entity, WorkItemInput input) => entity.Update(input.ParentId,
        ContractMapper.ParseWorkItemType(input.Type), input.Name, input.Unit, input.Quantity, input.Duration,
        ContractMapper.ParseDate(input.StartDate, "WORK_ITEM_START_DATE"), ContractMapper.ParseDate(input.FinishDate, "WORK_ITEM_FINISH_DATE"),
        input.Progress, input.MachineShiftFactor, input.Nclm, input.PermanentLabor, input.SortOrder, clock.UtcNow);

    private static void ValidateTree(Guid projectId, IReadOnlyList<WorkItemInput> items)
    {
        var ids = new HashSet<Guid>();
        foreach (var item in items)
        {
            if (!item.Id.HasValue || item.Id == Guid.Empty || !ids.Add(item.Id.Value))
                throw Conflict("WORK_ITEM_ID_DUPLICATE", "ID công việc thiếu hoặc bị trùng.");
            if (item.ProjectId.HasValue && item.ProjectId != projectId)
                throw Validation("WORK_ITEM_PROJECT", "Công việc không thuộc dự án đang lưu.");
        }
        foreach (var item in items)
            if (item.ParentId.HasValue && !ids.Contains(item.ParentId.Value))
                throw Validation("WORK_ITEM_PARENT_NOT_FOUND", "Không tìm thấy công việc cha trong cùng dự án.");

        var itemById = items.ToDictionary(x => x.Id!.Value);
        foreach (var item in items)
        {
            var itemType = ContractMapper.ParseWorkItemType(item.Type);
            WorkItemType? parentType = item.ParentId.HasValue
                ? ContractMapper.ParseWorkItemType(itemById[item.ParentId.Value].Type)
                : null;
            ValidateHierarchy(itemType, parentType);
        }

        var parentById = items.ToDictionary(x => x.Id!.Value, x => x.ParentId);
        foreach (var id in ids)
        {
            var visited = new HashSet<Guid>();
            Guid? cursor = id;
            while (cursor.HasValue)
            {
                if (!visited.Add(cursor.Value)) throw Conflict("WORK_ITEM_TREE_CYCLE", "Cây WBS không được chứa chu trình.");
                cursor = parentById.GetValueOrDefault(cursor.Value);
            }
        }
    }

    private static void ValidateParent(Guid? parentId, Guid projectId, WorkItemType itemType, IReadOnlyList<WorkItem> items, Guid? selfId = null)
    {
        if (!parentId.HasValue)
        {
            ValidateHierarchy(itemType, null);
            return;
        }
        var parent = items.FirstOrDefault(x => x.Id == parentId.Value);
        if (parent is null || parent.ProjectId != projectId) throw Validation("WORK_ITEM_PARENT_NOT_FOUND", "Công việc cha phải thuộc cùng dự án.");
        ValidateHierarchy(itemType, parent.ItemType);
        var parentById = items.ToDictionary(x => x.Id, x => x.ParentId);
        for (Guid? cursor = parentId; cursor.HasValue; cursor = parentById.GetValueOrDefault(cursor.Value))
            if (cursor == selfId) throw Conflict("WORK_ITEM_TREE_CYCLE", "Cây WBS không được chứa chu trình.");
    }

    private static void ValidateHierarchy(WorkItemType itemType, WorkItemType? parentType)
    {
        var isValid = itemType switch
        {
            WorkItemType.WorkPackage => parentType is null,
            WorkItemType.Group => parentType is WorkItemType.WorkPackage,
            WorkItemType.Task => parentType is WorkItemType.WorkPackage or WorkItemType.Group,
            _ => false
        };
        if (!isValid)
            throw Validation("WORK_ITEM_HIERARCHY", "Cấu trúc WBS chỉ cho phép Hạng mục ở gốc, Nhóm dưới Hạng mục và Công tác dưới Hạng mục hoặc Nhóm.");
    }

    private static void ValidateTaskConversions(IReadOnlyList<WorkItem> current, IReadOnlyList<WorkItemInput> incoming, IReadOnlyList<TaskDependency> dependencies)
    {
        var currentById = current.ToDictionary(x => x.Id);
        foreach (var input in incoming)
        {
            if (!input.Id.HasValue || !currentById.TryGetValue(input.Id.Value, out var existing)) continue;
            var requestedType = ContractMapper.ParseWorkItemType(input.Type);
            if (existing.ItemType is not WorkItemType.Task || requestedType is not WorkItemType.Group) continue;
            if (dependencies.Any(x => x.PredecessorTaskId == existing.Id || x.SuccessorTaskId == existing.Id))
                throw Conflict("WORK_ITEM_CONVERSION_DEPENDENCY", "Không thể chuyển thành Nhóm vì công tác vẫn còn quan hệ công việc.");
            if (input.Unit is not null || input.Quantity.HasValue || input.Progress != 0 || input.MachineShiftFactor.HasValue || input.Nclm.HasValue || input.PermanentLabor.HasValue)
                throw Conflict("WORK_ITEM_CONVERSION_DATA", "Không thể chuyển thành Nhóm vì dữ liệu chỉ dành cho Công tác chưa được xóa.");
        }
    }

    private static void ValidateTaskConversion(WorkItem existing, WorkItemType requestedType, IReadOnlyList<TaskDependency> dependencies)
    {
        if (existing.ItemType is not WorkItemType.Task || requestedType is not WorkItemType.Group) return;
        if (dependencies.Any(x => x.PredecessorTaskId == existing.Id || x.SuccessorTaskId == existing.Id))
            throw Conflict("WORK_ITEM_CONVERSION_DEPENDENCY", "Không thể chuyển thành Nhóm vì công tác đã có quan hệ công việc.");
        if (existing.Unit is not null || existing.Quantity.HasValue || existing.ProgressPercent != 0
            || existing.MachineShiftFactor.HasValue || existing.Nclm.HasValue || existing.PermanentLabor.HasValue)
            throw Conflict("WORK_ITEM_CONVERSION_DATA", "Không thể chuyển thành Nhóm vì công tác đã có dữ liệu nghiệp vụ riêng.");
    }

    private async Task EnsureProject(Guid id, CancellationToken cancellationToken)
    {
        if (await repository.GetProjectAsync(id, cancellationToken) is null) throw NotFound("PROJECT_NOT_FOUND", "Không tìm thấy dự án.");
    }

    private async Task<WorkItem> FindWorkItem(Guid id, CancellationToken cancellationToken) =>
        await repository.GetWorkItemAsync(id, cancellationToken) ?? throw NotFound("WORK_ITEM_NOT_FOUND", "Không tìm thấy công việc.");

    private static Common.ApplicationException Validation(string code, string message) => new(code, message, ApplicationErrorKind.Validation);
    private static Common.ApplicationException Conflict(string code, string message) => new(code, message, ApplicationErrorKind.Conflict);
    private static Common.ApplicationException NotFound(string code, string message) => new(code, message, ApplicationErrorKind.NotFound);
}
