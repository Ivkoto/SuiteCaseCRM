import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvalidResponseError } from '../../../lib/http-client';
import type { CustomerDetails, CustomerListItem } from './customer-contracts';
import { getCustomer, listCustomers } from './customers-api';

const VALID_LIST_ITEM = {
  id: 41,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  phoneNumber: '+359000000001',
  dateOfBirth: '1815-12-10',
  age: 36,
  passportExpiresOn: '2030-01-01',
  isPassportValid: true,
  createdAt: '2026-07-19T09:30:00.1234567+03:00',
  updatedAt: null,
} satisfies CustomerListItem;

const VALID_DETAILS = {
  id: 41,
  firstName: 'Ada',
  middleName: null,
  lastName: 'Lovelace',
  firstNameLatin: 'Ada',
  middleNameLatin: null,
  lastNameLatin: 'Lovelace',
  nationalId: 'ZX00000001',
  dateOfBirth: '1815-12-10',
  passportNumber: 'PX90001',
  passportExpiresOn: '2030-01-01',
  email: 'ada@example.test',
  phoneNumber: '+359000000001',
  residenceCountryCode: 'BG',
  residenceCountryName: 'Bulgaria',
  notes: null,
  createdAt: '2026-07-19T06:30:00Z',
  updatedAt: '2026-07-20T10:15:30.25+03:00',
} satisfies CustomerDetails;

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('customer API audit timestamps', () => {
  it('accepts valid timestamps from list and details responses', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage(VALID_LIST_ITEM)))
      .mockResolvedValueOnce(jsonResponse(VALID_DETAILS));

    await expect(listCustomers()).resolves.toEqual(customerPage(VALID_LIST_ITEM));
    await expect(getCustomer(VALID_DETAILS.id)).resolves.toEqual(VALID_DETAILS);
  });

  it('accepts a leap-day timestamp in a leap year', async () => {
    const leapDayItem = {
      ...VALID_LIST_ITEM,
      createdAt: '2024-02-29T09:30:00Z',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(customerPage(leapDayItem)));

    await expect(listCustomers()).resolves.toEqual(customerPage(leapDayItem));
  });

  it('rejects a leap-day timestamp in a non-leap year', async () => {
    const invalidLeapDayItem = {
      ...VALID_LIST_ITEM,
      createdAt: '2026-02-29T09:30:00Z',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(customerPage(invalidLeapDayItem)));

    await expect(listCustomers()).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it.each([
    ['a missing createdAt', omitProperty(VALID_LIST_ITEM, 'createdAt')],
    ['a non-string createdAt', { ...VALID_LIST_ITEM, createdAt: {} }],
    ['a createdAt without an offset', { ...VALID_LIST_ITEM, createdAt: '2026-07-19T09:30:00' }],
    ['an impossible createdAt date', { ...VALID_LIST_ITEM, createdAt: '2026-02-30T09:30:00Z' }],
    ['a missing updatedAt', omitProperty(VALID_LIST_ITEM, 'updatedAt')],
    ['a malformed updatedAt', { ...VALID_LIST_ITEM, updatedAt: 'not-a-date' }],
  ])('rejects a list item with %s', async (_description, item) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(customerPage(item)));

    await expect(listCustomers()).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it.each([
    ['a missing createdAt', omitProperty(VALID_DETAILS, 'createdAt')],
    ['a non-string updatedAt', { ...VALID_DETAILS, updatedAt: {} }],
    ['an invalid offset', { ...VALID_DETAILS, updatedAt: '2026-07-20T10:15:30+15:00' }],
  ])('rejects customer details with %s', async (_description, details) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(details));

    await expect(getCustomer(VALID_DETAILS.id)).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it.each([
    ['a non-object page', []],
    ['non-array items', { ...customerPage(VALID_LIST_ITEM), items: {} }],
    ['an invalid page number', { ...customerPage(VALID_LIST_ITEM), page: 0 }],
  ])('rejects a list response with %s', async (_description, responseBody) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(responseBody));

    await expect(listCustomers()).rejects.toBeInstanceOf(InvalidResponseError);
  });
});

function customerPage(item: unknown) {
  return {
    items: [item],
    page: 1,
    pageSize: 13,
    totalCount: 1,
    totalPages: 1,
  };
}

function omitProperty(
  value: Record<string, unknown>,
  propertyName: string,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([name]) => name !== propertyName),
  );
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
