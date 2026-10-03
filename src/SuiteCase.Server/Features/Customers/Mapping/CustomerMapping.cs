using SuiteCase.Core.Countries;
using SuiteCase.Core.Entities;
using SuiteCase.Core.Security;
using SuiteCase.Server.Features.Customers.DTO;

namespace SuiteCase.Server.Features.Customers.Mapping;

/// <summary>
/// Maps customer entities to customer API response models.
/// </summary>
public static class CustomerMapping
{
    /// <summary>
    /// Maps a customer entity to its detailed API response and decrypts protected identifiers.
    /// </summary>
    /// <param name="customer">The customer to map.</param>
    /// <param name="dataProtector">The data protector used to decrypt sensitive identifiers.</param>
    /// <returns>The detailed customer response.</returns>
    public static CustomerDetailsResponse ToCustomerDetailsResponse(this Customer customer, ISensitiveDataProtector dataProtector)
        => new(
            customer.Id,
            customer.FirstName,
            customer.MiddleName,
            customer.LastName,
            customer.FirstNameLatin,
            customer.MiddleNameLatin,
            customer.LastNameLatin,
            customer.NationalIdEncrypted is null ? null : dataProtector.Unprotect(customer.NationalIdEncrypted),
            customer.DateOfBirth,
            customer.PassportNumberEncrypted is null ? null : dataProtector.Unprotect(customer.PassportNumberEncrypted),
            customer.PassportExpiresOn,
            customer.Email,
            customer.PhoneNumber,
            customer.ResidenceCountryCode, Countries.GetName(customer.ResidenceCountryCode),
            customer.Notes,
            customer.CreatedAt,
            customer.UpdatedAt
        );
}
