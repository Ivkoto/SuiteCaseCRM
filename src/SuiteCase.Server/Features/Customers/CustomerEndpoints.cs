using System.Diagnostics;
using System.Globalization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using SuiteCase.Core.Customers;
using SuiteCase.Core.Entities;
using SuiteCase.Core.Security;
using SuiteCase.Server.Auditing;
using SuiteCase.Server.Common.DTO;
using SuiteCase.Server.Data;
using SuiteCase.Server.Data.ErrorHandling;
using SuiteCase.Server.Features.Customers.Auditing;
using SuiteCase.Server.Features.Customers.DTO;
using SuiteCase.Server.Features.Customers.ErrorHandling;
using SuiteCase.Server.Features.Customers.Logging;
using SuiteCase.Server.Features.Customers.Mapping;
using SuiteCase.Server.Features.Customers.Queries;
using SuiteCase.Server.Features.Customers.Validation;
using SuiteCase.Server.Security;

namespace SuiteCase.Server.Features.Customers;

internal sealed class CustomerEndpointLogs;

public static class CustomerEndpoints
{
    private const string ListCustomersEndpointName = "ListCustomers";
    private const string GetCustomerByIdEndpointName = "GetCustomerById";
    private const string CreateCustomerEndpointName = "CreateCustomer";
    private const string UpdateCustomerEndpointName = "UpdateCustomer";
    private const string SoftDeleteCustomerEndpointName = "SoftDeleteCustomer";

    public static RouteGroupBuilder MapCustomerEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/customers")
            .WithTags("Customers");

        group.MapGet("", GetCustomers)
            .WithName(ListCustomersEndpointName)
            .Produces<PagedResponse<CustomerShortDetailsResponse>>(StatusCodes.Status200OK)
            .ProducesValidationProblem();

        group.MapGet("/{id:int}", GetCustomerById)
            .WithName(GetCustomerByIdEndpointName)
            .Produces<CustomerDetailsResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("", CreateCustomer)
            .WithName(CreateCustomerEndpointName)
            .Produces<CustomerDetailsResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesValidationProblem();

        group.MapPut("/{id:int}", UpdateCustomer)
            .WithName(UpdateCustomerEndpointName)
            .Produces<CustomerDetailsResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesValidationProblem();

