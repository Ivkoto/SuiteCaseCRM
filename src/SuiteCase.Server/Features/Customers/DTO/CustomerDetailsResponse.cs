namespace SuiteCase.Server.Features.Customers.DTO;

public sealed record CustomerDetailsResponse(
    int Id,
    string FirstName,
    string? MiddleName,
    string LastName,
    string? FirstNameLatin,
    string? MiddleNameLatin,
    string? LastNameLatin,
    string? NationalId,
    DateOnly? DateOfBirth,
    string? PassportNumber,
    DateOnly? PassportExpiresOn,
    string? Email,
    string? PhoneNumber,
    string ResidenceCountryCode,
    string ResidenceCountryName,
    string? Notes,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);
