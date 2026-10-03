import { describe, expect, it } from 'vitest';
import type { CustomerDetails } from '../api/customer-contracts';
import { formatAuditDate, formatDate, formatFullName } from './customer-format';

const BASE_CUSTOMER = {
  id: 41,
  firstName: 'Ivan',
  middleName: null,
  lastName: 'Ivanov',
  firstNameLatin: 'Ivan',
  middleNameLatin: null,
  lastNameLatin: 'Ivanov',
  nationalId: 'ZX00000001',
  dateOfBirth: '1986-09-21',
  passportNumber: 'PX90001',
  passportExpiresOn: '2030-01-01',
  email: 'ivan@example.test',
  phoneNumber: '+359000000001',
  residenceCountryCode: 'BG',
  residenceCountryName: 'Bulgaria',
  notes: null,
  createdAt: '2026-07-19T09:30:00Z',
  updatedAt: null,
} satisfies CustomerDetails;

describe('formatFullName', () => {
  it.each([
    ['joins first, middle, and last name', 'Petrov', 'Ivan Petrov Ivanov'],
    ['omits a null middle name', null, 'Ivan Ivanov'],
    ['omits a whitespace-only middle name', '   ', 'Ivan Ivanov'],
  ])('%s', (_description, middleName, expected) => {
    const customer: CustomerDetails = { ...BASE_CUSTOMER, middleName };

    expect(formatFullName(customer)).toBe(expected);
  });
});

describe('formatDate', () => {
  it('formats ISO dates with English month abbreviations', () => {
    expect(formatDate('2026-02-10')).toBe('10 Feb 2026');
    expect(formatDate('1986-09-21')).toBe('21 Sept 1986');
  });

  it('preserves missing and unsupported values', () => {
    expect(formatDate(null)).toBe('Not provided');
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDate('2026-13-10')).toBe('2026-13-10');
  });
});

describe('formatAuditDate', () => {
  it('formats instants in the Bulgarian business time zone', () => {
    expect(formatAuditDate('2026-07-19T21:30:00Z')).toBe('20 Jul 2026');
    expect(formatAuditDate('2026-09-19T09:30:00+03:00')).toBe('19 Sept 2026');
  });

  it('preserves missing and unsupported values', () => {
    expect(formatAuditDate(null)).toBe('Not provided');
    expect(formatAuditDate('not-a-date')).toBe('not-a-date');
  });
});
