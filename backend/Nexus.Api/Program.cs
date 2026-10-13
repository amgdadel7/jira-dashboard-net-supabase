using Nexus.Api.Endpoints;
using Supabase;

var builder = WebApplication.CreateBuilder(args);

const string UiCors = "ui";

builder.Services.AddCors(o =>
    o.AddPolicy(UiCors, p => p
        .WithOrigins("http://localhost:5173", "http://localhost:4173")
        .AllowAnyHeader()
        .AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Supabase client (service role — stays server side)
builder.Services.AddSingleton(_ =>
{
    var url = builder.Configuration["Supabase:Url"]
        ?? throw new InvalidOperationException("Supabase:Url is not configured (appsettings.Development.json)");
    var key = builder.Configuration["Supabase:ServiceKey"]
        ?? throw new InvalidOperationException("Supabase:ServiceKey is not configured");
    return new Supabase.Client(url, key, new SupabaseOptions
    {
        AutoRefreshToken = false,
        AutoConnectRealtime = false,
    });
});

var app = builder.Build();

// Initialize the client once at startup so row models can update themselves.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<Supabase.Client>();
    await db.InitializeAsync();
}

app.UseCors(UiCors);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapWorkspaceEndpoints();
app.MapIssueEndpoints();
app.MapSprintEndpoints();

app.Run();
