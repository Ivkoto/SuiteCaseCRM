using System.ComponentModel.DataAnnotations;
using SuiteCase.Core.Customers;

namespace SuiteCase.Server.Features.Customers.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class PhoneNumberFormatAttribute()
    : ValidationAttribute("Phone number must contain only digits and may start with a single '+'.")
{
    public override bool IsValid(object? value) => value is null || value is string number && CustomerValidationRules.IsPhoneNumberFormat(number);
}
