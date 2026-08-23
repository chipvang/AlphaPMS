using AlphaPMS.Domain.Common;

namespace AlphaPMS.Domain.Projects;

public sealed class Project
{
    private Project() { }

    public Project(Guid id, string code, string name, DateTimeOffset now)
    {
        if (id == Guid.Empty) throw new DomainException("PROJECT_ID_REQUIRED", "ID dự án không hợp lệ.");
        Id = id;
        CreatedAt = now;
        Update(code, name, "", ProjectStatus.Preparing, null, null, "", "", "", 0, 0, true, now);
    }

    public Guid Id { get; private set; }
    public string Code { get; private set; } = "";
    public string Name { get; private set; } = "";
    public string Description { get; private set; } = "";
    public ProjectStatus Status { get; private set; }
    public DateOnly? StartDate { get; private set; }
    public DateOnly? FinishDate { get; private set; }
    public string Investor { get; private set; } = "";
    public string Location { get; private set; } = "";
    public string Manager { get; private set; } = "";
    public decimal Budget { get; private set; }
    public decimal ProgressPercent { get; private set; }
    public bool IsVisible { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public ICollection<WorkItem> WorkItems { get; } = new List<WorkItem>();
    public ICollection<TaskDependency> TaskDependencies { get; } = new List<TaskDependency>();

    public void Update(string code, string name, string? description, ProjectStatus status, DateOnly? startDate,
        DateOnly? finishDate, string? investor, string? location, string? manager, decimal budget,
        decimal progressPercent, bool isVisible, DateTimeOffset now)
    {
        code = code.Trim().ToUpperInvariant();
        name = name.Trim();
        if (string.IsNullOrWhiteSpace(code)) throw new DomainException("PROJECT_CODE_REQUIRED", "Mã dự án là bắt buộc.");
        if (string.IsNullOrWhiteSpace(name)) throw new DomainException("PROJECT_NAME_REQUIRED", "Tên dự án là bắt buộc.");
        if (startDate.HasValue && finishDate.HasValue && startDate > finishDate)
            throw new DomainException("PROJECT_DATE_RANGE", "Ngày bắt đầu không được sau ngày kết thúc.");
        if (budget < 0) throw new DomainException("PROJECT_BUDGET", "Ngân sách không được âm.");
        if (progressPercent is < 0 or > 100) throw new DomainException("PROJECT_PROGRESS", "Tiến độ phải từ 0 đến 100.");

        Code = code;
        Name = name;
        Description = description?.Trim() ?? "";
        Status = status;
        StartDate = startDate;
        FinishDate = finishDate;
        Investor = investor?.Trim() ?? "";
        Location = location?.Trim() ?? "";
        Manager = manager?.Trim() ?? "";
        Budget = budget;
        ProgressPercent = progressPercent;
        IsVisible = isVisible;
        UpdatedAt = now;
    }
}
