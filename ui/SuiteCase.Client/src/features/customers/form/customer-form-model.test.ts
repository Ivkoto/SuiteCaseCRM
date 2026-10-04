import { describe, expect, it } from 'vitest';
import {
  createEmptyCustomerForm,
  toCreateCustomerRequest,
  toUpdateCustomerRequest,
  tryExtractEgnDateOfBirth,
  validateCustomerForm,
  type CustomerFormValues,
} from './customer-form-model';

function createFormValues(
  overrides: Partial<CustomerFormValues> = {},
): CustomerFormValues {
  return {
    ...createEmptyCustomerForm(),
    firstName: 'Ада',
    lastName: 'Лъвлейс',
    ...overrides,
  };
}

describe('customer form request mapping', () => {
  it('normalizes create values and excludes server-managed Latin names', () => {
    const request = toCreateCustomerRequest(createFormValues({
      firstName: '  Ada  ',
      middleName: '   ',
      lastName: '  Lovelace ',
      firstNameLatin: 'Should not be sent',
      middleNameLatin: 'Should not be sent',
      lastNameLatin: 'Should not be sent',
      nationalId: ' ab12345678 ',
      dateOfBirth: ' 1815-12-10 ',
      passportNumber: ' pa12345 ',
      passportExpiresOn: ' 2030-01-01 ',
      email: ' ada@example.test ',
      phoneNumber: ' +359000000000 ',
      residenceCountryCode: ' bg ',
      notes: '  Prefers written correspondence. ',
    }));

    expect(request).toEqual({
      firstName: 'Ada',
      middleName: null,
      lastName: 'Lovelace',
      nationalId: 'AB12345678',
      dateOfBirth: '1815-12-10',
      passportNumber: 'PA12345',
      passportExpiresOn: '2030-01-01',
      email: 'ada@example.test',
      phoneNumber: '+359000000000',
      residenceCountryCode: 'BG',
      notes: 'Prefers written correspondence.',
    });
    expect(request).not.toHaveProperty('firstNameLatin');
    expect(request).not.toHaveProperty('middleNameLatin');
    expect(request).not.toHaveProperty('lastNameLatin');
  });

  it('builds a full replacement update and represents cleared fields as null', () => {
    const request = toUpdateCustomerRequest(createFormValues({
      firstName: '  Ada ',
      middleName: '',
      lastName: ' Lovelace  ',
      firstNameLatin: '  Ada ',
      middleNameLatin: ' ',
      lastNameLatin: ' Lovelace ',
      nationalId: '',
      dateOfBirth: '',
      passportNumber: ' px90001 ',
      passportExpiresOn: '',
      email: ' ',
      phoneNumber: ' +359000000001 ',
      residenceCountryCode: ' gb ',
      notes: '',
    }));

    expect(request).toEqual({
      firstName: 'Ada',
      middleName: null,
      lastName: 'Lovelace',
      firstNameLatin: 'Ada',
      middleNameLatin: null,
      lastNameLatin: 'Lovelace',
      nationalId: null,
      dateOfBirth: null,
      passportNumber: 'PX90001',
      passportExpiresOn: null,
      email: null,
      phoneNumber: '+359000000001',
      residenceCountryCode: 'GB',
      notes: null,
    });
  });
});

