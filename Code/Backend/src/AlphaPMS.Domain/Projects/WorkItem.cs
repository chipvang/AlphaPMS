using AlphaPMS.Domain.Common;

namespace AlphaPMS.Domain.Projects;

public sealed class WorkItem
{
    private WorkItem() { }

    public WorkItem(Guid id, Guid projectId, Guid? parentId, WorkItemType itemType, string name, int sortOrder, DateTimeOffset now)
    {
        if (id == Guid.Empty || projectId == Guid.Empty) throw new DomainException("WORK_ITEM_ID_REQUIRED", "ID công việc hoặc dự án không hợp lệ.");
        Id = id;
        ProjectId = projectId;
        CreatedAt = now;
        Update(parentId, itemType, name, null, null, 1, null, null, 0, null, null, null, sortOrder, now);
    }

    public Guid Id { get; private set; }
    public Guid ProjectId { get; private set; }
    public Guid? ParentId { get; private set; }
    public WorkItemType ItemType { get; private set; }
    public string Name { get; private set; } = "";
    public string? Unit { get; private set; }
    public decimal? Quantity { get; private set; }
    public int Duration { get; private set; }
    public DateOnly? StartDate { get; private set; }
    public DateOnly? FinishDate { get; private set; }
    public decimal ProgressPercent { get; private set; }
    public decimal? MachineShiftFactor { get; private set; }
    public decimal? Nclm { get; private set; }
    public decimal? PermanentLabor { get; private set; }
    public int SortOrder { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public Project Project { get; private set; } = null!;
    public WorkItem? Parent { get; private set; }
    public ICollection<WorkItem> Children { get; } = new List<WorkItem>();

    public void Update(Guid? parentId, WorkItemType itemType, string name, string? unit, decimal? quantity, int duration,
        DateOnly? startDate, DateOnly? finishDate, decimal progressPercent, decimal? machineShiftFactor,
        decimal? nclm, decimal? permanentLabor, int sortOrder, DateTimeOffset now)
    {
        if (parentId == Id) throw new DomainException("WORK_ITEM_SELF_PARENT", "Công việc không thể là cha của chính nó.");
        if (string.IsNullOrWhiteSpace(name)) throw new DomainException("WORK_ITEM_NAME_REQUIRED", "Tên công việc là bắt buộc.");
        if (duration < 1) throw new DomainException("WORK_ITEM_DURATION", "Thời lượng phải lớn hơn hoặc bằng 1.");
        if (startDate.HasValue && finishDate.HasValue && startDate > finishDate)
            throw new DomainException("WORK_ITEM_DATE_RANGE", "Ngày bắt đầu không được sau ngày kết thúc.");
        if (progressPercent is < 0 or > 100) throw new DomainException("WORK_ITEM_PROGRESS", "Tiến độ phải từ 0 đến 100.");
        if (quantity < 0 || machineShiftFactor < 0 || nclm < 0 || permanentLabor < 0)
            throw new DomainException("WORK_ITEM_NON_NEGATIVE", "Khối lượng và hệ số nguồn lực không được âm.");
        if (sortOrder < 1) throw new DomainException("WORK_ITEM_SORT_ORDER", "Thứ tự phải lớn hơn hoặc bằng 1.");

        ParentId = parentId;
        ItemType = itemType;
        Name = name.Trim();
        Unit = string.IsNullOrWhiteSpace(unit) ? null : unit.Trim();
        Quantity = quantity;
        Duration = duration;
        StartDate = startDate;
        FinishDate = finishDate;
        ProgressPercent = progressPercent;
        MachineShiftFactor = machineShiftFactor;
        Nclm = nclm;
        PermanentLabor = permanentLabor;
        SortOrder = sortOrder;
        UpdatedAt = now;
    }
}
