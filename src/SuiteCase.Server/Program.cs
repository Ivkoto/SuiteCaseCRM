using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using SuiteCase.Core.Security;
using SuiteCase.Server.Auditing;
using SuiteCase.Server.Data;
using SuiteCase.Server.Features.Customers;
using SuiteCase.Server.Security;

var builder = WebApplication.CreateBuilder(args);

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddValidation();

builder.Services.AddDbContext<SuiteCaseDbContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DatabaseConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure());
});

builder.Services.AddDataProtection().SetApplicationName("SuiteCase");
//.PersistKeysToFileSystem(new DirectoryInfo(builder.Configuration["DataProtection:KeyRingPath"]!));

builder.Services.AddScoped<ISensitiveDataProtector, SensitiveDataProtector>();
builder.Services.AddScoped<IAuditEventWriter, EfCoreAuditEventWriter>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
}

app.UseDefaultFiles();
app.MapStaticAssets();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "SuiteCase API v1");
    });

    await app.Services.InitializeDatabaseAsync();
}

app.UseHttpsRedirection();
app.MapCustomerEndpoints();
if (!app.Environment.IsDevelopment())
{
    app.MapFallbackToFile("/index.html");
}

app.Run();
