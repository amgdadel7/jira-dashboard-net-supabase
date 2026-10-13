using Nexus.Api.Dtos;
using Nexus.Api.Models;

namespace Nexus.Api.Endpoints;

public static class IssueEndpoints
{
    private const string ProjectKey = "ATL";

    public static IEndpointRouteBuilder MapIssueEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/issues").WithTags("Issues");

        /* ------------------------------ create ------------------------------ */
        group.MapPost("/", async Task<IResult> (CreateIssueRequest req, Supabase.Client db) =>
            {
                if (string.IsNullOrWhiteSpace(req.Summary))
                    return Results.BadRequest(new { error = "summary is required" });

                var project = await db.From<ProjectRow>().Where(p => p.Key == ProjectKey).Single();
                if (project is null) return Results.Problem("Default project is missing — run supabase/seed.sql");

                // next sequential key: ATL-<max+1>
                var siblings = await db.From<IssueRow>().Where(i => i.ProjectId == project.Id).Get();
                var next = siblings.Models
                    .Select(i => int.TryParse(i.Key.Split('-').LastOrDefault(), out var n) ? n : 0)
                    .DefaultIfEmpty(0)
                    .Max() + 1;

                var laneRank = siblings.Models.Where(i => i.Status == req.Status).Select(i => i.Rank).DefaultIfEmpty(0).Max() + 10;

                var row = new IssueRow
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    Key = $"{project.Key}-{next}",
                    Summary = req.Summary,
                    Description = req.Description ?? "",
                    Type = req.Type,
                    Priority = req.Priority,
                    Status = req.Status,
                    AssigneeId = req.AssigneeId,
                    ReporterId = project.LeadId,
                    SprintId = req.SprintId,
                    EpicId = req.EpicId,
                    StoryPoints = req.StoryPoints,
                    Labels = (req.Labels ?? Array.Empty<string>()).ToList(),
                    Rank = laneRank,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                };

                var inserted = await db.From<IssueRow>().Insert(row);
                var created = inserted.Models.First();
                return Results.Ok(created.ToDto(Array.Empty<CommentRow>()));
            })
            .WithName("CreateIssue");

        /* ------------------------------ update ------------------------------ */
        group.MapPatch("/{id:guid}", async Task<IResult> (Guid id, UpdateIssueRequest req, Supabase.Client db) =>
            {
                var row = await db.From<IssueRow>().Where(i => i.Id == id).Single();
                if (row is null) return Results.NotFound(new { error = "issue not found" });

                if (req.Summary is not null) row.Summary = req.Summary;
                if (req.Description is not null) row.Description = req.Description;
                if (req.Type is not null) row.Type = req.Type;
                if (req.Priority is not null) row.Priority = req.Priority;
                if (req.Status is not null) row.Status = req.Status;
                if (req.StoryPoints is not null) row.StoryPoints = req.StoryPoints;
                if (req.SprintId is not null) row.SprintId = req.SprintId;
                if (req.EpicId is not null) row.EpicId = req.EpicId;
                if (req.Labels is not null) row.Labels = req.Labels.ToList();
                if (req.Rank.HasValue) row.Rank = req.Rank.Value;   // backlog drag-&-drop reordering
                // assignee is nullable in the payload — Guid.Empty means "clear"
                if (req.AssigneeId is not null) row.AssigneeId = req.AssigneeId == Guid.Empty ? null : req.AssigneeId;
                row.UpdatedAt = DateTimeOffset.UtcNow;

                await row.Update<IssueRow>();
                return Results.Ok((await Load(db, id))!);
            })
            .WithName("UpdateIssue");

        /* --------------------------- move (drag & drop) --------------------- */
        group.MapPatch("/{id:guid}/move", async Task<IResult> (Guid id, MoveIssueRequest req, Supabase.Client db) =>
            {
                var row = await db.From<IssueRow>().Where(i => i.Id == id).Single();
                if (row is null) return Results.NotFound(new { error = "issue not found" });

                await db.From<IssueRow>().Where(i => i.Id == id)
                    .Set(i => i.Status, req.Status)
                    .Set(i => i.Rank, req.Rank)
                    .Set(i => i.UpdatedAt, DateTimeOffset.UtcNow)
                    .Update();

                return Results.Ok((await Load(db, id))!);
            })
            .WithName("MoveIssue");

        /* ------------------------------- delete ------------------------------ */
        group.MapDelete("/{id:guid}", async Task<IResult> (Guid id, Supabase.Client db) =>
            {
                var row = await db.From<IssueRow>().Where(i => i.Id == id).Single();
                if (row is null) return Results.NotFound(new { error = "issue not found" });

                await row.Delete<IssueRow>();   // comments cascade via FK
                return Results.NoContent();
            })
            .WithName("DeleteIssue");

        /* ------------------------------ comments ----------------------------- */
        group.MapPost("/{id:guid}/comments", async Task<IResult> (Guid id, AddCommentRequest req, Supabase.Client db) =>
            {
                var row = await db.From<IssueRow>().Where(i => i.Id == id).Single();
                if (row is null) return Results.NotFound(new { error = "issue not found" });
                if (string.IsNullOrWhiteSpace(req.Body)) return Results.BadRequest(new { error = "body is required" });

                await db.From<CommentRow>().Insert(new CommentRow
                {
                    Id = Guid.NewGuid(),
                    IssueId = id,
                    AuthorId = req.AuthorId ?? row.ReporterId,
                    Body = req.Body.Trim(),
                    CreatedAt = DateTimeOffset.UtcNow,
                });

                return Results.Ok((await Load(db, id))!);
            })
            .WithName("AddComment");

        return routes;
    }

    /* Issue + its comments, shaped for the frontend. */
    private static async Task<IssueDto?> Load(Supabase.Client db, Guid id)
    {
        var row = await db.From<IssueRow>().Where(i => i.Id == id).Single();
        if (row is null) return null;
        var comments = await db.From<CommentRow>().Where(c => c.IssueId == id).Get();
        return row.ToDto(comments.Models);
    }
}
