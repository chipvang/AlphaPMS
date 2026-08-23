using AlphaPMS.Application.Abstractions;
using AlphaPMS.Application.Common;
using AlphaPMS.Domain.Projects;

namespace AlphaPMS.Application.Projects;

public sealed class ProjectService(IAlphaPmsRepository repository, IClock clock)
{
    public async Task<IReadOnlyList<ProjectDto>> GetProjectsAsync(CancellationToken cancellationToken) =>
        (await repository.GetProjectsAsync(cancellationToken)).Select(ContractMapper.ToDto).ToList();

    public async Task<ProjectDto> GetProjectAsync(Guid id, CancellationToken cancellationToken) =>
        ContractMapper.ToDto(await FindProject(id, cancellationToken));

    public async Task<ProjectDto> CreateProjectAsync(ProjectInput input, CancellationToken cancellationToken)
    {
        await EnsureCodeUnique(input.Code, null, cancellationToken);
        var project = new Project(Guid.NewGuid(), input.Code, input.Name, clock.UtcNow);
        Apply(project, input);
        repository.AddProject(project);
        await repository.SaveChangesAsync(cancellationToken);
        return ContractMapper.ToDto(project);
    }

    public async Task<ProjectDto> UpdateProjectAsync(Guid id, ProjectInput input, CancellationToken cancellationToken)
    {
        var project = await FindProject(id, cancellationToken);
        await EnsureCodeUnique(input.Code, id, cancellationToken);
        Apply(project, input);
        await repository.SaveChangesAsync(cancellationToken);
        return ContractMapper.ToDto(project);
    }

    public async Task DeleteProjectAsync(Guid id, CancellationToken cancellationToken)
    {
        await repository.ExecuteInTransactionAsync(async transactionToken =>
        {
            var project = await FindProject(id, transactionToken);
            foreach (var dependency in await repository.GetProjectDependenciesAsync(id, transactionToken)) repository.RemoveDependency(dependency);
            await repository.SaveChangesAsync(transactionToken);
            repository.RemoveWorkItems(await repository.GetProjectWorkItemsAsync(id, transactionToken));
            await repository.SaveChangesAsync(transactionToken);
            repository.RemoveProject(project);
            await repository.SaveChangesAsync(transactionToken);
            return true;
        }, cancellationToken);
    }

    private void Apply(Project project, ProjectInput input) => project.Update(input.Code, input.Name, input.Description,
        ContractMapper.ParseStatus(input.Status), ContractMapper.ParseDate(input.StartDate, "PROJECT_START_DATE"),
        ContractMapper.ParseDate(input.FinishDate, "PROJECT_FINISH_DATE"), input.Investor, input.Location, input.Manager,
        input.Budget, input.Progress, input.Visible, clock.UtcNow);

    private async Task<Project> FindProject(Guid id, CancellationToken cancellationToken) =>
        await repository.GetProjectAsync(id, cancellationToken) ?? throw new Common.ApplicationException("PROJECT_NOT_FOUND", "Không tìm thấy dự án.", ApplicationErrorKind.NotFound);

    private async Task EnsureCodeUnique(string code, Guid? exceptId, CancellationToken cancellationToken)
    {
        if (await repository.ProjectCodeExistsAsync(code.Trim().ToUpperInvariant(), exceptId, cancellationToken))
            throw new Common.ApplicationException("PROJECT_CODE_DUPLICATE", "Mã dự án đã tồn tại.", ApplicationErrorKind.Conflict);
    }
}
