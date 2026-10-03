namespace SuiteCase.Server.Features.Customers.DTO;

public sealed record CustomerShortDetailsResponse(
    int Id,
    string FirstName,
    string LastName,
    string? Email,
    string? PhoneNumber,
    DateOnly? DateOfBirth,
    int? Age,
    DateOnly? PassportExpiresOn,
    bool IsPassportValid,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);