describe('customer form validation', () => {
  it('accepts trimmed Bulgarian names and ASCII Latin names with internal separators', () => {
    expect(validateCustomerForm(createFormValues({
      firstName: '  Анна-Мария ',
      middleName: ' Йордан ',
      lastName: ' Иванова Петрова ',
      firstNameLatin: ' Anna-Maria ',
      middleNameLatin: ' Jordan ',
      lastNameLatin: ' Ivanova Petrova ',
    }), 'edit')).toEqual({});
  });

  it.each(['АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ', 'абвгдежзийклмнопрстуфхцчшщъьюя', 'АѝЍ'])(
    'accepts Bulgarian letters: %s',
    (firstName) => {
      expect(validateCustomerForm(createFormValues({ firstName }), 'create').firstName)
        .toBeUndefined();
    },
  );

  it.each(['Ada', 'Иван2', 'Ивaн', 'Анна--Мария', 'Анна  Мария', 'Анна- Мария', '-Анна', 'Анна-', 'Анна\tМария', 'Анна\nМария', 'Ива\u0482', 'Ива\u0483', 'Аы', 'АЫ', 'Аэ', 'АЭ', 'Аё', 'Аї', 'Ає', 'Аґ', 'Ађ', 'Аћ', 'Аљ', 'Ањ', 'АӢ', 'А\ua641', 'А\u{1e030}'])(
    'rejects an invalid Bulgarian name: %s',
    (firstName) => {
      expect(validateCustomerForm(createFormValues({ firstName }), 'create').firstName)
        .toContain('only Bulgarian letters');
    },
  );

  it.each(['José', 'Иван', "O'Connor", 'Anna2', 'Anna--Maria', 'Anna  Maria'])(
    'rejects an invalid ASCII Latin name: %s',
    (firstNameLatin) => {
      expect(validateCustomerForm(createFormValues({ firstNameLatin }), 'edit').firstNameLatin)
        .toContain('only English letters');
    },
  );

  it('validates the alphabet of every optional name field', () => {
    expect(validateCustomerForm(createFormValues({
      middleName: 'Latin',
      firstNameLatin: 'Петър',
      middleNameLatin: 'Петров',
      lastNameLatin: 'Петров',
    }), 'edit')).toEqual({
      middleName: expect.stringContaining('only Bulgarian letters'),
      firstNameLatin: expect.stringContaining('only English letters'),
      middleNameLatin: expect.stringContaining('only English letters'),
      lastNameLatin: expect.stringContaining('only English letters'),
    });
  });

  it.each(['', ' ', '0885986062', '+359885986062', '359885986062', '+35902859864', '02859862', '+442071838750', '+12025550123', '1', '+1', '1'.repeat(20), '+' + '1'.repeat(19)])(
    'accepts a phone format without checking country-specific numbering: %s',
    (phoneNumber) => {
      expect(validateCustomerForm(createFormValues({ phoneNumber }), 'create').phoneNumber)
        .toBeUndefined();
    },
  );

  it.each(['+', '++359885986062', '359+885986062', '+359 885986062', '(02)859862', '02-859862', '02.859862', 'abc', '٠٢٨٥٩٨٦٢', '０２８５９８６２']) (
    'rejects an invalid phone format: %s',
    (phoneNumber) => {
      expect(validateCustomerForm(createFormValues({ phoneNumber }), 'create').phoneNumber)
        .toContain('only digits and an optional leading +');
    },
  );

  it.each(['', ' ', '9001010000', '1532100016', '0042290000', '9921010007', '9001010020']) (
    'accepts absent EGN or a valid date and checksum: %s',
    (nationalId) => {
      expect(validateCustomerForm(createFormValues({ nationalId }), 'create').nationalId)
        .toBeUndefined();
    },
  );

  it.each(['123', 'ABCDEFGHIJ', '９００１０１００００', '9001010001', '9902290000', '0042300006', '9022300008', '9021000006', '9000010000', '9013010000', '9033010000', '9053010000']) (
    'rejects malformed EGN, invalid date or checksum: %s',
    (nationalId) => {
      expect(validateCustomerForm(createFormValues({ nationalId }), 'create').nationalId)
        .toBe('Enter a valid 10-digit EGN.');
      expect(tryExtractEgnDateOfBirth(nationalId)).toBeNull();
    },
  );

  it.each(['', ' ', 'user@example.com', 'user@example.bg', 'user+tag@mail.example.co.uk', 'асас@пример.бг'])(
    'accepts absent email or an email with a domain suffix: %s',
    (email) => {
      expect(validateCustomerForm(createFormValues({ email }), 'create').email)
        .toBeUndefined();
    },
  );

  it.each(['user@example', 'асас@асас', 'user@.com', 'user@example.', 'user@example..com', 'user name@example.com', 'user@@example.com'])(
    'rejects malformed email or a missing domain suffix: %s',
    (email) => {
      expect(validateCustomerForm(createFormValues({ email }), 'create').email)
        .toBe('Enter a valid email address, such as name@example.com.');
    },
  );

  it('keeps notes as Unicode plain text and caps their normalized length at 4000', () => {
    expect(validateCustomerForm(createFormValues({
      notes: 'Пътуване ✈️\nContact: user@example.test\n<script>plain text</script>',
    }), 'create')).toEqual({});
    expect(validateCustomerForm(createFormValues({ notes: 'я'.repeat(4000) }), 'create')).toEqual({});
    expect(validateCustomerForm(createFormValues({ notes: 'я'.repeat(4001) }), 'create').notes)
      .toBe('Notes must not exceed 4000 characters.');
  });

  it('retains passport length validation without country-specific format rules', () => {
    expect(validateCustomerForm(createFormValues({ passportNumber: 'A-12 X' }), 'create'))
      .toEqual({});
    expect(validateCustomerForm(createFormValues({ passportNumber: 'A'.repeat(21) }), 'create').passportNumber)
      .toBe('Passport number must contain between 5 and 20 characters.');
  });

  it('ignores Latin-name fields during create and validates them during edit', () => {
    const values = createFormValues({
      firstNameLatin: 'A',
      middleNameLatin: 'B',
      lastNameLatin: 'C',
    });

    expect(validateCustomerForm(values, 'create')).toEqual({});
    expect(validateCustomerForm(values, 'edit')).toMatchObject({
      firstNameLatin: 'Latin first name must contain between 2 and 100 characters.',
      middleNameLatin: 'Latin middle name must contain between 2 and 100 characters.',
      lastNameLatin: 'Latin last name must contain between 2 and 100 characters.',
    });
  });

  it('returns field-specific errors for invalid customer data', () => {
    const errors = validateCustomerForm(createFormValues({
      firstName: ' ',
      lastName: 'L',
      nationalId: '123',
      dateOfBirth: '1815/12/10',
      passportNumber: 'P1',
      passportExpiresOn: '2030/01/01',
      email: 'not-an-email',
      phoneNumber: '1'.repeat(21),
      residenceCountryCode: 'ZZ',
    }), 'create');

    expect(errors).toMatchObject({
      firstName: 'First name is required.',
      lastName: 'Last name must contain between 2 and 100 characters.',
      nationalId: 'Enter a valid 10-digit EGN.',
      dateOfBirth: 'Date of birth must be a valid date.',
      passportNumber: 'Passport number must contain between 5 and 20 characters.',
      passportExpiresOn: 'Passport expiry date must be a valid date.',
      email: 'Enter a valid email address, such as name@example.com.',
      phoneNumber: 'Phone number must not exceed 20 characters.',
      residenceCountryCode: 'Select a supported residence country.',
    });
  });
});

describe('EGN birth date extraction', () => {
  it.each([
    ['8711095306', '1987-11-09'],
    ['9001010000', '1990-01-01'],
    ['1532100016', '1815-12-10'],
    ['0042290000', '2000-02-29'],
    ['9921010007', '1899-01-01'],
    ['9001010020', '1990-01-01'],
    [' 8501014017 ', '1985-01-01'],
  ])('extracts %s as %s', (nationalId, dateOfBirth) => {
    expect(tryExtractEgnDateOfBirth(nationalId)).toBe(dateOfBirth);
  });

  it.each(['', ' '])('returns no birth date for an absent EGN: %s', (nationalId) => {
    expect(tryExtractEgnDateOfBirth(nationalId)).toBeNull();
  });
});
