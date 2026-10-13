using Nexus.Api.Dtos;
using Nexus.Api.Models;

namespace Nexus.Api.Endpoints;

public static class WorkspaceEndpoints
{
    public static IEndpointRouteBuilder MapWorkspaceEndpoints(this IEndpointRouteBuilder routes)
    {
        routes.MapGet("/api/health",
                () => Results.Ok(new { status = "ok", database = "supabase" }))
            .WithName("Health")
            .WithTags("Workspace");

        routes.MapGet("/api/workspace", async Task<IResult> (string projectKey, Supabase.Client db) =>
            {
                var project = await db.From<ProjectRow>().Where(p => p.Key == projectKey).Single();
                if (project is null)
                    return Results.NotFound(new { error = $"project '{projectKey}' not found" });

                var users = await db.From<ProfileRow>().Get();
                var sprints = await db.From<SprintRow>().Where(s => s.ProjectId == project.Id).Get();
                var epics = await db.From<EpicRow>().Where(e => e.ProjectId == project.Id).Get();
                var issues = await db.From<IssueRow>().Where(i => i.ProjectId == project.Id).Get();
                var issueIds = issues.Models.Select(i => i.Id).ToHashSet();
                var comments = (await db.From<CommentRow>().Get()).Models.Where(c => issueIds.Contains(c.IssueId)).ToList();

                var dto = new WorkspaceDto(
                    project.ToDto(),
                    users.Models.Select(u => u.ToDto()).ToArray(),
                    sprints.Models.OrderBy(s => s.StartDate).Select(s => s.ToDto()).ToArray(),
                    epics.Models.OrderBy(e => e.StartDate).Select(e => e.ToDto()).ToArray(),
                    issues.Models.Select(i => i.ToDto(comments.Where(c => c.IssueId == i.Id))).ToArray());

                return Results.Ok(dto);
            })
            .WithName("GetWorkspace")
            .WithTags("Workspace");

        return routes;
    }
}
