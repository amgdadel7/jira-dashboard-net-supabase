using Nexus.Api.Dtos;
using Nexus.Api.Models;
using Postgrest.Constants;

namespace Nexus.Api.Endpoints;

public static class SprintEndpoints
{
    public static IEndpointRouteBuilder MapSprintEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/sprints").WithTags("Sprints");

        /* --------------------------- create sprint --------------------------- */
        group.MapPost("/", async Task<IResult> (CreateSprintRequest req, Supabase.Client db) =>
            {
                var project = await db.From<ProjectRow>().Where(p => p.Key == "ATL").Single();
                if (project is null) return Results.Problem("Default project is missing — run supabase/seed.sql");

                var sprints = await db.From<SprintRow>().Where(s => s.ProjectId == project.Id).Get();
                var lastEnd = sprints.Models.Select(s => s.EndDate).DefaultIfEmpty(DateTime.Today).Max();

                var row = new SprintRow
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    Name = string.IsNullOrWhiteSpace(req.Name) ? $"Sprint {sprints.Models.Count + 1}" : req.Name.Trim(),
                    Goal = "",
                    StartDate = lastEnd.AddDays(3),
                    EndDate = lastEnd.AddDays(14),
                    State = "future",
                };

                var inserted = await db.From<SprintRow>().Insert(row);
                return Results.Ok(inserted.Models.First().ToDto());
            })
            .WithName("CreateSprint");

        /* --------------------------- update sprint -------------------------- */
        group.MapPatch("/{id:guid}", async Task<IResult> (Guid id, UpdateSprintRequest req, Supabase.Client db) =>
            {
                var sprint = await db.From<SprintRow>().Where(s => s.Id == id).Single();
                if (sprint is null) return Results.NotFound(new { error = "sprint not found" });

                if (req.Name is not null) sprint.Name = req.Name;
                if (req.Goal is not null) sprint.Goal = req.Goal;
                if (req.StartDate is not null) sprint.StartDate = req.StartDate.Value;
                if (req.EndDate is not null) sprint.EndDate = req.EndDate.Value;

                await sprint.Update<SprintRow>();
                return Results.Ok(sprint.ToDto());
            })
            .WithName("UpdateSprint");

        /* --------------------------- start sprint --------------------------- */
        group.MapPost("/{id:guid}/start", async Task<IResult> (Guid id, Supabase.Client db) =>
            {
                var sprint = await db.From<SprintRow>().Where(s => s.Id == id).Single();
                if (sprint is null) return Results.NotFound(new { error = "sprint not found" });
                if (sprint.State == "closed") return Results.Conflict(new { error = "cannot start a closed sprint" });

                // only one active sprint per project — park the current one back to future
                var active = await db.From<SprintRow>()
                    .Where(s => s.ProjectId == sprint.ProjectId)
                    .Filter("state", Operator.Equals, "active")
                    .Get();
                foreach (var s in active.Models.Where(s => s.Id != id))
                {
                    s.State = "future";
                    await s.Update<SprintRow>();
                }

                await db.From<SprintRow>().Where(s => s.Id == id).Set(s => s.State, "active").Update();
                return Results.NoContent();
            })
            .WithName("StartSprint");

        /* -------------------------- complete sprint -------------------------- */
        group.MapPost("/{id:guid}/complete", async Task<IResult> (Guid id, CompleteSprintRequest req, Supabase.Client db) =>
            {
                var sprint = await db.From<SprintRow>().Where(s => s.Id == id).Single();
                if (sprint is null) return Results.NotFound(new { error = "sprint not found" });

                await db.From<SprintRow>().Where(s => s.Id == id).Set(s => s.State, "closed").Update();

                // roll every unfinished issue into the destination sprint (or backlog)
                var open = await db.From<IssueRow>()
                    .Where(i => i.SprintId == id)
                    .Filter("status", Operator.NotEqual, "done")
                    .Get();

                foreach (var issue in open.Models)
                {
                    issue.SprintId = req.MoveOpenIssuesTo;
                    issue.Status = "todo";
                    issue.UpdatedAt = DateTimeOffset.UtcNow;
                    await issue.Update<IssueRow>();
                }

                return Results.NoContent();
            })
            .WithName("CompleteSprint");

        return routes;
    }
}
