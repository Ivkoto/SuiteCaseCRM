using System.Text;
using SuiteCase.Core.Customers;
using SuiteCase.Core.Entities;
using SuiteCase.Server.Features.Customers.DTO;

namespace SuiteCase.Server.Features.Customers;

/// <summary>
/// Creates and updates customer entities from API requests while applying customer normalization rules.
/// </summary>
public static class CustomerFactory
{
    /// <summary>
    /// Creates a new customer entity from a validated create request and prepared sensitive identifier values.
    /// </summary>
    /// <param name="request">The validated create request.</param>
    /// <param name="normalizedNationalId">The normalized national identifier used for date-of-birth resolution, if supplied.</param>
    /// <param name="encryptedNationalId">The encrypted national identifier value to store, if supplied.</param>
    /// <param name="nationalIdHash">The national identifier hash used for lookup and uniqueness checks, if supplied.</param>
    /// <param name="encryptedPassportNumber">The encrypted passport number value to store, if supplied.</param>
    /// <param name="passportNumberHash">The passport number hash used for lookup and uniqueness checks, if supplied.</param>
    /// <param name="residenceCountryCode">The normalized ISO alpha-2 residence country code.</param>
    /// <param name="createdAt">The creation timestamp assigned to the customer.</param>
    /// <returns>The initialized customer entity.</returns>
    public static Customer Create(
        CreateCustomerRequest request, string? normalizedNationalId, string? encryptedNationalId,
        string? nationalIdHash, string? encryptedPassportNumber, string? passportNumberHash,
        string residenceCountryCode, DateTimeOffset createdAt)
    {
        var dateOfBirth = CustomerDateOfBirthResolver.Resolve(normalizedNationalId, request.DateOfBirth);

        Customer customer = new()
        {
            FirstName = request.FirstName.Trim().Normalize(NormalizationForm.FormC),
            MiddleName = NormalizeOptionalText(request.MiddleName)?.Normalize(NormalizationForm.FormC),
            LastName = request.LastName.Trim().Normalize(NormalizationForm.FormC),
            DateOfBirth = dateOfBirth,
            PassportExpiresOn = request.PassportExpiresOn,
            Email = NormalizeOptionalText(request.Email),
            PhoneNumber = NormalizeOptionalText(request.PhoneNumber),
            ResidenceCountryCode = residenceCountryCode,
            Notes = NormalizeOptionalText(request.Notes),
            CreatedAt = createdAt
        };

        customer.SetNationalId(encryptedNationalId, nationalIdHash);
        customer.SetPassportNumber(encryptedPassportNumber, passportNumberHash);

        return customer;
    }

    /// <summary>
    /// Applies a validated update request and prepared sensitive identifier values to an existing customer entity.
    /// </summary>
    /// <param name="customer">The existing customer entity to update.</param>
    /// <param name="request">The validated update request.</param>
    /// <param name="normalizedNationalId">The normalized national identifier used for date-of-birth resolution, if supplied.</param>
    /// <param name="encryptedNationalId">The encrypted national identifier value to store, if supplied.</param>
    /// <param name="nationalIdHash">The national identifier hash used for lookup and uniqueness checks, if supplied.</param>
    /// <param name="encryptedPassportNumber">The encrypted passport number value to store, if supplied.</param>
    /// <param name="passportNumberHash">The passport number hash used for lookup and uniqueness checks, if supplied.</param>
    /// <param name="residenceCountryCode">The normalized ISO alpha-2 residence country code.</param>
    /// <param name="updatedAt">The update timestamp assigned to the customer.</param>
    public static void Update(
        Customer customer, UpdateCustomerRequest request, string? normalizedNationalId,
        string? encryptedNationalId, string? nationalIdHash, string? encryptedPassportNumber,
        string? passportNumberHash, string residenceCountryCode, DateTimeOffset updatedAt)
    {
        var dateOfBirth = CustomerDateOfBirthResolver.Resolve(normalizedNationalId, request.DateOfBirth);

        customer.FirstName = request.FirstName.Trim().Normalize(NormalizationForm.FormC);
        customer.MiddleName = NormalizeOptionalText(request.MiddleName)?.Normalize(NormalizationForm.FormC);
        customer.LastName = request.LastName.Trim().Normalize(NormalizationForm.FormC);
        customer.FirstNameLatin = NormalizeOptionalText(request.FirstNameLatin);
        customer.MiddleNameLatin = NormalizeOptionalText(request.MiddleNameLatin);
        customer.LastNameLatin = NormalizeOptionalText(request.LastNameLatin);

        if (nationalIdHash != customer.NationalIdHash)
            customer.SetNationalId(encryptedNationalId, nationalIdHash);

        customer.DateOfBirth = dateOfBirth;

        if (passportNumberHash != customer.PassportNumberHash)
            customer.SetPassportNumber(encryptedPassportNumber, passportNumberHash);

        customer.PassportExpiresOn = request.PassportExpiresOn;
        customer.Email = NormalizeOptionalText(request.Email);
        customer.PhoneNumber = NormalizeOptionalText(request.PhoneNumber);
        customer.ResidenceCountryCode = residenceCountryCode;
        customer.Notes = NormalizeOptionalText(request.Notes);
        customer.UpdatedAt = updatedAt;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
