using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SuiteCase.Server.Data;
using SuiteCase.Server.Features.Customers.DTO;

namespace SuiteCase.IntegrationTests.Customers;

[Collection(SqlServerCollection.Name)]
public sealed class CustomerValidationEndpointTests(SqlServerFixture sqlServer)
    : CustomerEndpointTestBase(sqlServer)
{
    [Fact]
    public async Task CreateCustomer_RejectsInvalidFields_WithoutWritingCustomerOrAuditEvent()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        foreach (var (field, request) in InvalidCreateRequests())
        {
            var response = await client.PostAsJsonAsync("/api/customers", request, TestCancellationToken);

            await AssertFieldValidationErrorAsync(response, field);
        }

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SuiteCaseDbContext>();
        Assert.False(await db.Customers.IgnoreQueryFilters().AnyAsync(TestCancellationToken));
        Assert.False(await db.AuditEvents.AnyAsync(TestCancellationToken));
    }

    [Fact]
    public async Task UpdateCustomer_RejectsInvalidFields_WithoutChangingCustomerOrWritingAuditEvent()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);
        var created = await CreateCustomerAsync(client, CreateRequest());

        var invalidRequests = InvalidCreateRequests()
            .Select(item => (item.Field, Request: ToUpdateRequest(item.Request)))
            .Concat(InvalidLatinNameRequests());

        foreach (var (field, request) in invalidRequests)
        {
            var response = await client.PutAsJsonAsync(
                $"/api/customers/{created.Id}", request, TestCancellationToken);

            await AssertFieldValidationErrorAsync(response, field);
        }

        var current = await client.GetFromJsonAsync<CustomerDetailsResponse>(
            $"/api/customers/{created.Id}", TestCancellationToken);
        Assert.Equal(created, current);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SuiteCaseDbContext>();
        Assert.Single(await db.Customers.IgnoreQueryFilters().ToListAsync(TestCancellationToken));
        Assert.Single(await db.AuditEvents.ToListAsync(TestCancellationToken));
    }

    [Fact]
    public async Task CreateCustomer_AcceptsDomesticAndInternationalPhoneFormats_WithoutCheckingCountryRules()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);

        string[] phoneNumbers =
        [
            "0885986062",
            "+359885986062",
            "359885986062",
            "+35902859864",
            "02859862",
            "+12025550123",
            "+442079460958",
            "+999123456",
            "+1234567890123456789"
        ];

        foreach (var phoneNumber in phoneNumbers)
        {
            var created = await CreateCustomerAsync(client, CreateRequest(
                nationalId: null, passportNumber: null, phoneNumber: phoneNumber));

            Assert.Equal(phoneNumber, created.PhoneNumber);
        }
    }

    [Fact]
    public async Task CreateAndUpdateCustomer_AcceptEmailDomainSuffixes_WithoutAnAllowlist()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);
        var request = CreateRequest(email: "user@example.bg");
        var created = await CreateCustomerAsync(client, request);
        Assert.Equal(request.Email, created.Email);

        foreach (var email in new[] { "user@example.com", "user+tag@mail.example.co.uk", "асас@пример.бг" })
        {
            var response = await client.PutAsJsonAsync(
                $"/api/customers/{created.Id}", ToUpdateRequest(request) with { Email = email }, TestCancellationToken);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var updated = await response.Content.ReadFromJsonAsync<CustomerDetailsResponse>(TestCancellationToken);
            Assert.NotNull(updated);
            Assert.Equal(email, updated.Email);
        }
    }

    [Fact]
    public async Task CreateAndUpdateCustomer_AcceptCompoundNamesAndPlainUnicodeNotesAtLengthLimit()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);
        const string notesPrefix = "Бележка\n🙂 <script>alert('text')</script>\n";
        var notes = notesPrefix + new string('x', 4000 - notesPrefix.Length);
        var request = CreateRequest(firstName: "Анна-Мария", middleName: "Иван Георгиев") with
        {
            LastName = new string('П', 100),
            Notes = notes
        };

        var created = await CreateCustomerAsync(client, request);
        Assert.Equal(request.FirstName, created.FirstName);
        Assert.Equal(request.MiddleName, created.MiddleName);
        Assert.Equal(request.LastName, created.LastName);
        Assert.Equal(notes, created.Notes);

        var updateRequest = ToUpdateRequest(request) with
        {
            FirstNameLatin = "Anna-Maria",
            MiddleNameLatin = "Ivan Georgiev",
            LastNameLatin = new string('P', 100),
            PhoneNumber = "+442079460958"
        };
        var response = await client.PutAsJsonAsync(
            $"/api/customers/{created.Id}", updateRequest, TestCancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<CustomerDetailsResponse>(TestCancellationToken);
        Assert.NotNull(updated);
        Assert.Equal(updateRequest.FirstNameLatin, updated.FirstNameLatin);
        Assert.Equal(updateRequest.MiddleNameLatin, updated.MiddleNameLatin);
        Assert.Equal(updateRequest.LastNameLatin, updated.LastNameLatin);
        Assert.Equal(updateRequest.PhoneNumber, updated.PhoneNumber);
        Assert.Equal(notes, updated.Notes);
    }

    [Fact]
    public async Task CreateAndUpdateCustomer_AcceptMissingOptionalFields()
    {
        using var factory = CreateFactory();
        using var client = CreateClient(factory);
        var request = CreateRequest(
            firstName: "Ия", middleName: null, lastName: "Ли",
            nationalId: null, passportNumber: null, email: null, phoneNumber: null) with
        {
            DateOfBirth = null,
            PassportExpiresOn = null,
            Notes = null
        };

        var created = await CreateCustomerAsync(client, request);
        Assert.Null(created.NationalId);
        Assert.Null(created.DateOfBirth);

        var response = await client.PutAsJsonAsync(
            $"/api/customers/{created.Id}", ToUpdateRequest(request), TestCancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<CustomerDetailsResponse>(TestCancellationToken);
        Assert.NotNull(updated);
        Assert.Null(updated.MiddleName);
        Assert.Null(updated.FirstNameLatin);
        Assert.Null(updated.MiddleNameLatin);
        Assert.Null(updated.LastNameLatin);
        Assert.Null(updated.NationalId);
        Assert.Null(updated.PassportNumber);
        Assert.Null(updated.Email);
        Assert.Null(updated.PhoneNumber);
        Assert.Null(updated.Notes);
    }

    private static IEnumerable<(string Field, CreateCustomerRequest Request)> InvalidCreateRequests()
    {
        var request = CreateRequest();
        yield return (nameof(request.FirstName), request with { FirstName = "Ivan" });
        yield return (nameof(request.FirstName), request with { FirstName = "Пётр" });
        yield return (nameof(request.LastName), request with { LastName = "Малышев" });
        yield return (nameof(request.MiddleName), request with { MiddleName = "Іван" });
        yield return (nameof(request.FirstName), request with { FirstName = "Иван1" });
        yield return (nameof(request.FirstName), request with { FirstName = "Анна--Мария" });
        yield return (nameof(request.FirstName), request with { FirstName = "Анна  Мария" });
        yield return (nameof(request.FirstName), request with { FirstName = "И" });
        yield return (nameof(request.FirstName), request with { FirstName = " И " });
        yield return (nameof(request.FirstName), request with { FirstName = new string('И', 101) });
        yield return (nameof(request.MiddleName), request with { MiddleName = "Georgiev" });
        yield return (nameof(request.LastName), request with { LastName = "Петров!" });
        foreach (var email in new[]
        {
            "invalid-email", "user@example", "асас@асас", "user@.com", "user@example.", "user@example..com"
        })
        {
            yield return (nameof(request.Email), request with { Email = email });
        }

        foreach (var phoneNumber in new[]
        {
            "088 5986062", "088-5986062", "(088)5986062", "359+885986062", "++359885986062",
            "+", "+359abc", "٠٨٨٥٩٨٦٠٦٢", "123456789012345678901"
        })
        {
            yield return (nameof(request.PhoneNumber), request with { PhoneNumber = phoneNumber });
        }

        foreach (var nationalId in new[]
        {
            "ABCDEFGHIJ", "850101401", "8501014018", "9013150008", "9002300003", "٨٥٠١٠١٤٠١٧"
        })
        {
            yield return (nameof(request.NationalId), request with { NationalId = nationalId });
        }

        yield return (nameof(request.Notes), request with { Notes = new string('x', 4001) });
    }

    private static IEnumerable<(string Field, UpdateCustomerRequest Request)> InvalidLatinNameRequests()
    {
        var request = ToUpdateRequest(CreateRequest());
        yield return (nameof(request.FirstNameLatin), request with { FirstNameLatin = "Иван" });
        yield return (nameof(request.FirstNameLatin), request with { FirstNameLatin = "José" });
        yield return (nameof(request.FirstNameLatin), request with { FirstNameLatin = " I " });
        yield return (nameof(request.MiddleNameLatin), request with { MiddleNameLatin = "Ivan2" });
        yield return (nameof(request.LastNameLatin), request with { LastNameLatin = "O'Connor" });
        yield return (nameof(request.LastNameLatin), request with { LastNameLatin = "Ivan--Petrov" });
        yield return (nameof(request.LastNameLatin), request with { LastNameLatin = new string('P', 101) });
    }

    private static UpdateCustomerRequest ToUpdateRequest(CreateCustomerRequest request)
        => new(
            request.FirstName,
            request.MiddleName,
            request.LastName,
            null,
            null,
            null,
            request.NationalId,
            request.DateOfBirth,
            request.PassportNumber,
            request.PassportExpiresOn,
            request.Email,
            request.PhoneNumber,
            request.ResidenceCountryCode,
            request.Notes);

    private static async Task AssertFieldValidationErrorAsync(HttpResponseMessage response, string field)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>(TestCancellationToken);
        Assert.NotNull(problem);
        Assert.Equal(400, problem.Status);
        var error = Assert.Single(problem.Errors);
        Assert.Equal(field, error.Key, StringComparer.OrdinalIgnoreCase);
        Assert.NotEmpty(error.Value);
        if (field == nameof(CreateCustomerRequest.NationalId))
        {
            Assert.Contains("Enter a valid 10-digit EGN.", error.Value);
        }
    }
}
