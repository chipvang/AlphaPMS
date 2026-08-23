using AlphaPMS.Application.Projects;
using Microsoft.AspNetCore.Mvc;

namespace AlphaPMS.Api.Controllers;

[ApiController]
[Route("api/work-items")]
public sealed class WorkItemsController(WorkItemService workItemService) : ControllerBase
{
    [HttpPut("{id:guid}")]
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, WorkItemInput input, CancellationToken cancellationToken) => Ok(new { data = await workItemService.UpdateWorkItemAsync(id, input, cancellationToken) });
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) { await workItemService.DeleteWorkItemAsync(id, cancellationToken); return NoContent(); }
}
