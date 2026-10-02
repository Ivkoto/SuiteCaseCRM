import type {
  CreateCustomerRequest,
  CustomerDetails,
  UpdateCustomerRequest,
} from '../api/customer-contracts';
import { DEFAULT_COUNTRY_CODE, SUPPORTED_COUNTRIES } from './countries';

export type CustomerFormField = keyof CustomerFormValues;
export type CustomerFormErrors = Partial<Record<CustomerFormField, string>>;

export type CustomerFormValues = {
  firstName: string;
  middleName: string;
  lastName: string;
  firstNameLatin: string;
  middleNameLatin: string;
  lastNameLatin: string;
  nationalId: string;
  dateOfBirth: string;
  passportNumber: string;
  passportExpiresOn: string;
  email: string;
  phoneNumber: string;
  residenceCountryCode: string;
  notes: string;
};

export function createEmptyCustomerForm(): CustomerFormValues {
  return {
    firstName: '',
    middleName: '',
    lastName: '',
    firstNameLatin: '',
    middleNameLatin: '',
    lastNameLatin: '',
    nationalId: '',
    dateOfBirth: '',
    passportNumber: '',
    passportExpiresOn: '',
    email: '',
    phoneNumber: '',
    residenceCountryCode: DEFAULT_COUNTRY_CODE,
    notes: '',
  };
}

export function customerDetailsToForm(details: CustomerDetails): CustomerFormValues {
  return {
    firstName: details.firstName,
    middleName: details.middleName ?? '',
    lastName: details.lastName,
    firstNameLatin: details.firstNameLatin ?? '',
    middleNameLatin: details.middleNameLatin ?? '',
    lastNameLatin: details.lastNameLatin ?? '',
    nationalId: details.nationalId ?? '',
    dateOfBirth: details.dateOfBirth ?? '',
    passportNumber: details.passportNumber ?? '',
    passportExpiresOn: details.passportExpiresOn ?? '',
    email: details.email ?? '',
    phoneNumber: details.phoneNumber ?? '',
    residenceCountryCode: details.residenceCountryCode,
    notes: details.notes ?? '',
  };
}

export function toCreateCustomerRequest(values: CustomerFormValues): CreateCustomerRequest {
  return {
    firstName: values.firstName.trim(),
    middleName: optionalTrim(values.middleName),
    lastName: values.lastName.trim(),
    nationalId: optionalUppercase(values.nationalId),
    dateOfBirth: optionalTrim(values.dateOfBirth),
    passportNumber: optionalUppercase(values.passportNumber),
    passportExpiresOn: optionalTrim(values.passportExpiresOn),
    email: optionalTrim(values.email),
    phoneNumber: optionalTrim(values.phoneNumber),
    residenceCountryCode: optionalUppercase(values.residenceCountryCode),
    notes: optionalTrim(values.notes),
  };
}

export function toUpdateCustomerRequest(values: CustomerFormValues): UpdateCustomerRequest {
  return {
    ...toCreateCustomerRequest(values),
    firstNameLatin: optionalTrim(values.firstNameLatin),
    middleNameLatin: optionalTrim(values.middleNameLatin),
    lastNameLatin: optionalTrim(values.lastNameLatin),
  };
}

export function removeError(
  errors: CustomerFormErrors,
  field: CustomerFormField,
): CustomerFormErrors {
  if (errors[field] === undefined) {
    return errors;
  }

  const nextErrors = { ...errors };
  delete nextErrors[field];
  return nextErrors;
}

export function validateCustomerForm(
  values: CustomerFormValues,
  mode: 'create' | 'edit',
): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  validateRequiredName(values.firstName, 'First name', 'firstName', errors);
  validateOptionalLength(values.middleName, 'Middle name', 'middleName', 2, 100, errors);
  validateRequiredName(values.lastName, 'Last name', 'lastName', errors);

  if (mode === 'edit') {
    validateOptionalLength(
      values.firstNameLatin,
      'Latin first name',
      'firstNameLatin',
      2,
      100,
      errors,
    );
    validateOptionalLength(
      values.middleNameLatin,
      'Latin middle name',
      'middleNameLatin',
      2,
      100,
      errors,
    );
    validateOptionalLength(
      values.lastNameLatin,
      'Latin last name',
      'lastNameLatin',
      2,
      100,
      errors,
    );
  }

  const nationalId = values.nationalId.trim();
  if (nationalId.length > 0 && nationalId.length !== 10) {
    errors.nationalId = 'National ID must contain exactly 10 characters.';
  }

  validateOptionalLength(
    values.passportNumber,
    'Passport number',
    'passportNumber',
    5,
    20,
    errors,
  );

  const email = values.email.trim();
  if (email.length > 254) {
    errors.email = 'Email must not exceed 254 characters.';
  } else if (email.length > 0 && !/^[^\s@]+@[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (values.phoneNumber.trim().length > 20) {
    errors.phoneNumber = 'Phone number must not exceed 20 characters.';
  }

  const countryCode = values.residenceCountryCode.trim().toUpperCase();
  if (!SUPPORTED_COUNTRIES.some((country) => country.code === countryCode)) {
    errors.residenceCountryCode = 'Select a supported residence country.';
  }

  validateOptionalDate(values.dateOfBirth, 'Date of birth', 'dateOfBirth', errors);
  validateOptionalDate(
    values.passportExpiresOn,
    'Passport expiry date',
    'passportExpiresOn',
    errors,
  );

  return errors;
}

function optionalTrim(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function optionalUppercase(value: string): string | null {
  const trimmed = optionalTrim(value);
  return trimmed === null ? null : trimmed.toUpperCase();
}

function validateRequiredName(
  value: string,
  label: string,
  field: 'firstName' | 'lastName',
  errors: CustomerFormErrors,
) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    errors[field] = `${label} is required.`;
  } else if (trimmed.length < 2 || trimmed.length > 100) {
    errors[field] = `${label} must contain between 2 and 100 characters.`;
  }
}

function validateOptionalLength(
  value: string,
  label: string,
  field: CustomerFormField,
  minimum: number,
  maximum: number,
  errors: CustomerFormErrors,
) {
  const length = value.trim().length;
  if (length > 0 && (length < minimum || length > maximum)) {
    errors[field] = `${label} must contain between ${minimum} and ${maximum} characters.`;
  }
}

function validateOptionalDate(
  value: string,
  label: string,
  field: 'dateOfBirth' | 'passportExpiresOn',
  errors: CustomerFormErrors,
) {
  const trimmed = value.trim();
  if (trimmed.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    errors[field] = `${label} must be a valid date.`;
  }
}
