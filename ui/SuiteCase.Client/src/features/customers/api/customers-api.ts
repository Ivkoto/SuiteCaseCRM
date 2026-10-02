import { requestEmpty, requestJson } from '../../../lib/http-client';
import type {
  CreateCustomerRequest,
  CustomerDetails,
  CustomerListItem,
  CustomerListQuery,
  IsoDate,
  IsoDateTime,
  PagedResponse,
  UpdateCustomerRequest,
} from './customer-contracts';

const CUSTOMERS_PATH = '/api/customers';
const ISO_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,7})?(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/;

export async function listCustomers(query: CustomerListQuery = {}, signal?: AbortSignal,): Promise<PagedResponse<CustomerListItem>> {
  const searchParams = new URLSearchParams();

  if (query.page !== undefined) { searchParams.set('page', String(query.page)); }

  if (query.pageSize !== undefined) { searchParams.set('pageSize', String(query.pageSize)); }

  if (query.search !== undefined) { searchParams.set('search', query.search); }

  const queryString = searchParams.toString();
  const path = queryString.length === 0
    ? CUSTOMERS_PATH
    : `${CUSTOMERS_PATH}?${queryString}`;

  return requestJson(path, { signal, expectedStatus: 200, validate: isCustomerListResponse, });
}

export async function getCustomer(id: number, signal?: AbortSignal,): Promise<CustomerDetails> {
  return requestJson(customerPath(id), {
    signal,
    expectedStatus: 200,
    validate: isCustomerDetails,
  });
}

export async function createCustomer(request: CreateCustomerRequest, signal?: AbortSignal,): Promise<CustomerDetails> {
  return requestJson(CUSTOMERS_PATH, {
    method: 'POST',
    body: request,
    signal,
    expectedStatus: 201,
    validate: isCustomerDetails,
  });
}

export async function updateCustomer( id: number, request: UpdateCustomerRequest, signal?: AbortSignal,): Promise<CustomerDetails> {
  return requestJson(customerPath(id), {
    method: 'PUT',
    body: request,
    signal,
    expectedStatus: 200,
    validate: isCustomerDetails,
  });
}

export async function deleteCustomer( id: number, signal?: AbortSignal,): Promise<void> {
  return requestEmpty(customerPath(id), {
    method: 'DELETE',
    signal,
    expectedStatus: 204,
  });
}

function customerPath(id: number): string {
  return `${CUSTOMERS_PATH}/${id}`;
}

function isCustomerListResponse( value: unknown,): value is PagedResponse<CustomerListItem> {
  if (!isRecord(value)) {
    return false;
  }

  return Array.isArray(value.items)
    && value.items.every(isCustomerListItem)
    && isPositiveInteger(value.page)
    && isPositiveInteger(value.pageSize)
    && isNonNegativeInteger(value.totalCount)
    && isNonNegativeInteger(value.totalPages);
}

function isCustomerListItem(value: unknown): value is CustomerListItem {
  if (!isRecord(value)) {
    return false;
  }

  return isPositiveInteger(value.id)
    && typeof value.firstName === 'string'
    && typeof value.lastName === 'string'
    && isNullableString(value.email)
    && isNullableString(value.phoneNumber)
    && isNullableIsoDate(value.dateOfBirth)
    && (value.age === null || isInteger(value.age))
    && isNullableIsoDate(value.passportExpiresOn)
    && typeof value.isPassportValid === 'boolean'
    && isIsoDateTime(value.createdAt)
    && isNullableIsoDateTime(value.updatedAt);
}

function isCustomerDetails(value: unknown): value is CustomerDetails {
  if (!isRecord(value)) {
    return false;
  }

  return isPositiveInteger(value.id)
    && typeof value.firstName === 'string'
    && isNullableString(value.middleName)
    && typeof value.lastName === 'string'
    && isNullableString(value.firstNameLatin)
    && isNullableString(value.middleNameLatin)
    && isNullableString(value.lastNameLatin)
    && isNullableString(value.nationalId)
    && isNullableIsoDate(value.dateOfBirth)
    && isNullableString(value.passportNumber)
    && isNullableIsoDate(value.passportExpiresOn)
    && isNullableString(value.email)
    && isNullableString(value.phoneNumber)
    && isCountryCode(value.residenceCountryCode)
    && typeof value.residenceCountryName === 'string'
    && isNullableString(value.notes)
    && isIsoDateTime(value.createdAt)
    && isNullableIsoDateTime(value.updatedAt);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableIsoDate(value: unknown): value is IsoDate | null {
  return value === null || isIsoDate(value);
}

function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isNullableIsoDateTime(value: unknown): value is IsoDateTime | null {
  return value === null || isIsoDateTime(value);
}

function isIsoDateTime(value: unknown): value is IsoDateTime {
  if (typeof value !== 'string') {
    return false;
  }

  const match = ISO_DATE_TIME_PATTERN.exec(value);
  if (match === null) {
    return false;
  }

  return isValidCalendarDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  );
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maximumDay = daysInMonth[month - 1];

  return year >= 1
    && maximumDay !== undefined
    && day >= 1
    && day <= maximumDay;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isCountryCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value);
}
