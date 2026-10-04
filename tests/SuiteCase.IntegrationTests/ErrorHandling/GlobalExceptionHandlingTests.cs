using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SuiteCase.Core.Security;
using SuiteCase.Server.Features.Customers.DTO;

namespace SuiteCase.IntegrationTests.ErrorHandling;

[Collection(SqlServerCollection.Name)]
public sealed class GlobalExceptionHandlingTests(SqlServerFixture sqlServer)
{
    private readonly SqlServerFixture _sqlServer = sqlServer;

    [Fact]
    public async Task UnhandledException_ReturnsSafe500ProblemDetails_InNonDevelopmentEnvironment()
    {
        // SuiteCaseWebApplicationFactory uses "Testing" environment (non-Development),
        // so UseExceptionHandler() is active in Program.cs.
        // We replace ISensitiveDataProtector with one that always throws,
        // then hit an endpoint that calls it.
        using var factory = new SuiteCaseWebApplicationFactory(_sqlServer.ConnectionString)
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.RemoveAll<ISensitiveDataProtector>();
                    services.AddScoped<ISensitiveDataProtector, ThrowingSensitiveDataProtector>();
                });
            });

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        // This triggers Hash() which will throw
        var request = new CreateCustomerRequest(
            "Тест", null, "Клиент",
            "9001154218",
            new DateOnly(1990, 1, 1),
            null, null, null, null, null, null);

        var response = await client.PostAsJsonAsync(
            "/api/customers",
            request,
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

        var contentType = response.Content.Headers.ContentType?.MediaType;
        Assert.Equal("application/problem+json", contentType);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(
            TestContext.Current.CancellationToken);
        Assert.NotNull(problem);
        Assert.Equal(500, problem.Status);
        // Response must not expose internal exception details
        Assert.DoesNotContain("Deliberate", problem.Title ?? "");
        Assert.DoesNotContain("Deliberate", problem.Detail ?? "");
        // Global 500 ProblemDetails should include traceId for support correlation
        Assert.True(problem.Extensions.ContainsKey("traceId"));
        Assert.False(string.IsNullOrWhiteSpace(problem.Extensions["traceId"]!.ToString()));
    }

    private sealed class ThrowingSensitiveDataProtector : ISensitiveDataProtector
    {
        public string Protect(string value)
            => throw new InvalidOperationException("Deliberate test exception in Protect");

        public string Unprotect(string protectedValue)
            => throw new InvalidOperationException("Deliberate test exception in Unprotect");

        public string Hash(string value)
            => throw new InvalidOperationException("Deliberate test exception in Hash");
    }
}
