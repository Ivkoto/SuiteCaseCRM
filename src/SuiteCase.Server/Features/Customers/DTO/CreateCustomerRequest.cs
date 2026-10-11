using System.ComponentModel.DataAnnotations;
using SuiteCase.Core.Customers;
using SuiteCase.Server.Features.Customers.Validation;

namespace SuiteCase.Server.Features.Customers.DTO;

public sealed record CreateCustomerRequest(
    [Required, MaxLength(100), MinLength(2), CustomerName]
    string FirstName,

    [MaxLength(100), MinLength(2), CustomerName]
    string? MiddleName,

    [Required, MaxLength(100), MinLength(2), CustomerName]
    string LastName,

    [Egn]
    string? NationalId,

    DateOnly? DateOfBirth,

    [Length(5, 20)]
    string? PassportNumber,

    DateOnly? PassportExpiresOn,

    [EmailAddress, EmailDomain, MaxLength(254)]
    string? Email,

    [MaxLength(20), PhoneNumberFormat]
    string? PhoneNumber,

    string? ResidenceCountryCode,

    [MaxLength(CustomerValidationRules.MaximumNotesLength)]
    string? Notes
);
