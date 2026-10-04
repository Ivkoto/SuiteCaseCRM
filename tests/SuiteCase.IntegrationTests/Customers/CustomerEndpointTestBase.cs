using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using SuiteCase.Core.Countries;
using SuiteCase.Server.Common.DTO;
using SuiteCase.Server.Features.Customers.DTO;

namespace SuiteCase.IntegrationTests.Customers;

public abstract class CustomerEndpointTestBase(SqlServerFixture sqlServer)
{
    private readonly SqlServerFixture _sqlServer = sqlServer;

    protected static CancellationToken TestCancellationToken => TestContext.Current.CancellationToken;

    protected WebApplicationFactory<Program> CreateFactory()
        => new SuiteCaseWebApplicationFactory(_sqlServer.ConnectionString);

    protected WebApplicationFactory<Program> CreateFactory(IInterceptor databaseInterceptor)
        => new SuiteCaseWebApplicationFactory(_sqlServer.ConnectionString, databaseInterceptor);

    protected WebApplicationFactory<Program> CreateFactory(
        Action<IServiceCollection> configureTestServices)
        => new SuiteCaseWebApplicationFactory(_sqlServer.ConnectionString)
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(configureTestServices);
            });

    protected static HttpClient CreateClient(WebApplicationFactory<Program> factory)
        => factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

    protected static CreateCustomerRequest CreateRequest(
        string firstName = "Иван",
        string? middleName = "Георгиев",
        string lastName = "Петров",
        string? nationalId = "9001154218",
        string? passportNumber = "PA1234567",
        DateOnly? dateOfBirth = null,
        DateOnly? passportExpiresOn = null,
        string? email = "ivan.petrov@example.com",
        string? phoneNumber = "+359888111222",
        string? residenceCountryCode = Countries.DefaultCode)
        => new(
            firstName,
            middleName,
            lastName,
            nationalId,
            dateOfBirth ?? new DateOnly(1990, 1, 15),
            passportNumber,
            passportExpiresOn ?? new DateOnly(2030, 5, 1),
            email,
            phoneNumber,
            residenceCountryCode,
            "Test customer"
        );

    protected static async Task<CustomerDetailsResponse> CreateCustomerAsync(
        HttpClient client,
        CreateCustomerRequest request)
    {
        var response = await client.PostAsJsonAsync("/api/customers", request, TestCancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var customer = await response.Content.ReadFromJsonAsync<CustomerDetailsResponse>(TestCancellationToken);
        return Assert.IsType<CustomerDetailsResponse>(customer);
    }

    protected static async Task<PagedResponse<CustomerShortDetailsResponse>> GetCustomersAsync(
        HttpClient client,
        string queryString = "")
    {
        var response = await client.GetFromJsonAsync<PagedResponse<CustomerShortDetailsResponse>>(
            $"/api/customers{queryString}",
            TestCancellationToken);

        return Assert.IsType<PagedResponse<CustomerShortDetailsResponse>>(response);
    }

    protected static int CalculateExpectedAge(DateOnly dateOfBirth, DateOnly today)
    {
        var age = today.Year - dateOfBirth.Year;

        if (dateOfBirth > today.AddYears(-age))
            age--;

        return age;
    }
}
