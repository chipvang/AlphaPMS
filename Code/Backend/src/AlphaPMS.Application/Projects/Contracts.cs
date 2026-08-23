namespace AlphaPMS.Application.Projects;

public sealed record ProjectDto(Guid Id, string Code, string Name, string Investor, string Location, string Manager,
    string StartDate, string FinishDate, decimal Budget, decimal Progress, string Status, string Description,
    bool Visible, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public sealed record ProjectInput(string Code, string Name, string? Investor, string? Location, string? Manager,
    string? StartDate, string? FinishDate, decimal Budget, decimal Progress, string Status, string? Description, bool Visible);

public sealed record WorkItemDto(Guid Id, Guid ProjectId, Guid? ParentId, string Type, string Name, string? Unit,
    decimal? Quantity, int Duration, string StartDate, string FinishDate, decimal Progress,
    decimal? MachineShiftFactor, decimal? Nclm, decimal? PermanentLabor, int SortOrder,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public sealed record WorkItemInput(Guid? Id, Guid? ProjectId, Guid? ParentId, string Type, string Name, string? Unit,
    decimal? Quantity, int Duration, string? StartDate, string? FinishDate, decimal Progress, int SortOrder,
    decimal? MachineShiftFactor = null, decimal? Nclm = null, decimal? PermanentLabor = null);

public sealed record ReplaceWorkItemsInput(IReadOnlyList<WorkItemInput> Items);

public sealed record TaskDependencyDto(Guid Id, Guid ProjectId, Guid PredecessorTaskId, Guid SuccessorTaskId,
    string DependencyType, int LagDays, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public sealed record TaskDependencyInput(Guid PredecessorTaskId, Guid SuccessorTaskId, string DependencyType, int LagDays);

public sealed record ReplaceDependenciesInput(IReadOnlyList<TaskDependencyInput> Items);

public sealed record ProjectScheduleInput(IReadOnlyList<WorkItemInput> WorkItems,
    IReadOnlyList<TaskDependencyInput> Dependencies);

public sealed record ProjectScheduleDto(IReadOnlyList<WorkItemDto> WorkItems,
    IReadOnlyList<TaskDependencyDto> Dependencies);
