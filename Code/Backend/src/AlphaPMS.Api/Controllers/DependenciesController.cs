using AlphaPMS.Application.Projects;
using Microsoft.AspNetCore.Mvc;

namespace AlphaPMS.Api.Controllers;

[ApiController]
[Route("api/dependencies")]
public sealed class DependenciesController(DependencyService dependencyService) : ControllerBase
{
    [HttpPut("{id:guid}")]
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, TaskDependencyInput input, CancellationToken cancellationToken) => Ok(new { data = await dependencyService.UpdateDependencyAsync(id, input, cancellationToken) });
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) { await dependencyService.DeleteDependencyAsync(id, cancellationToken); return NoContent(); }
}
