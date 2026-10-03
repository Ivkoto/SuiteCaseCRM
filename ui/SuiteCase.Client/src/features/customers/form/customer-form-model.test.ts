import { describe, expect, it } from 'vitest';
import {
  createEmptyCustomerForm,
  toCreateCustomerRequest,
  toUpdateCustomerRequest,
  validateCustomerForm,
  type CustomerFormValues,
} from './customer-form-model';

function createFormValues(
  overrides: Partial<CustomerFormValues> = {},
): CustomerFormValues {
  return {
    ...createEmptyCustomerForm(),
    firstName: 'Ada',
    lastName: 'Lovelace',
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
      nationalId: 'National ID must contain exactly 10 characters.',
      dateOfBirth: 'Date of birth must be a valid date.',
      passportNumber: 'Passport number must contain between 5 and 20 characters.',
      passportExpiresOn: 'Passport expiry date must be a valid date.',
      email: 'Enter a valid email address.',
      phoneNumber: 'Phone number must not exceed 20 characters.',
      residenceCountryCode: 'Select a supported residence country.',
    });
  });
});
