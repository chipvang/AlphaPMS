using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AlphaPMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace AlphaPMS.IntegrationTests;

public sealed class ApiPersistenceTests
{
    [Fact]
    public async Task Task_to_group_conversion_enforces_hierarchy_and_dependency_rules()
    {
        var databasePath = Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "Backend", "tests", "TestData", $"alphapms-convert-{Guid.NewGuid():N}.db"));
        Directory.CreateDirectory(Path.GetDirectoryName(databasePath)!);
        await using var factory = new AlphaPmsApiFactory(databasePath, resetDatabase: true);
        using var client = factory.CreateClient();
        var projectResponse = await client.PostAsJsonAsync("/api/projects", new
        {
            code = "CONVERT-01", name = "Dự án conversion", investor = "", location = "", manager = "",
            startDate = "2026-08-23", finishDate = "2026-08-30", budget = 0, progress = 0,
            status = "Chuẩn bị", description = "", visible = true
        });
        var projectId = await ReadId(projectResponse);
        var workPackageId = await CreateWorkItem(client, projectId, null, "workItem", "Hạng mục", 1);
        var convertibleTaskId = await CreateWorkItem(client, projectId, workPackageId, "task", "Công tác mới", 1);

        var converted = await PutWorkItem(client, convertibleTaskId, projectId, workPackageId, "group", "Công tác mới", 1);
        Assert.Equal(HttpStatusCode.OK, converted.StatusCode);
        using (var body = JsonDocument.Parse(await converted.Content.ReadAsStringAsync()))
        {
            Assert.Equal(convertibleTaskId, body.RootElement.GetProperty("data").GetProperty("id").GetGuid());
            Assert.Equal(workPackageId, body.RootElement.GetProperty("data").GetProperty("parentId").GetGuid());
            Assert.Equal("group", body.RootElement.GetProperty("data").GetProperty("type").GetString());
        }

        var parentGroupId = await CreateWorkItem(client, projectId, workPackageId, "group", "Nhóm cha", 2);
        var groupedTaskId = await CreateWorkItem(client, projectId, parentGroupId, "task", "Công tác trong nhóm", 1);
        var invalidHierarchy = await PutWorkItem(client, groupedTaskId, projectId, parentGroupId, "group", "Công tác trong nhóm", 1);
        Assert.Equal(HttpStatusCode.BadRequest, invalidHierarchy.StatusCode);

        var predecessorId = await CreateWorkItem(client, projectId, workPackageId, "task", "Công tác trước", 3);
        var successorId = await CreateWorkItem(client, projectId, workPackageId, "task", "Công tác sau", 4);
        var dependency = await client.PostAsJsonAsync($"/api/projects/{projectId}/dependencies", new
        {
            predecessorTaskId = predecessorId, successorTaskId = successorId, dependencyType = "FS", lagDays = 0
        });
        Assert.Equal(HttpStatusCode.Created, dependency.StatusCode);
        var invalidDependency = await PutWorkItem(client, predecessorId, projectId, workPackageId, "group", "Công tác trước", 3);
        Assert.Equal(HttpStatusCode.Conflict, invalidDependency.StatusCode);

        var taskWithDataResponse = await client.PostAsJsonAsync($"/api/projects/{projectId}/work-items", new
        {
            projectId, parentId = workPackageId, type = "task", name = "Công tác có khối lượng", unit = "m3", quantity = 10,
            duration = 1, startDate = "2026-08-23", finishDate = "2026-08-23", progress = 0, sortOrder = 5
        });
        var taskWithDataId = await ReadId(taskWithDataResponse);
        var invalidData = await PutWorkItem(client, taskWithDataId, projectId, workPackageId, "group", "Công tác có khối lượng", 5);
        Assert.Equal(HttpStatusCode.Conflict, invalidData.StatusCode);
    }

    [Fact]
    public async Task Api_persists_project_hierarchy_and_dependency_after_restart()
    {
        var databasePath = Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "Backend", "tests", "TestData", $"alphapms-{Guid.NewGuid():N}.db"));
        Directory.CreateDirectory(Path.GetDirectoryName(databasePath)!);
        Guid projectId;
        Guid parentId;
        Guid predecessorId;
        Guid successorId;
        Guid groupId;
        Guid groupedTaskId;

        await using (var factory = new AlphaPmsApiFactory(databasePath, resetDatabase: true))
        {
            using var client = factory.CreateClient();
            var projectResponse = await client.PostAsJsonAsync("/api/projects", new
            {
                code = "API-01", name = "Dự án integration", investor = "", location = "", manager = "",
                startDate = "2026-08-23", finishDate = "2026-08-30", budget = 1000, progress = 0,
                status = "Chuẩn bị", description = "", visible = true
            });
            Assert.Equal(HttpStatusCode.Created, projectResponse.StatusCode);
            projectId = await ReadId(projectResponse);

            parentId = await CreateWorkItem(client, projectId, null, "workItem", "Hạng mục", 1);
            predecessorId = await CreateWorkItem(client, projectId, parentId, "task", "Công tác A", 1);
            successorId = await CreateWorkItem(client, projectId, parentId, "task", "Công tác B", 2);
            groupId = await CreateWorkItem(client, projectId, parentId, "group", "Nhóm A1", 3);
            groupedTaskId = await CreateWorkItem(client, projectId, groupId, "task", "Công tác trong nhóm", 1);
            var invalidGroupResponse = await client.PostAsJsonAsync($"/api/projects/{projectId}/work-items", new
            {
                parentId = groupId, type = "group", name = "Nhóm không hợp lệ", duration = 1,
                progress = 0, sortOrder = 2
            });
            Assert.Equal(System.Net.HttpStatusCode.BadRequest, invalidGroupResponse.StatusCode);

            var dependencyResponse = await client.PostAsJsonAsync($"/api/projects/{projectId}/dependencies", new
            {
                predecessorTaskId = predecessorId, successorTaskId = successorId, dependencyType = "FS", lagDays = 0
            });
            Assert.True(dependencyResponse.StatusCode == HttpStatusCode.Created, await dependencyResponse.Content.ReadAsStringAsync());
        }

        await using (var restartedFactory = new AlphaPmsApiFactory(databasePath, resetDatabase: false))
        {
            using var client = restartedFactory.CreateClient();
            var project = await client.GetAsync($"/api/projects/{projectId}");
            Assert.Equal(HttpStatusCode.OK, project.StatusCode);

            using var workItems = JsonDocument.Parse(await client.GetStringAsync($"/api/projects/{projectId}/work-items"));
            var rows = workItems.RootElement.GetProperty("data").EnumerateArray().ToList();
            Assert.Equal(5, rows.Count);
            Assert.Contains(rows, row => row.GetProperty("id").GetGuid() == predecessorId && row.GetProperty("parentId").GetGuid() == parentId);
            Assert.Contains(rows, row => row.GetProperty("id").GetGuid() == groupedTaskId && row.GetProperty("parentId").GetGuid() == groupId);

            using var dependencies = JsonDocument.Parse(await client.GetStringAsync($"/api/projects/{projectId}/dependencies"));
            var relation = Assert.Single(dependencies.RootElement.GetProperty("data").EnumerateArray());
            Assert.Equal(predecessorId, relation.GetProperty("predecessorTaskId").GetGuid());
            Assert.Equal(successorId, relation.GetProperty("successorTaskId").GetGuid());
        }
    }

    [Fact]
    public async Task Schedule_save_is_atomic_when_dependency_validation_fails()
    {
        var databasePath = Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "Backend", "tests", "TestData", $"alphapms-schedule-{Guid.NewGuid():N}.db"));
        Directory.CreateDirectory(Path.GetDirectoryName(databasePath)!);
        await using var factory = new AlphaPmsApiFactory(databasePath, resetDatabase: true);
        using var client = factory.CreateClient();
        var projectResponse = await client.PostAsJsonAsync("/api/projects", new
        {
            code = "SCHEDULE-ATOMIC", name = "Schedule transaction", investor = "", location = "", manager = "",
            startDate = "2026-08-23", finishDate = "2026-08-30", budget = 0, progress = 0,
            status = new string(['C', 'h', 'u', (char)7849, 'n', ' ', 'b', (char)7883]),
            description = "", visible = true
        });
        Assert.True(projectResponse.IsSuccessStatusCode, await projectResponse.Content.ReadAsStringAsync());
        var projectId = await ReadId(projectResponse);
        var workPackageId = Guid.NewGuid();
        var taskAId = Guid.NewGuid();
        var taskBId = Guid.NewGuid();
        object WorkItem(Guid id, Guid? parentId, string type, string name, int sortOrder) => new
        {
            id, projectId, parentId, type, name, unit = type == "task" ? "m" : null,
            quantity = type == "task" ? 12.5m : (decimal?)null, duration = 2,
            startDate = "2026-08-23", finishDate = "2026-08-24", progress = type == "task" ? 25 : 0, sortOrder,
            machineShiftFactor = type == "task" ? 1.25m : (decimal?)null,
            nclm = type == "task" ? 3.5m : (decimal?)null,
            permanentLabor = type == "task" ? 2m : (decimal?)null
        };
        var initial = await client.PutAsJsonAsync($"/api/projects/{projectId}/schedule", new
        {
            workItems = new[]
            {
                WorkItem(workPackageId, null, "workItem", "Original package", 1),
                WorkItem(taskAId, workPackageId, "task", "Task A", 1),
                WorkItem(taskBId, workPackageId, "task", "Task B", 2)
            },
            dependencies = new[] { new { predecessorTaskId = taskAId, successorTaskId = taskBId, dependencyType = "FS", lagDays = 0 } }
        });
        Assert.Equal(HttpStatusCode.OK, initial.StatusCode);

        var invalid = await client.PutAsJsonAsync($"/api/projects/{projectId}/schedule", new
        {
            workItems = new[]
            {
                WorkItem(workPackageId, null, "workItem", "Changed package", 1),
                WorkItem(taskAId, workPackageId, "task", "Task A", 1),
                WorkItem(taskBId, workPackageId, "task", "Task B", 2)
            },
            dependencies = new[] { new { predecessorTaskId = taskAId, successorTaskId = taskAId, dependencyType = "FS", lagDays = 0 } }
        });
        Assert.Equal(HttpStatusCode.Conflict, invalid.StatusCode);

        using var schedule = JsonDocument.Parse(await client.GetStringAsync($"/api/projects/{projectId}/schedule"));
        var data = schedule.RootElement.GetProperty("data");
        Assert.Contains(data.GetProperty("workItems").EnumerateArray(), row =>
            row.GetProperty("id").GetGuid() == workPackageId && row.GetProperty("name").GetString() == "Original package");
        var taskA = data.GetProperty("workItems").EnumerateArray().Single(row => row.GetProperty("id").GetGuid() == taskAId);
        Assert.Equal("m", taskA.GetProperty("unit").GetString());
        Assert.Equal(12.5m, taskA.GetProperty("quantity").GetDecimal());
        Assert.Equal(25m, taskA.GetProperty("progress").GetDecimal());
        Assert.Equal(1.25m, taskA.GetProperty("machineShiftFactor").GetDecimal());
        Assert.Equal(3.5m, taskA.GetProperty("nclm").GetDecimal());
        Assert.Equal(2m, taskA.GetProperty("permanentLabor").GetDecimal());
        var dependency = Assert.Single(data.GetProperty("dependencies").EnumerateArray());
        Assert.Equal(taskAId, dependency.GetProperty("predecessorTaskId").GetGuid());
        Assert.Equal(taskBId, dependency.GetProperty("successorTaskId").GetGuid());
    }

    private static async Task<Guid> CreateWorkItem(HttpClient client, Guid projectId, Guid? parentId, string type, string name, int sortOrder)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/work-items", new
        {
            projectId, parentId, type, name, unit = (string?)null, quantity = (decimal?)null, duration = 1,
            startDate = "2026-08-23", finishDate = "2026-08-23", progress = 0, sortOrder
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await ReadId(response);
    }

    private static Task<HttpResponseMessage> PutWorkItem(HttpClient client, Guid id, Guid projectId, Guid? parentId, string type, string name, int sortOrder) =>
        client.PutAsJsonAsync($"/api/work-items/{id}", new
        {
            id, projectId, parentId, type, name, unit = (string?)null, quantity = (decimal?)null, duration = 1,
            startDate = "2026-08-23", finishDate = "2026-08-23", progress = 0, sortOrder
        });

    private static async Task<Guid> ReadId(HttpResponseMessage response)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("data").GetProperty("id").GetGuid();
    }
}

internal sealed class AlphaPmsApiFactory(string databasePath, bool resetDatabase) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Database:Provider"] = "Sqlite",
            ["ConnectionStrings:AlphaPms"] = $"Data Source={databasePath}"
        }));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AlphaPmsDbContext>>();
            services.RemoveAll<AlphaPmsDbContext>();
            services.AddDbContext<AlphaPmsDbContext>(options => options.UseSqlite($"Data Source={databasePath}"));
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AlphaPmsDbContext>().Database;
        if (resetDatabase) database.EnsureDeleted();
        database.EnsureCreated();
        return host;
    }
}
