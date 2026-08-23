using AlphaPMS.Application.Abstractions;
using AlphaPMS.Application.Common;
using AlphaPMS.Application.Projects;
using AlphaPMS.Domain.Projects;
using AppException = AlphaPMS.Application.Common.ApplicationException;

namespace AlphaPMS.Application.Tests;

public sealed class DependencyServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 23, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Creates_valid_dependency()
    {
        var setup = CreateSetup();
        var result = await setup.Service.CreateDependencyAsync(setup.ProjectA.Id,
            new(setup.TaskA.Id, setup.TaskB.Id, "FS", 0), default);
        Assert.Equal("FS", result.DependencyType);
    }

    [Fact]
    public async Task Rejects_duplicate_dependency()
    {
        var setup = CreateSetup();
        await setup.Service.CreateDependencyAsync(setup.ProjectA.Id, new(setup.TaskA.Id, setup.TaskB.Id, "FS", 0), default);
        var error = await Assert.ThrowsAsync<AppException>(() => setup.Service.CreateDependencyAsync(setup.ProjectA.Id, new(setup.TaskA.Id, setup.TaskB.Id, "FS", 0), default));
        Assert.Equal("DEPENDENCY_DUPLICATE", error.Code);
    }

    [Fact]
    public async Task Rejects_cross_project_dependency()
    {
        var setup = CreateSetup();
        var error = await Assert.ThrowsAsync<AppException>(() => setup.Service.CreateDependencyAsync(setup.ProjectA.Id,
            new(setup.TaskA.Id, setup.OtherProjectTask.Id, "FS", 0), default));
        Assert.Equal("DEPENDENCY_CROSS_PROJECT", error.Code);
    }

    [Fact]
    public async Task Rejects_dependency_cycle()
    {
        var setup = CreateSetup();
        await setup.Service.CreateDependencyAsync(setup.ProjectA.Id, new(setup.TaskA.Id, setup.TaskB.Id, "FS", 0), default);
        var error = await Assert.ThrowsAsync<AppException>(() => setup.Service.CreateDependencyAsync(setup.ProjectA.Id,
            new(setup.TaskB.Id, setup.TaskA.Id, "FS", 0), default));
        Assert.Equal("DEPENDENCY_CYCLE", error.Code);
    }

    private static Setup CreateSetup()
    {
        var repository = new FakeRepository();
        var projectA = new Project(Guid.NewGuid(), "A", "Dự án A", Now);
        var projectB = new Project(Guid.NewGuid(), "B", "Dự án B", Now);
        repository.Projects.AddRange([projectA, projectB]);
        var taskA = new WorkItem(Guid.NewGuid(), projectA.Id, null, WorkItemType.Task, "A", 1, Now);
        var taskB = new WorkItem(Guid.NewGuid(), projectA.Id, null, WorkItemType.Task, "B", 2, Now);
        var other = new WorkItem(Guid.NewGuid(), projectB.Id, null, WorkItemType.Task, "C", 1, Now);
        repository.WorkItems.AddRange([taskA, taskB, other]);
        return new(new DependencyService(repository, new FixedClock()), projectA, taskA, taskB, other);
    }

    private sealed record Setup(DependencyService Service, Project ProjectA, WorkItem TaskA, WorkItem TaskB, WorkItem OtherProjectTask);
    private sealed class FixedClock : IClock { public DateTimeOffset UtcNow => Now; }

    private sealed class FakeRepository : IAlphaPmsRepository
    {
        public List<Project> Projects { get; } = [];
        public List<WorkItem> WorkItems { get; } = [];
        public List<TaskDependency> Dependencies { get; } = [];
        public Task<IReadOnlyList<Project>> GetProjectsAsync(CancellationToken c) => Task.FromResult<IReadOnlyList<Project>>(Projects);
        public Task<Project?> GetProjectAsync(Guid id, CancellationToken c) => Task.FromResult(Projects.FirstOrDefault(x => x.Id == id));
        public Task<bool> ProjectCodeExistsAsync(string code, Guid? exceptId, CancellationToken c) => Task.FromResult(Projects.Any(x => x.Code == code && x.Id != exceptId));
        public void AddProject(Project project) => Projects.Add(project);
        public void RemoveProject(Project project) => Projects.Remove(project);
        public Task<IReadOnlyList<WorkItem>> GetProjectWorkItemsAsync(Guid projectId, CancellationToken c) => Task.FromResult<IReadOnlyList<WorkItem>>(WorkItems.Where(x => x.ProjectId == projectId).ToList());
        public Task<WorkItem?> GetWorkItemAsync(Guid id, CancellationToken c) => Task.FromResult(WorkItems.FirstOrDefault(x => x.Id == id));
        public void AddWorkItem(WorkItem item) => WorkItems.Add(item);
        public void RemoveWorkItem(WorkItem item) => WorkItems.Remove(item);
        public void RemoveWorkItems(IEnumerable<WorkItem> items) { foreach (var item in items.ToList()) WorkItems.Remove(item); }
        public Task<IReadOnlyList<TaskDependency>> GetProjectDependenciesAsync(Guid projectId, CancellationToken c) => Task.FromResult<IReadOnlyList<TaskDependency>>(Dependencies.Where(x => x.ProjectId == projectId).ToList());
        public Task<TaskDependency?> GetDependencyAsync(Guid id, CancellationToken c) => Task.FromResult(Dependencies.FirstOrDefault(x => x.Id == id));
        public void AddDependency(TaskDependency dependency) => Dependencies.Add(dependency);
        public void RemoveDependency(TaskDependency dependency) => Dependencies.Remove(dependency);
        public Task SaveChangesAsync(CancellationToken c) => Task.CompletedTask;
        public Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> operation, CancellationToken c) => operation(c);
    }
}
