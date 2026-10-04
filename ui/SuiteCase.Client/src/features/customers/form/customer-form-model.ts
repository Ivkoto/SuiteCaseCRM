import type {
  CreateCustomerRequest,
  CustomerDetails,
  UpdateCustomerRequest,
} from '../api/customer-contracts';
import { DEFAULT_COUNTRY_CODE, SUPPORTED_COUNTRIES } from './countries';

export const MAXIMUM_NOTES_LENGTH = 4000;

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

  const bulgarianLetter = /^[А-ЪЬЮЯа-ъьюяЍѝ]$/;
  const latinLetter = /^[A-Za-z]$/;

  validateName(values.firstName, 'First name', 'firstName', true, bulgarianLetter, 'Bulgarian', errors);
  validateName(values.middleName, 'Middle name', 'middleName', false, bulgarianLetter, 'Bulgarian', errors);
  validateName(values.lastName, 'Last name', 'lastName', true, bulgarianLetter, 'Bulgarian', errors);

  if (mode === 'edit') {
    validateName(
      values.firstNameLatin,
      'Latin first name',
      'firstNameLatin',
      false,
      latinLetter,
      'English',
      errors,
    );
    validateName(
      values.middleNameLatin,
      'Latin middle name',
      'middleNameLatin',
      false,
      latinLetter,
      'English',
      errors,
    );
    validateName(
      values.lastNameLatin,
      'Latin last name',
      'lastNameLatin',
      false,
      latinLetter,
      'English',
      errors,
    );
  }

  const nationalId = values.nationalId.trim();
  if (nationalId.length > 0 && tryExtractEgnDateOfBirth(nationalId) === null) {
    errors.nationalId = 'Enter a valid 10-digit EGN.';
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
  } else if (email.length > 0 && !/^[^\s@]+@[^.\s@]+(?:\.[^.\s@]+)+$/.test(email)) {
    errors.email = 'Enter a valid email address, such as name@example.com.';
  }

  const phoneNumber = values.phoneNumber.trim();
  if (phoneNumber.length > 20) {
    errors.phoneNumber = 'Phone number must not exceed 20 characters.';
  } else if (phoneNumber.length > 0 && !/^\+?[0-9]+$/.test(phoneNumber)) {
    errors.phoneNumber = 'Phone number must contain only digits and an optional leading +.';
  }

  if (values.notes.trim().length > MAXIMUM_NOTES_LENGTH) {
    errors.notes = `Notes must not exceed ${MAXIMUM_NOTES_LENGTH} characters.`;
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

function validateName(
  value: string,
  label: string,
  field: CustomerFormField,
  required: boolean,
  pattern: RegExp,
  alphabet: 'Bulgarian' | 'English',
  errors: CustomerFormErrors,
) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (required) {
      errors[field] = `${label} is required.`;
    }
  } else if (trimmed.length < 2 || trimmed.length > 100) {
    errors[field] = `${label} must contain between 2 and 100 characters.`;
  } else if (!trimmed.split(/[ -]/).every((part) => part.length > 0
    && Array.from(part).every((letter) => pattern.test(letter)))) {
    errors[field] = `${label} must contain only ${alphabet} letters. Single spaces or hyphens between name parts are allowed.`;
  }
}

export function tryExtractEgnDateOfBirth(value: string): string | null {
  const normalized = value.trim();
  if (!/^[0-9]{10}$/.test(normalized)) {
    return null;
  }

  let year = Number(normalized.slice(0, 2));
  let month = Number(normalized.slice(2, 4));
  const day = Number(normalized.slice(4, 6));
  if (month >= 1 && month <= 12) {
    year += 1900;
  } else if (month >= 21 && month <= 32) {
    year += 1800;
    month -= 20;
  } else if (month >= 41 && month <= 52) {
    year += 2000;
    month -= 40;
  } else {
    return null;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) {
    return null;
  }

  const weights = [2, 4, 8, 5, 10, 9, 7, 3, 6];
  const sum = weights.reduce((total, weight, index) => total + Number(normalized[index]) * weight, 0);
  const remainder = sum % 11;
  if (Number(normalized[9]) !== (remainder === 10 ? 0 : remainder)) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
