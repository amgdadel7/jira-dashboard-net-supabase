using Nexus.Api.Models;

namespace Nexus.Api.Dtos;

/* Serialized with ASP.NET Core's default camelCase policy, matching the
   TypeScript contracts in src/types/index.ts exactly. */

public record UserDto(Guid Id, string Name, string Email, string Role, string Color, string Initials);

public record ProjectDto(Guid Id, string Key, string Name, string Type, Guid? LeadId);

public record SprintDto(Guid Id, string Name, string Goal, DateTime StartDate, DateTime EndDate, string State);

public record EpicDto(Guid Id, string Key, string Title, string Color, DateTime StartDate, DateTime EndDate);

public record CommentDto(Guid Id, Guid? AuthorId, string Body, DateTimeOffset CreatedAt);

public record IssueDto(
    Guid Id, string Key, string Summary, string Description,
    string Type, string Priority, string Status,
    int? StoryPoints, Guid? AssigneeId, Guid? ReporterId,
    Guid? SprintId, Guid? EpicId, string[] Labels,
    double Rank, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    CommentDto[] Comments);

public record WorkspaceDto(ProjectDto Project, UserDto[] Users, SprintDto[] Sprints, EpicDto[] Epics, IssueDto[] Issues);

/* ------------------------------- Requests ------------------------------ */

public record CreateIssueRequest(
    string Summary, string Type, string Priority, string Status,
    Guid? AssigneeId, int? StoryPoints, Guid? SprintId, Guid? EpicId,
    string[] Labels, string Description);

public record UpdateIssueRequest(
    string? Summary, string? Description, string? Type, string? Priority, string? Status,
    Guid? AssigneeId, int? StoryPoints, Guid? SprintId, Guid? EpicId, string[]? Labels, double? Rank);

public record UpdateSprintRequest(string? Name, string? Goal, DateTime? StartDate, DateTime? EndDate);

public record MoveIssueRequest(string Status, double Rank);

public record AddCommentRequest(Guid? AuthorId, string Body);

public record CompleteSprintRequest(Guid? MoveOpenIssuesTo);

public record CreateSprintRequest(string Name);

/* ------------------------------- Mappers ------------------------------- */

public static class Mappers
{
    public static UserDto ToDto(this ProfileRow r) =>
        new(r.Id, r.Name, r.Email, r.Role ?? "Member", r.Color, r.Initials ?? Initials(r.Name));

    public static ProjectDto ToDto(this ProjectRow r) =>
        new(r.Id, r.Key, r.Name, r.Type, r.LeadId);

    public static SprintDto ToDto(this SprintRow r) =>
        new(r.Id, r.Name, r.Goal ?? "", r.StartDate, r.EndDate, r.State);

    public static EpicDto ToDto(this EpicRow r) =>
        new(r.Id, r.Key, r.Title, r.Color, r.StartDate, r.EndDate);

    public static CommentDto ToDto(this CommentRow r) =>
        new(r.Id, r.AuthorId, r.Body, r.CreatedAt);

    public static IssueDto ToDto(this IssueRow r, IEnumerable<CommentRow> comments) =>
        new(r.Id, r.Key, r.Summary, r.Description, r.Type, r.Priority, r.Status,
            r.StoryPoints, r.AssigneeId, r.ReporterId ?? Guid.Empty, r.SprintId, r.EpicId,
            r.Labels.ToArray(), r.Rank, r.CreatedAt, r.UpdatedAt,
            comments.OrderBy(c => c.CreatedAt).Select(c => c.ToDto()).ToArray());

    private static string Initials(string name) =>
        string.Concat(name.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(w => char.ToUpper(w[0])).Take(2));
}
