using System.ComponentModel.DataAnnotations;
using SuiteCase.Core.Customers;

namespace SuiteCase.Server.Features.Customers.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class EmailDomainAttribute() : ValidationAttribute("Enter a valid email address, such as name@example.com.")
{
    public override bool IsValid(object? value) => value is null || value is string email && CustomerValidationRules.HasEmailDomainSuffix(email);
}
