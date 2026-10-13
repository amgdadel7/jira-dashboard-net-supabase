using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Nexus.Api.Models;

[Table("profiles")]
public class ProfileRow : BaseModel
{
    [PrimaryKey("id", false)] public Guid Id { get; set; }
    [Column("name")] public string Name { get; set; } = "";
    [Column("email")] public string Email { get; set; } = "";
    [Column("role")] public string? Role { get; set; }
    [Column("color")] public string Color { get; set; } = "#0C66E4";
    [Column("initials")] public string? Initials { get; set; }
}

[Table("projects")]
public class ProjectRow : BaseModel
{
    [PrimaryKey("id", false)] public Guid Id { get; set; }
    [Column("key")] public string Key { get; set; } = "";
    [Column("name")] public string Name { get; set; } = "";
    [Column("type")] public string Type { get; set; } = "Software project";
    [Column("lead_id")] public Guid? LeadId { get; set; }
}

[Table("epics")]
public class EpicRow : BaseModel
{
    [PrimaryKey("id", false)] public Guid Id { get; set; }
    [Column("project_id")] public Guid ProjectId { get; set; }
    [Column("key")] public string Key { get; set; } = "";
    [Column("title")] public string Title { get; set; } = "";
    [Column("color")] public string Color { get; set; } = "#0C66E4";
    [Column("start_date")] public DateTime StartDate { get; set; }
    [Column("end_date")] public DateTime EndDate { get; set; }
}

[Table("sprints")]
public class SprintRow : BaseModel
{
    [PrimaryKey("id", false)] public Guid Id { get; set; }
    [Column("project_id")] public Guid ProjectId { get; set; }
    [Column("name")] public string Name { get; set; } = "";
    [Column("goal")] public string? Goal { get; set; }
    [Column("start_date")] public DateTime StartDate { get; set; }
    [Column("end_date")] public DateTime EndDate { get; set; }
    [Column("state")] public string State { get; set; } = "future";
}

[Table("issues")]
public class IssueRow : BaseModel
{
    [PrimaryKey("id", false)] public Guid Id { get; set; }
    [Column("project_id")] public Guid ProjectId { get; set; }
    [Column("sprint_id")] public Guid? SprintId { get; set; }
    [Column("epic_id")] public Guid? EpicId { get; set; }
    [Column("key")] public string Key { get; set; } = "";
    [Column("summary")] public string Summary { get; set; } = "";
    [Column("description")] public string Description { get; set; } = "";
    [Column("type")] public string Type { get; set; } = "task";
    [Column("status")] public string Status { get; set; } = "todo";
    [Column("priority")] public string Priority { get; set; } = "medium";
    [Column("story_points")] public int? StoryPoints { get; set; }
    [Column("assignee_id")] public Guid? AssigneeId { get; set; }
    [Column("reporter_id")] public Guid? ReporterId { get; set; }
    [Column("labels")] public List<string> Labels { get; set; } = new();
    [Column("rank")] public double Rank { get; set; } = 1000;
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
    [Column("updated_at")] public DateTimeOffset UpdatedAt { get; set; }
}

[Table("comments")]
public class CommentRow : BaseModel
{
    [PrimaryKey("id", false)] public Guid Id { get; set; }
    [Column("issue_id")] public Guid IssueId { get; set; }
    [Column("author_id")] public Guid? AuthorId { get; set; }
    [Column("body")] public string Body { get; set; } = "";
    [Column("created_at")] public DateTimeOffset CreatedAt { get; set; }
}