        group.MapDelete("/{id:int}", SoftDeleteCustomer)
            .WithName(SoftDeleteCustomerEndpointName)
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<Ok<PagedResponse<CustomerShortDetailsResponse>>> GetCustomers(
        [AsParameters] CustomerQueryParameters parameters, SuiteCaseDbContext db,
        ISensitiveDataProtector dataProtector, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var existingCustomers = db.Customers.AsNoTracking();
        var query = CustomerQueries.ApplySearch(existingCustomers, parameters.Search, dataProtector);
        var totalCount = await query.CountAsync(ct);

        var customers = await query
            .OrderBy(c => c.FirstName)
            .ThenBy(c => c.LastName)
            .ThenBy(c => c.Id)
            .Skip((parameters.Page - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(c => new
            {
                c.Id,
                c.FirstName,
                c.LastName,
                c.Email,
                c.PhoneNumber,
                c.DateOfBirth,
                c.PassportExpiresOn,
                c.CreatedAt,
                c.UpdatedAt
            })
            .ToListAsync(ct);

        var response = customers
            .Select(c => new CustomerShortDetailsResponse(
                c.Id,
                c.FirstName,
                c.LastName,
                c.Email,
                c.PhoneNumber,
                c.DateOfBirth,
                CustomerAgeCalculator.CalculateAge(c.DateOfBirth, today),
                c.PassportExpiresOn,
                CustomerPassportHelper.IsValid(c.PassportExpiresOn, today),
                c.CreatedAt,
                c.UpdatedAt))
            .ToList();

        var totalPages = (int)Math.Ceiling(totalCount / (double)parameters.PageSize);

        return TypedResults.Ok(new PagedResponse<CustomerShortDetailsResponse>(
            response,
            parameters.Page,
            parameters.PageSize,
            totalCount,
            totalPages));
    }

    private static async Task<Results<Ok<CustomerDetailsResponse>, ProblemHttpResult>> GetCustomerById(
        int id, HttpContext httpContext, SuiteCaseDbContext db,
        ISensitiveDataProtector dataProtector, ILogger<CustomerEndpointLogs> logger,
        CancellationToken ct)
    {
        var customer = await db.Customers.AsNoTracking().SingleOrDefaultAsync(c => c.Id == id, ct);

        if (customer is null)
        {
            CustomerEndpointLogger.CustomerNotFoundOnDetailsRequest(logger, id);
            return CustomerHttpResultProblems.NotFound(httpContext);
        }

        return TypedResults.Ok(customer.ToCustomerDetailsResponse(dataProtector));
    }

    private static async Task<Results<CreatedAtRoute<CustomerDetailsResponse>, ProblemHttpResult, ValidationProblem>> CreateCustomer(
        CreateCustomerRequest request, HttpContext httpContext, SuiteCaseDbContext db,
        ISensitiveDataProtector dataProtector, IAuditEventWriter auditEventWriter,
        ILogger<CustomerEndpointLogs> logger, CancellationToken ct)
    {
        var isValidCountryCode = CustomerCountryCodeResolver.TryGetValidResidenceCountryCode(request.ResidenceCountryCode, out var residenceCountryCode);
        if (!isValidCountryCode)
            return CustomerValidationProblem.InvalidResidenceCountryCode();

        var normalizedNationalId = request.NationalId.NormalizeSensitiveValue();
        var normalizedPassportNumber = request.PassportNumber.NormalizeSensitiveValue();

        var nationalIdHash = normalizedNationalId is null ? null : dataProtector.Hash(normalizedNationalId);
        var passportNumberHash = normalizedPassportNumber is null ? null : dataProtector.Hash(normalizedPassportNumber);

        if (nationalIdHash is not null)
        {
            var existingCustomerId = await db.Customers
                .Where(c => c.NationalIdHash == nationalIdHash)
                .Select(c => (int?)c.Id)
                .SingleOrDefaultAsync(ct);

            if (existingCustomerId is not null)
            {
                CustomerEndpointLogger.CustomerCreateRejectedDuplicateNationalId(logger);
                return CustomerHttpResultProblems.DuplicateNationalId(httpContext, existingCustomerId.Value);
            }
        }

        if (passportNumberHash is not null)
        {
            var existingCustomerId = await db.Customers
                .Where(c => c.PassportNumberHash == passportNumberHash)
                .Select(c => (int?)c.Id)
                .SingleOrDefaultAsync(ct);

            if (existingCustomerId is not null)
            {
                CustomerEndpointLogger.CustomerCreateRejectedDuplicatePassportNumber(logger);
                return CustomerHttpResultProblems.DuplicatePassportNumber(httpContext, existingCustomerId.Value);
            }
        }

        var encryptedNationalId = normalizedNationalId is null ? null : dataProtector.Protect(normalizedNationalId);
        var encryptedPassportNumber = normalizedPassportNumber is null ? null : dataProtector.Protect(normalizedPassportNumber);
        var createdAt = DateTimeOffset.UtcNow;
        var auditOperationId = Guid.CreateVersion7();
        var correlationId = Activity.Current?.Id ?? httpContext.TraceIdentifier;
        Customer customer;

        try
        {
            customer = await AuditTransaction.ExecuteAsync(db, auditOperationId,
                async operationCt =>
                {
                    db.ChangeTracker.Clear();

                    var newCustomer = CustomerFactory.Create(
                        request, normalizedNationalId, encryptedNationalId, nationalIdHash,
                        encryptedPassportNumber, passportNumberHash, residenceCountryCode, createdAt);

                    db.Customers.Add(newCustomer);
                    await db.SaveChangesAsync(operationCt);

                    auditEventWriter.Record(
                        auditOperationId,
                        CustomerAuditActions.Created,
                        CustomerAuditActions.EntityType,
                        newCustomer.Id.ToString(CultureInfo.InvariantCulture),
                        correlationId);
                    await db.SaveChangesAsync(operationCt);

                    return newCustomer;
                }, ct);
        }
        catch (DbUpdateException ex) when (SqlServerExceptionClassifier.IsUniqueConstraintViolation(ex))
        {
            var conflict = await CustomerQueries.FindSensitiveIdentifierConflictAsync(
                db, nationalIdHash, passportNumberHash, null, ct);

            if (conflict is null) throw;

            CustomerEndpointLogger.CustomerCreateUniqueConstraintRaceConflict(logger, conflict.Kind, ex);
            return CustomerHttpResultProblems.FromSensitiveIdentifierConflict(httpContext, conflict);
        }

        CustomerEndpointLogger.CustomerCreated(logger, customer.Id);

        return TypedResults.CreatedAtRoute(
            customer.ToCustomerDetailsResponse(dataProtector),
            GetCustomerByIdEndpointName,
            new { id = customer.Id }
        );
    }

    private static async Task<Results<Ok<CustomerDetailsResponse>, ProblemHttpResult, ValidationProblem>> UpdateCustomer(
        int id, UpdateCustomerRequest request, HttpContext httpContext, SuiteCaseDbContext db,
        ISensitiveDataProtector dataProtector, IAuditEventWriter auditEventWriter,
        ILogger<CustomerEndpointLogs> logger, CancellationToken ct)
    {
        var currentCustomer = await db.Customers.SingleOrDefaultAsync(c => c.Id == id, ct);

        if (currentCustomer is null)
        {
            CustomerEndpointLogger.CustomerNotFoundOnUpdateRequest(logger, id);
            return CustomerHttpResultProblems.NotFound(httpContext);
        }

        var isValidCountryCode = CustomerCountryCodeResolver.TryGetValidResidenceCountryCode(request.ResidenceCountryCode, out var residenceCountryCode);
        if (!isValidCountryCode)
            return CustomerValidationProblem.InvalidResidenceCountryCode();

        var normalizedNationalId = request.NationalId.NormalizeSensitiveValue();
        var normalizedPassportNumber = request.PassportNumber.NormalizeSensitiveValue();

        var nationalIdHash = normalizedNationalId is null ? null : dataProtector.Hash(normalizedNationalId);
        var passportNumberHash = normalizedPassportNumber is null ? null : dataProtector.Hash(normalizedPassportNumber);

        var nationalIdChanged = nationalIdHash != currentCustomer.NationalIdHash;
        var passportNumberChanged = passportNumberHash != currentCustomer.PassportNumberHash;

        if (nationalIdChanged && nationalIdHash is not null)
        {
            var existingCustomerId = await db.Customers
                .Where(c => c.Id != id && c.NationalIdHash == nationalIdHash)
                .Select(c => (int?)c.Id)
                .SingleOrDefaultAsync(ct);

            if (existingCustomerId is not null)
            {
                CustomerEndpointLogger.CustomerUpdateRejectedDuplicateNationalId(logger, id);
                return CustomerHttpResultProblems.DuplicateNationalId(httpContext, existingCustomerId.Value);
            }
        }

        if (passportNumberChanged && passportNumberHash is not null)
        {
            var existingCustomerId = await db.Customers
                .Where(c => c.Id != id && c.PassportNumberHash == passportNumberHash)
                .Select(c => (int?)c.Id)
                .SingleOrDefaultAsync(ct);

            if (existingCustomerId is not null)
            {
                CustomerEndpointLogger.CustomerUpdateRejectedDuplicatePassportNumber(logger, id);
                return CustomerHttpResultProblems.DuplicatePassportNumber(httpContext, existingCustomerId.Value);
            }
        }

        var encryptedNationalId = nationalIdChanged ? 
            normalizedNationalId is null ? null : dataProtector.Protect(normalizedNationalId)
            : currentCustomer.NationalIdEncrypted;

        var encryptedPassportNumber = passportNumberChanged ?
            normalizedPassportNumber is null ? null : dataProtector.Protect(normalizedPassportNumber)
            : currentCustomer.PassportNumberEncrypted;

        CustomerFactory.Update(
            currentCustomer, request, normalizedNationalId, encryptedNationalId,
            nationalIdHash, encryptedPassportNumber, passportNumberHash, residenceCountryCode, DateTimeOffset.UtcNow);

        var auditOperationId = Guid.CreateVersion7();
        var correlationId = Activity.Current?.Id ?? httpContext.TraceIdentifier;

        auditEventWriter.Record(
            auditOperationId,
            CustomerAuditActions.Updated,
            CustomerAuditActions.EntityType,
            id.ToString(CultureInfo.InvariantCulture),
            correlationId);

        try
        {
            await AuditTransaction.CommitTrackedChangesAsync(db, auditOperationId, ct);
        }
        catch (DbUpdateException ex) when (SqlServerExceptionClassifier.IsUniqueConstraintViolation(ex))
        {
            var conflict = await CustomerQueries.FindSensitiveIdentifierConflictAsync(
                db, nationalIdHash, passportNumberHash, id, ct);

            if (conflict is null) throw;

            CustomerEndpointLogger.CustomerUpdateUniqueConstraintRaceConflict(logger, id, conflict.Kind, ex);
            return CustomerHttpResultProblems.FromSensitiveIdentifierConflict(httpContext, conflict);
        }

        CustomerEndpointLogger.CustomerUpdated(logger, id);

        return TypedResults.Ok(currentCustomer.ToCustomerDetailsResponse(dataProtector));
    }

    private static async Task<Results<NoContent, ProblemHttpResult>> SoftDeleteCustomer(
        int id, HttpContext httpContext, SuiteCaseDbContext db,
        IAuditEventWriter auditEventWriter, ILogger<CustomerEndpointLogs> logger, CancellationToken ct)
    {
        var currentCustomer = await db.Customers.SingleOrDefaultAsync(c => c.Id == id, ct);

        if (currentCustomer is null)
        {
            CustomerEndpointLogger.CustomerNotFoundOnDeleteRequest(logger, id);
            return CustomerHttpResultProblems.NotFound(httpContext);
        }

        currentCustomer.SoftDelete(DateTimeOffset.UtcNow);
        var auditOperationId = Guid.CreateVersion7();
        var correlationId = Activity.Current?.Id ?? httpContext.TraceIdentifier;

        auditEventWriter.Record(
            auditOperationId,
            CustomerAuditActions.SoftDeleted,
            CustomerAuditActions.EntityType,
            id.ToString(CultureInfo.InvariantCulture),
            correlationId);
        await AuditTransaction.CommitTrackedChangesAsync(db, auditOperationId, ct);

        CustomerEndpointLogger.CustomerSoftDeleted(logger, id);

        return TypedResults.NoContent();
    }
}
