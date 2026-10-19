using System.Text;
using System.Text.RegularExpressions;

namespace SuiteCase.Core.Customers;

public static class CustomerValidationRules
{
    public const int MaximumNotesLength = 4000;

    public static bool IsCustomerName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;

        try
        {
            return IsName(value.Normalize(NormalizationForm.FormC), Rune.IsLetter);
        }
        catch (ArgumentException)
        {
            return false;
        }
    }

    public static bool IsLatinName(string? value)
        => IsName(value, character => character.Value is >= 'A' and <= 'Z' or >= 'a' and <= 'z');

    public static bool IsPhoneNumberFormat(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;

        var number = value.Trim().AsSpan();
        if (number[0] == '+') number = number[1..];
        if (number.IsEmpty) return false;

        foreach (var character in number)
        {
            if (character is not (>= '0' and <= '9')) return false;
        }

        return true;
    }

    public static bool IsEgn(string? value)
        => string.IsNullOrWhiteSpace(value) || CustomerEgnHelper.TryExtractDateOfBirth(value.Trim()) is not null;

    public static bool HasEmailDomainSuffix(string? value)
        => string.IsNullOrWhiteSpace(value) || Regex.IsMatch(value.Trim(), @"\A[^\s@]+@[^.\s@]+(?:\.[^.\s@]+)+\z");

    private static bool IsName(string? value, Func<Rune, bool> isLetter)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;

        var name = value.Trim();
        if (name.Length > 100) return false;

        var requiresLetter = true;
        var scalarCount = 0;
        
        foreach (var character in name.EnumerateRunes())
        {
            scalarCount++;
            if (isLetter(character))
                requiresLetter = false;
            else if (!requiresLetter && character.Value is ' ' or '-')
                requiresLetter = true;
            else
                return false;
        }

        return !requiresLetter && scalarCount >= 2;
    }
}
