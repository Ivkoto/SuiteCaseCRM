using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using SuiteCase.Server.Features.Customers.DTO;

namespace SuiteCase.IntegrationTests.Customers;

[Collection(SqlServerCollection.Name)]
public sealed class CustomerReadEndpointTests(SqlServerFixture sqlServer)
    : CustomerEndpointTestBase(sqlServer)
{
    [Fact]
    public async Task GetCustomers_ReturnsPassportValidityFalse_WhenPassportExpiresBeforeSixMonthRule()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var passportExpiresBeforeSixMonths = today.AddMonths(6).AddDays(-1);

        var response = await client.PostAsJsonAsync("/api/customers",
            CreateRequest(
                nationalId: "8507120058",
                passportNumber: "PB6543210",
                passportExpiresOn: passportExpiresBeforeSixMonths),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var list = await GetCustomersAsync(client);
        Assert.Equal(1, list.Page);
        Assert.Equal(13, list.PageSize);
        Assert.Equal(1, list.TotalCount);
        Assert.Equal(1, list.TotalPages);
        var listCustomer = Assert.Single(list.Items);
        Assert.Equal(passportExpiresBeforeSixMonths, listCustomer.PassportExpiresOn);
        Assert.False(listCustomer.IsPassportValid);
    }

    [Fact]
    public async Task GetCustomers_ReturnsRequestedPageWithStableNameOrderingAndMetadata()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var customers = new[]
        {
            ("Анна", "Зета", "9001150017", "PA00001"),
            ("Анна", "Алфа", "9001150022", "PA00002"),
            ("Борис", "Бета", "9001150038", "PA00003"),
            ("Даниел", "Делта", "9001150043", "PA00004"),
            ("Елена", "Епсилон", "9001150059", "PA00005")
        };

        foreach (var (firstName, lastName, nationalId, passportNumber) in customers)
        {
            await CreateCustomerAsync(client, CreateRequest(
                firstName: firstName,
                middleName: null,
                lastName: lastName,
                nationalId: nationalId,
                passportNumber: passportNumber));
        }

        var firstPage = await GetCustomersAsync(client, "?page=1&pageSize=2");
        var secondPage = await GetCustomersAsync(client, "?page=2&pageSize=2");
        var thirdPage = await GetCustomersAsync(client, "?page=3&pageSize=2");

        Assert.Equal(5, firstPage.TotalCount);
        Assert.Equal(3, firstPage.TotalPages);
        Assert.Equal(1, firstPage.Page);
        Assert.Equal(2, firstPage.PageSize);
        Assert.Collection(
            firstPage.Items,
            customer => Assert.Equal(("Анна", "Алфа"), (customer.FirstName, customer.LastName)),
            customer => Assert.Equal(("Анна", "Зета"), (customer.FirstName, customer.LastName)));

        Assert.Equal(2, secondPage.Page);
        Assert.Collection(
            secondPage.Items,
            customer => Assert.Equal(("Борис", "Бета"), (customer.FirstName, customer.LastName)),
            customer => Assert.Equal(("Даниел", "Делта"), (customer.FirstName, customer.LastName)));

        Assert.Equal(3, thirdPage.Page);
        var finalCustomer = Assert.Single(thirdPage.Items);
        Assert.Equal(("Елена", "Епсилон"), (finalCustomer.FirstName, finalCustomer.LastName));
    }

    [Fact]
    public async Task GetCustomers_ReturnsEmptyPageWithMetadata_WhenRequestedPageIsAfterLastPage()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        await CreateCustomerAsync(client, CreateRequest(
            nationalId: "9001150315",
            passportNumber: "PD00031"));

        var result = await GetCustomersAsync(client, "?page=3&pageSize=2");

        Assert.Equal(3, result.Page);
        Assert.Equal(2, result.PageSize);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(1, result.TotalPages);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task GetCustomers_UsesIdAsStableTieBreaker_WhenCustomersHaveTheSameName()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var firstCustomer = await CreateCustomerAsync(client, CreateRequest(
            firstName: "Иван",
            lastName: "Петров",
            nationalId: "9001150320",
            passportNumber: "PD00032"));
        var secondCustomer = await CreateCustomerAsync(client, CreateRequest(
            firstName: "Иван",
            lastName: "Петров",
            nationalId: "9001150336",
            passportNumber: "PD00033"));

        var firstPage = await GetCustomersAsync(client, "?page=1&pageSize=1");
        var secondPage = await GetCustomersAsync(client, "?page=2&pageSize=1");

        Assert.Equal(firstCustomer.Id, Assert.Single(firstPage.Items).Id);
        Assert.Equal(secondCustomer.Id, Assert.Single(secondPage.Items).Id);
    }

    [Theory]
    [InlineData("?page=0&pageSize=13")]
    [InlineData("?page=1000001&pageSize=13")]
    [InlineData("?page=1&pageSize=0")]
    [InlineData("?page=1&pageSize=101")]
    [InlineData("?search=abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvw")]
    public async Task GetCustomers_ReturnsBadRequest_WhenPaginationParametersAreInvalid(string queryString)
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var response = await client.GetAsync($"/api/customers{queryString}", TestCancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>(
            TestCancellationToken);
        Assert.NotNull(problem);
        Assert.Equal(400, problem.Status);
        Assert.NotEmpty(problem.Errors);
    }

    [Fact]
    public async Task GetCustomers_FindsCustomerByPartialBulgarianName()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var created = await CreateCustomerAsync(client, CreateRequest(
            firstName: "Иван",
            middleName: "Георгиев",
            lastName: "Петров",
            nationalId: "9001150104",
            passportNumber: "PB00010"));

        foreach (var searchTerm in new[] { "ива", "еор", "етро" })
        {
            var result = await GetCustomersAsync(
                client,
                $"?search={Uri.EscapeDataString(searchTerm)}");

            var customer = Assert.Single(result.Items);
            Assert.Equal(created.Id, customer.Id);
        }
    }

    [Fact]
    public async Task GetCustomers_FindsCustomerByPartialLatinName()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var created = await CreateCustomerAsync(client, CreateRequest(
            firstName: "Александър",
            middleName: "Георгиев",
            lastName: "Димитров",
            nationalId: "9001150110",
            passportNumber: "PB00011"));

        var updateResponse = await client.PutAsJsonAsync(
            $"/api/customers/{created.Id}",
            new UpdateCustomerRequest(
                created.FirstName,
                created.MiddleName,
                created.LastName,
                "Aleksandar",
                "Georgiev",
                "Dimitrov",
                created.NationalId,
                created.DateOfBirth,
                created.PassportNumber,
                created.PassportExpiresOn,
                created.Email,
                created.PhoneNumber,
                created.ResidenceCountryCode,
                created.Notes),
            TestCancellationToken);

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        foreach (var searchTerm in new[] { "leks", "eorg", "imit" })
        {
            var result = await GetCustomersAsync(client, $"?search={searchTerm}");

            var customer = Assert.Single(result.Items);
            Assert.Equal(created.Id, customer.Id);
        }
    }

    [Fact]
    public async Task GetCustomers_FindsCustomerByPartialNormalizedPhoneNumber()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var created = await CreateCustomerAsync(client, CreateRequest(
            nationalId: "9001150125",
            passportNumber: "PB00012",
            phoneNumber: "+359888111222"));

        var result = await GetCustomersAsync(client, "?search=888111");

        var customer = Assert.Single(result.Items);
        Assert.Equal(created.Id, customer.Id);
    }

    [Fact]
    public async Task GetCustomers_MatchesSensitiveIdentifiersOnlyByExactValue()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var created = await CreateCustomerAsync(client, CreateRequest(
            nationalId: "8501014017",
            passportNumber: "XY987654",
            email: null,
            phoneNumber: null));

        var nationalIdResult = await GetCustomersAsync(
            client,
            $"?search={Uri.EscapeDataString(" 8501014017 ")}");
        var passportResult = await GetCustomersAsync(
            client,
            $"?search={Uri.EscapeDataString(" xy987654 ")}");
        var partialNationalIdResult = await GetCustomersAsync(client, "?search=1014");
        var partialPassportResult = await GetCustomersAsync(client, "?search=9876");

        Assert.Equal(created.Id, Assert.Single(nationalIdResult.Items).Id);
        Assert.Equal(created.Id, Assert.Single(passportResult.Items).Id);
        Assert.Empty(partialNationalIdResult.Items);
        Assert.Empty(partialPassportResult.Items);
    }

    [Fact]
    public async Task GetCustomers_AppliesSearchBeforePagination()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var customers = new[]
        {
            ("Мила", "9001150212", "PC00021"),
            ("Мина", "9001150228", "PC00022"),
            ("Мира", "9001150233", "PC00023"),
            ("Зара", "9001150249", "PC00024")
        };

        foreach (var (firstName, nationalId, passportNumber) in customers)
        {
            await CreateCustomerAsync(client, CreateRequest(
                firstName: firstName,
                middleName: null,
                nationalId: nationalId,
                passportNumber: passportNumber));
        }

        var result = await GetCustomersAsync(client, $"?page=2&pageSize=2&search={Uri.EscapeDataString("Ми")}");

        Assert.Equal(2, result.Page);
        Assert.Equal(2, result.PageSize);
        Assert.Equal(3, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        var customer = Assert.Single(result.Items);
        Assert.Equal("Мира", customer.FirstName);
    }

    [Fact]
    public async Task GetCustomerById_ReturnsProblemDetails404_WhenCustomerDoesNotExist()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        var response = await client.GetAsync("/api/customers/99999", TestCancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(TestCancellationToken);
        Assert.NotNull(problem);
        Assert.Equal(404, problem.Status);
        Assert.Equal("Customer not found", problem.Title);
        Assert.Equal("Customer not found.", problem.Detail);

        Assert.True(problem.Extensions.ContainsKey("code"));
        Assert.Equal("customer.not_found", problem.Extensions["code"]!.ToString());

        Assert.True(problem.Extensions.ContainsKey("traceId"));
        Assert.False(string.IsNullOrWhiteSpace(problem.Extensions["traceId"]!.ToString()));
    }
}
