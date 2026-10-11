using SuiteCase.Core.Customers;

namespace SuiteCase.UnitTests.Core.Customers;

public sealed class CustomerValidationRulesTests
{
    [Theory]
    [InlineData("Иван", true)]
    [InlineData("Анна-Мария", true)]
    [InlineData("Де Соуза", true)]
    [InlineData("  Иван  ", true)]
    [InlineData("АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ", true)]
    [InlineData("абвгдежзийклмнопрстуфхцчшщъьюя", true)]
    [InlineData("АѝЍ", true)]
    [InlineData("Пётр", true)]
    [InlineData("Іван", true)]
    [InlineData("Anna-Maria", true)]
    [InlineData("De la Cruz", true)]
    [InlineData("José", true)]
    [InlineData("Zoë", true)]
    [InlineData("Łukasz", true)]
    [InlineData("Müller", true)]
    [InlineData("Αννα", true)]
    [InlineData("李明", true)]
    [InlineData("\U00010400\U00010428", true)]
    [InlineData(" А ", false)]
    [InlineData("Ivan", true)]
    [InlineData("Ивaн", true)]
    [InlineData("Иван2", false)]
    [InlineData("Иван\u0482", false)]
    [InlineData("Иван\u0483", false)]
    [InlineData("Иван🙂", false)]
    [InlineData("O'Neil", false)]
    [InlineData("Ivan.Petrov", false)]
    [InlineData("Анна--Мария", false)]
    [InlineData("Анна  Мария", false)]
    [InlineData("Анна- Мария", false)]
    [InlineData("-Иван", false)]
    [InlineData("Иван-", false)]
    [InlineData("Иван\nПетров", false)]
    public void IsCustomerName_NameFormat_ReturnsExpectedValidity(string value, bool expected)
        => Assert.Equal(expected, CustomerValidationRules.IsCustomerName(value));

    [Theory]
    [InlineData("Jose\u0301")]
    [InlineData("Mu\u0308ller")]
    [InlineData("И\u0306ордан")]
    [InlineData("  Jose\u0301-Mu\u0308ller  ")]
    public void IsCustomerName_DecomposedLetters_ReturnsTrue(string value)
        => Assert.True(CustomerValidationRules.IsCustomerName(value));

    [Theory]
    [InlineData(1, false)]
    [InlineData(2, true)]
    [InlineData(100, true)]
    [InlineData(101, false)]
    public void IsCustomerName_DecomposedLetters_ChecksNormalizedLength(int length, bool expected)
    {
        var name = string.Concat(Enumerable.Repeat("e\u0301", length));

        Assert.Equal(expected, CustomerValidationRules.IsCustomerName(name));
    }

    [Fact]
    public void IsCustomerName_InvalidUtf16_ReturnsFalse()
    {
        Assert.False(CustomerValidationRules.IsCustomerName("A\uD800"));
        Assert.False(CustomerValidationRules.IsCustomerName("A\uDC00"));
    }

    [Theory]
    [InlineData(1, false)]
    [InlineData(2, true)]
    [InlineData(100, true)]
    [InlineData(101, false)]
    public void NameRules_NameLength_ReturnExpectedValidity(int length, bool expected)
    {
        var name = new string('A', length);

        Assert.Equal(expected, CustomerValidationRules.IsCustomerName(name));
        Assert.Equal(expected, CustomerValidationRules.IsLatinName(name));
    }

    [Theory]
    [InlineData("Ivan", true)]
    [InlineData("ANNA-MARIA", true)]
    [InlineData("De Souza", true)]
    [InlineData("  Ivan  ", true)]
    [InlineData(" I ", false)]
    [InlineData("Иван", false)]
    [InlineData("José", false)]
    [InlineData("Jose\u0301", false)]
    [InlineData("Ivаn", false)]
    [InlineData("Ivan2", false)]
    [InlineData("O'Neil", false)]
    [InlineData("Anna--Maria", false)]
    [InlineData("Anna  Maria", false)]
    [InlineData("-Ivan", false)]
    [InlineData("Ivan-", false)]
    [InlineData("Ivan\nPetrov", false)]
    public void IsLatinName_NameFormat_ReturnsExpectedValidity(string value, bool expected)
        => Assert.Equal(expected, CustomerValidationRules.IsLatinName(value));

    [Theory]
    [InlineData("0885986062", true)]
    [InlineData("+359885986062", true)]
    [InlineData("359885986062", true)]
    [InlineData("+35902859864", true)]
    [InlineData("02859862", true)]
    [InlineData("+442079460958", true)]
    [InlineData("+12025550123", true)]
    [InlineData("+9991234567", true)]
    [InlineData(" +442079460958 ", true)]
    [InlineData("+", false)]
    [InlineData("++359885986062", false)]
    [InlineData("359+885986062", false)]
    [InlineData("0885 986062", false)]
    [InlineData("0885-986062", false)]
    [InlineData("(0885)986062", false)]
    [InlineData("0885986062x1", false)]
    [InlineData("\u0661\u0662\u0663", false)]
    [InlineData("0885\n986062", false)]
    public void IsPhoneNumberFormat_NumberFormat_ReturnsExpectedValidity(string value, bool expected)
        => Assert.Equal(expected, CustomerValidationRules.IsPhoneNumberFormat(value));

    [Theory]
    [InlineData("user@example.com", true)]
    [InlineData("user@example.bg", true)]
    [InlineData("user+tag@mail.example.co.uk", true)]
    [InlineData("асас@пример.бг", true)]
    [InlineData(" user@example.com ", true)]
    [InlineData("user@example", false)]
    [InlineData("асас@асас", false)]
    [InlineData("user@.com", false)]
    [InlineData("user@example.", false)]
    [InlineData("user@example..com", false)]
    [InlineData("user name@example.com", false)]
    [InlineData("user@@example.com", false)]
    public void HasEmailDomainSuffix_EmailFormat_ReturnsExpectedValidity(string value, bool expected)
        => Assert.Equal(expected, CustomerValidationRules.HasEmailDomainSuffix(value));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidationRules_OptionalValueIsMissing_ReturnTrue(string? value)
    {
        Assert.True(CustomerValidationRules.IsCustomerName(value));
        Assert.True(CustomerValidationRules.IsLatinName(value));
        Assert.True(CustomerValidationRules.IsPhoneNumberFormat(value));
        Assert.True(CustomerValidationRules.IsEgn(value));
        Assert.True(CustomerValidationRules.HasEmailDomainSuffix(value));
    }

    [Theory]
    [InlineData("8501014017", true)]
    [InlineData(" 8501014017 ", true)]
    [InlineData("0145100010", true)]
    [InlineData("9932310011", true)]
    [InlineData("8501010500", true)]
    [InlineData("8501014018", false)]
    [InlineData("0115850000", false)]
    [InlineData("AB12345678", false)]
    public void IsEgn_SuppliedIdentifier_ReturnsHelperValidity(string value, bool expected)
        => Assert.Equal(expected, CustomerValidationRules.IsEgn(value));
}
