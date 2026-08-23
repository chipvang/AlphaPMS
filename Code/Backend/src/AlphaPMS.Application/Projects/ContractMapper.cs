using AlphaPMS.Application.Common;
using AlphaPMS.Domain.Projects;

namespace AlphaPMS.Application.Projects;

internal static class ContractMapper
{
    private static readonly Dictionary<ProjectStatus, string> ProjectStatusToText = new()
    {
        [ProjectStatus.Preparing] = "Chuẩn bị", [ProjectStatus.InProgress] = "Đang thực hiện",
        [ProjectStatus.Paused] = "Tạm dừng", [ProjectStatus.Completed] = "Hoàn thành"
    };

    public static ProjectStatus ParseStatus(string value) => ProjectStatusToText.FirstOrDefault(x => x.Value == value).Key switch
    {
        var status when ProjectStatusToText[status] == value => status,
        _ => throw Validation("PROJECT_STATUS", "Trạng thái dự án không hợp lệ.")
    };

    public static WorkItemType ParseWorkItemType(string value) => value switch
    {
        "workItem" or "workPackage" => WorkItemType.WorkPackage,
        "group" => WorkItemType.Group,
        "task" => WorkItemType.Task,
        _ => throw Validation("WORK_ITEM_TYPE", "Loại công việc không hợp lệ.")
    };

    public static string ToText(WorkItemType value) => value switch
    {
        WorkItemType.WorkPackage => "workItem", WorkItemType.Group => "group", WorkItemType.Task => "task", _ => ""
    };

    public static DependencyType ParseDependencyType(string value) => Enum.TryParse<DependencyType>(value, true, out var result)
        ? result : throw Validation("DEPENDENCY_TYPE", "Loại quan hệ phải là FS, SS, FF hoặc SF.");

    public static DateOnly? ParseDate(string? value, string code)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return DateOnly.TryParseExact(value, "yyyy-MM-dd", out var result)
            ? result : throw Validation(code, "Ngày phải có định dạng YYYY-MM-DD.");
    }

    public static ProjectDto ToDto(Project project) => new(project.Id, project.Code, project.Name, project.Investor,
        project.Location, project.Manager, FormatDate(project.StartDate), FormatDate(project.FinishDate), project.Budget,
        project.ProgressPercent, ProjectStatusToText[project.Status], project.Description, project.IsVisible,
        project.CreatedAt, project.UpdatedAt);

    public static WorkItemDto ToDto(WorkItem item) => new(item.Id, item.ProjectId, item.ParentId, ToText(item.ItemType),
        item.Name, item.Unit, item.Quantity, item.Duration, FormatDate(item.StartDate), FormatDate(item.FinishDate),
        item.ProgressPercent, item.MachineShiftFactor, item.Nclm, item.PermanentLabor, item.SortOrder, item.CreatedAt, item.UpdatedAt);

    public static TaskDependencyDto ToDto(TaskDependency item) => new(item.Id, item.ProjectId, item.PredecessorTaskId,
        item.SuccessorTaskId, item.DependencyType.ToString(), item.LagDays, item.CreatedAt, item.UpdatedAt);

    private static string FormatDate(DateOnly? date) => date?.ToString("yyyy-MM-dd") ?? "";
    private static Common.ApplicationException Validation(string code, string message) => new(code, message, ApplicationErrorKind.Validation);
}
