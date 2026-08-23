using AlphaPMS.Application.Projects;
using Microsoft.AspNetCore.Mvc;

namespace AlphaPMS.Api.Controllers;

[ApiController]
[Route("api/projects")]
public sealed class ProjectsController(ProjectService projectService, WorkItemService workItemService,
    DependencyService dependencyService, ProjectScheduleService scheduleService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetProjects(CancellationToken cancellationToken) => Ok(new { data = await projectService.GetProjectsAsync(cancellationToken) });
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProject(Guid id, CancellationToken cancellationToken) => Ok(new { data = await projectService.GetProjectAsync(id, cancellationToken) });
    [HttpPost]
    public async Task<IActionResult> CreateProject(ProjectInput input, CancellationToken cancellationToken)
    {
        var project = await projectService.CreateProjectAsync(input, cancellationToken);
        return CreatedAtAction(nameof(GetProject), new { id = project.Id }, new { data = project });
    }
    [HttpPut("{id:guid}")]
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> UpdateProject(Guid id, ProjectInput input, CancellationToken cancellationToken) => Ok(new { data = await projectService.UpdateProjectAsync(id, input, cancellationToken) });
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProject(Guid id, CancellationToken cancellationToken) { await projectService.DeleteProjectAsync(id, cancellationToken); return NoContent(); }
    [HttpGet("{projectId:guid}/work-items")]
    public async Task<IActionResult> GetWorkItems(Guid projectId, CancellationToken cancellationToken) => Ok(new { data = await workItemService.GetProjectWorkItemsAsync(projectId, cancellationToken) });
    [HttpPost("{projectId:guid}/work-items")]
    public async Task<IActionResult> CreateWorkItem(Guid projectId, WorkItemInput input, CancellationToken cancellationToken)
    {
        var workItem = await workItemService.CreateWorkItemAsync(projectId, input, cancellationToken);
        return Created($"/api/work-items/{workItem.Id}", new { data = workItem });
    }
    [HttpPut("{projectId:guid}/work-items")]
    public async Task<IActionResult> ReplaceWorkItems(Guid projectId, ReplaceWorkItemsInput input, CancellationToken cancellationToken) => Ok(new { data = await workItemService.ReplaceProjectWorkItemsAsync(projectId, input, cancellationToken) });
    [HttpGet("{projectId:guid}/dependencies")]
    public async Task<IActionResult> GetDependencies(Guid projectId, CancellationToken cancellationToken) => Ok(new { data = await dependencyService.GetProjectDependenciesAsync(projectId, cancellationToken) });
    [HttpPost("{projectId:guid}/dependencies")]
    public async Task<IActionResult> CreateDependency(Guid projectId, TaskDependencyInput input, CancellationToken cancellationToken)
    {
        var dependency = await dependencyService.CreateDependencyAsync(projectId, input, cancellationToken);
        return Created($"/api/dependencies/{dependency.Id}", new { data = dependency });
    }
    [HttpPut("{projectId:guid}/dependencies")]
    public async Task<IActionResult> ReplaceDependencies(Guid projectId, ReplaceDependenciesInput input, CancellationToken cancellationToken) =>
        Ok(new { data = await dependencyService.ReplaceProjectDependenciesAsync(projectId, input, cancellationToken) });
    [HttpGet("{projectId:guid}/schedule")]
    public async Task<IActionResult> GetSchedule(Guid projectId, CancellationToken cancellationToken) =>
        Ok(new { data = await scheduleService.GetAsync(projectId, cancellationToken) });
    [HttpPut("{projectId:guid}/schedule")]
    public async Task<IActionResult> SaveSchedule(Guid projectId, ProjectScheduleInput input, CancellationToken cancellationToken) =>
        Ok(new { data = await scheduleService.SaveAsync(projectId, input, cancellationToken) });
}
