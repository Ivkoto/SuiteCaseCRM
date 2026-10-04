using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SuiteCase.Core.Countries;
using SuiteCase.Server.Data;
using SuiteCase.Server.Features.Customers.DTO;

namespace SuiteCase.IntegrationTests.Customers;

[Collection(SqlServerCollection.Name)]
public sealed class CustomerCreateEndpointTests(SqlServerFixture sqlServer)
    : CustomerEndpointTestBase(sqlServer)
{
    [Fact]
    public async Task CreateCustomer_ReturnsConflict_WhenNationalIdBelongsToActiveCustomer()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var firstResponse = await client.PostAsJsonAsync("/api/customers",
            CreateRequest(nationalId: "9001154218", passportNumber: "PA1234567"),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        var firstCustomer = await firstResponse.Content.ReadFromJsonAsync<CustomerDetailsResponse>(
            TestCancellationToken);
        Assert.NotNull(firstCustomer);

        var duplicateResponse = await client.PostAsJsonAsync("/api/customers",
            CreateRequest(
                firstName: "Петър",
                lastName: "Иванов",
                nationalId: "9001154218",
                passportNumber: "PB6543210"),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
        var problem = await duplicateResponse.Content.ReadFromJsonAsync<ProblemDetails>(
            TestCancellationToken);
        Assert.NotNull(problem);
        Assert.Equal(409, problem.Status);
        Assert.Equal("Duplicate customer", problem.Title);
        Assert.DoesNotContain("9001154218", problem.Detail);
        Assert.Equal("A customer with this national ID already exists.", problem.Detail);

        Assert.True(problem.Extensions.ContainsKey("code"));
        Assert.Equal("customer.duplicate_national_id", problem.Extensions["code"]!.ToString());

        Assert.True(problem.Extensions.ContainsKey("traceId"));
        Assert.False(string.IsNullOrWhiteSpace(problem.Extensions["traceId"]!.ToString()));

        Assert.True(problem.Extensions.ContainsKey("existingCustomerId"));
        var existingId = ((JsonElement)problem.Extensions["existingCustomerId"]!).GetInt32();
        Assert.Equal(firstCustomer.Id, existingId);
    }

    [Fact]
    public async Task CreateCustomer_ReturnsConflict_WhenPassportNumberBelongsToActiveCustomer()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var firstResponse = await client.PostAsJsonAsync("/api/customers",
            CreateRequest(nationalId: "9001154218", passportNumber: "PA1234567"),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        var firstCustomer = await firstResponse.Content.ReadFromJsonAsync<CustomerDetailsResponse>(
            TestCancellationToken);
        Assert.NotNull(firstCustomer);

        var duplicateResponse = await client.PostAsJsonAsync("/api/customers",
            CreateRequest(
                firstName: "Петър",
                lastName: "Иванов",
                nationalId: "8507120058",
                passportNumber: " PA1234567 "),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
        var problem = await duplicateResponse.Content.ReadFromJsonAsync<ProblemDetails>(
            TestCancellationToken);
        Assert.NotNull(problem);
        Assert.Equal(409, problem.Status);
        Assert.Equal("Duplicate customer", problem.Title);
        Assert.DoesNotContain("PA1234567", problem.Detail);
        Assert.Equal("A customer with this passport number already exists.", problem.Detail);

        Assert.True(problem.Extensions.ContainsKey("code"));
        Assert.Equal("customer.duplicate_passport_number", problem.Extensions["code"]!.ToString());

        Assert.True(problem.Extensions.ContainsKey("traceId"));
        Assert.False(string.IsNullOrWhiteSpace(problem.Extensions["traceId"]!.ToString()));

        Assert.True(problem.Extensions.ContainsKey("existingCustomerId"));
        var existingId = ((JsonElement)problem.Extensions["existingCustomerId"]!).GetInt32();
        Assert.Equal(firstCustomer.Id, existingId);
    }

    [Fact]
    public async Task CreateCustomer_ReturnsBadRequest_WhenRequiredFieldsAreMissing()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/customers",
            new
            {
                firstName = "",
                lastName = ""
            },
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>(
            TestCancellationToken);
        Assert.NotNull(problem);
        Assert.Equal(400, problem.Status);
        Assert.NotNull(problem.Errors);
        Assert.NotEmpty(problem.Errors);

        var firstNameKey = problem.Errors.ContainsKey("firstName") ? "firstName" : "FirstName";
        var lastNameKey = problem.Errors.ContainsKey("lastName") ? "lastName" : "LastName";

        Assert.True(problem.Errors.ContainsKey(firstNameKey),
            "Expected validation error for firstName/FirstName");
        Assert.NotEmpty(problem.Errors[firstNameKey]);

        Assert.True(problem.Errors.ContainsKey(lastNameKey),
            "Expected validation error for lastName/LastName");
        Assert.NotEmpty(problem.Errors[lastNameKey]);

        Assert.False(problem.Extensions.ContainsKey("code"),
            "Validation errors should not include business error 'code' extension");
    }

    [Fact]
    public async Task CreateCustomer_DefaultsResidenceCountryCodeToBulgaria_WhenCountryIsMissing()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/customers",
            CreateRequest(residenceCountryCode: null),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<CustomerDetailsResponse>(TestCancellationToken);
        Assert.NotNull(created);
        Assert.Equal("BG", created.ResidenceCountryCode);
        Assert.Equal("Bulgaria", created.ResidenceCountryName);
    }

    [Fact]
    public async Task CreateCustomer_NormalizesTextSensitiveValuesAndCountryCode()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/customers",
            new CreateCustomerRequest(
                " Иван ",
                " Георгиев ",
                " Петров ",
                "9001154218",
                new DateOnly(1990, 1, 15),
                " pa1234567 ",
                new DateOnly(2030, 5, 1),
                "ivan.petrov@example.com",
                " +359888111222 ",
                " gb ",
                " Test customer "),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CustomerDetailsResponse>(TestCancellationToken);
        Assert.NotNull(created);
        Assert.Equal("Иван", created.FirstName);
        Assert.Equal("Георгиев", created.MiddleName);
        Assert.Equal("Петров", created.LastName);
        Assert.Equal("PA1234567", created.PassportNumber);
        Assert.Equal("+359888111222", created.PhoneNumber);
        Assert.Equal("GB", created.ResidenceCountryCode);
        Assert.Equal("United Kingdom", created.ResidenceCountryName);
        Assert.Equal("Test customer", created.Notes);
    }

    [Fact]
    public async Task CreateCustomer_DerivesDateOfBirthFromNationalId_WhenDateOfBirthIsMissing()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync(
            "/api/customers",
            new CreateCustomerRequest(
                "Иван",
                null,
                "Петров",
                "8501014017",
                null,
                "PA1234567",
                new DateOnly(2030, 5, 1),
                null,
                null,
                Countries.DefaultCode,
                null),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CustomerDetailsResponse>(TestCancellationToken);
        Assert.NotNull(created);
        Assert.Equal(new DateOnly(1985, 1, 1), created.DateOfBirth);
    }

    [Fact]
    public async Task CreateCustomer_ValidEgn_UsesSuppliedDateOfBirth()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync(
            "/api/customers",
            new CreateCustomerRequest(
                "Иван",
                null,
                "Петров",
                "0101050000",
                new DateOnly(2005, 1, 1),
                "PA1234567",
                new DateOnly(2030, 5, 1),
                null,
                null,
                Countries.DefaultCode,
                null),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CustomerDetailsResponse>(TestCancellationToken);
        Assert.NotNull(created);
        Assert.Equal("0101050000", created.NationalId);
        Assert.Equal(new DateOnly(2005, 1, 1), created.DateOfBirth);
    }

    [Fact]
    public async Task CreateCustomer_ReturnsBadRequest_WhenResidenceCountryCodeIsUnsupported()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/customers",
            CreateRequest(residenceCountryCode: "ZZ"),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>(
            TestCancellationToken);
        Assert.NotNull(problem);
        Assert.Equal(400, problem.Status);
        Assert.True(problem.Errors.ContainsKey(nameof(CreateCustomerRequest.ResidenceCountryCode)));
        Assert.Contains(
            "Residence country code must be a supported European ISO alpha-2 country code.",
            problem.Errors[nameof(CreateCustomerRequest.ResidenceCountryCode)]);
    }

    [Fact]
    public async Task CreateCustomer_EnsureStoresSensitiveValuesProtectedAndHashed_WhenAddToExistingOrNewCustomer()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var response = await client.PostAsJsonAsync("/api/customers",
            CreateRequest(nationalId: "9001154218", passportNumber: "PA1234567"),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<CustomerDetailsResponse>(TestCancellationToken);
        Assert.NotNull(created);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SuiteCaseDbContext>();
        var customer = await db.Customers
            .IgnoreQueryFilters()
            .SingleAsync(c => c.Id == created.Id, TestCancellationToken);

        Assert.NotNull(customer.NationalIdEncrypted);
        Assert.NotNull(customer.NationalIdHash);
        Assert.NotNull(customer.PassportNumberEncrypted);
        Assert.NotNull(customer.PassportNumberHash);
        Assert.NotEqual("9001154218", customer.NationalIdEncrypted);
        Assert.NotEqual("9001154218", customer.NationalIdHash);
        Assert.NotEqual("PA1234567", customer.PassportNumberEncrypted);
        Assert.NotEqual("PA1234567", customer.PassportNumberHash);
    }

    [Fact]
    public async Task CreateCustomer_AllowsSameSensitiveValues_AfterSoftDelete()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var firstResponse = await client.PostAsJsonAsync(
            "/api/customers",
            CreateRequest(nationalId: "9001154218", passportNumber: "PA1234567"),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        var firstCustomer = await firstResponse.Content.ReadFromJsonAsync<CustomerDetailsResponse>(
            TestCancellationToken);
        Assert.NotNull(firstCustomer);

        var deleteResponse = await client.DeleteAsync(
            $"/api/customers/{firstCustomer.Id}",
            TestCancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var recreateResponse = await client.PostAsJsonAsync(
            "/api/customers",
            CreateRequest(
                firstName: "Иван",
                lastName: "Петров",
                nationalId: "9001154218",
                passportNumber: "PA1234567"),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Created, recreateResponse.StatusCode);
    }
}
