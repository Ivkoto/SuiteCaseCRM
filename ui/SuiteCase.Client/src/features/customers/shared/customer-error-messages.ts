import { getValidationErrors, InvalidResponseError, isHttpError } from '../../../lib/http-client';
import {
  CUSTOMER_ERROR_CODES,
} from '../api/customer-contracts';
import type { CustomerFormErrors, CustomerFormField } from '../form/customer-form-model';

const FORM_FIELDS: readonly CustomerFormField[] = [
  'firstName',
  'middleName',
  'lastName',
  'firstNameLatin',
  'middleNameLatin',
  'lastNameLatin',
  'nationalId',
  'dateOfBirth',
  'passportNumber',
  'passportExpiresOn',
  'email',
  'phoneNumber',
  'residenceCountryCode',
  'notes',
];

export type CustomerSubmissionError = Readonly<{
  fieldErrors: CustomerFormErrors;
  message: string | null;
}>;

export function describeCustomerSubmissionError(error: unknown): CustomerSubmissionError {
  if (error instanceof InvalidResponseError) {
    return {
      fieldErrors: {},
      message: 'The server returned an unexpected response, so the result could not be confirmed. '
        + 'The change may already have been saved. Check the customer directory before submitting again.',
    };
  }

  if (!isHttpError(error)) {
    return {
      fieldErrors: {},
      message: 'The request could not be completed, so the result could not be confirmed. '
        + 'The change may already have been saved. Check the customer directory before submitting again.',
    };
  }

  const fieldErrors: CustomerFormErrors = {};
  for (const field of FORM_FIELDS) {
    const messages = getValidationErrors(error, field);
    if (messages.length > 0) {
      fieldErrors[field] = messages.join(' ');
    }
  }

  const code = error.code;
  if (code === CUSTOMER_ERROR_CODES.duplicateNationalId) {
    fieldErrors.nationalId = duplicateMessage(
      'Another active customer already uses this National ID.',
      error.problem.existingCustomerId,
    );
  }

  if (code === CUSTOMER_ERROR_CODES.duplicatePassportNumber) {
    fieldErrors.passportNumber = duplicateMessage(
      'Another active customer already uses this passport number.',
      error.problem.existingCustomerId,
    );
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: null };
  }

  if (code === CUSTOMER_ERROR_CODES.notFound) {
    return {
      fieldErrors,
      message: withReference('This customer no longer exists.', error.problem.traceId),
    };
  }

  if (error.status === 400) {
    return {
      fieldErrors,
      message: withReference(
        'Some customer information is invalid. Review the form and try again.',
        error.problem.traceId,
      ),
    };
  }

  return {
    fieldErrors,
    message: withReference(
      'The request could not be completed. Try again.',
      error.problem.traceId,
    ),
  };
}

export function describeCustomerLoadError(error: unknown): string {
  if (isHttpError(error)) {
    if (error.code === CUSTOMER_ERROR_CODES.notFound) {
      return withReference('This customer no longer exists.', error.problem.traceId);
    }

    return withReference(
      'Customer information could not be loaded. Try again.',
      error.problem.traceId,
    );
  }

  return 'Customer information could not be loaded. Check your connection and try again.';
}

export function describeCustomerListError(error: unknown): string {
  if (isHttpError(error)) {
    return withReference(
      'The customer directory could not be loaded. Try again.',
      error.problem.traceId,
    );
  }

  return 'The customer directory could not be loaded. Check your connection and try again.';
}

function duplicateMessage(message: string, existingCustomerId?: number): string {
  return existingCustomerId === undefined
    ? message
    : `${message} Existing customer #${existingCustomerId}.`;
}

function withReference(message: string, traceId?: string): string {
  return traceId === undefined ? message : `${message} Reference: ${traceId}`;
}
