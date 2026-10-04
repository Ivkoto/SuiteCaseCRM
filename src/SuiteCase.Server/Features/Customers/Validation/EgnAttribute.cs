using System.ComponentModel.DataAnnotations;
using SuiteCase.Core.Customers;

namespace SuiteCase.Server.Features.Customers.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class EgnAttribute() : ValidationAttribute("Enter a valid 10-digit EGN.")
{
    public override bool IsValid(object? value) => value is null || value is string nationalId && CustomerValidationRules.IsEgn(nationalId);
}
