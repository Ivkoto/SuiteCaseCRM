using System.ComponentModel.DataAnnotations;
using SuiteCase.Core.Customers;

namespace SuiteCase.Server.Features.Customers.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class LatinNameAttribute() : ValidationAttribute("Name must contain between 2 and 100 characters, using only English letters (A–Z) with internal spaces or hyphens.")
{
    public override bool IsValid(object? value) => value is null || value is string name && CustomerValidationRules.IsLatinName(name);
}
