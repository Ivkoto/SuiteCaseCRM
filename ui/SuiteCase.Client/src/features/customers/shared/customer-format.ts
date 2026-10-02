import type { CustomerDetails } from '../api/customer-contracts';

const ENGLISH_MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sept',
  'Oct',
  'Nov',
  'Dec',
] as const;

const AUDIT_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Sofia',
});

export function formatFullName(customer: CustomerDetails): string {
  return [customer.firstName, customer.middleName, customer.lastName]
    .filter((part): part is string => part !== null && part.trim().length > 0)
    .join(' ');
}

export function formatDate(value: string | null): string {
  if (value === null) {
    return 'Not provided';
  }

  const [year, month, day] = value.split('-');
  if (year === undefined || month === undefined || day === undefined) {
    return value;
  }

  const monthLabel = ENGLISH_MONTH_ABBREVIATIONS[Number(month) - 1];
  if (monthLabel === undefined) {
    return value;
  }

  return `${day} ${monthLabel} ${year}`;
}

export function formatAuditDate(value: string | null): string {
  if (value === null) {
    return 'Not provided';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : AUDIT_DATE_FORMATTER.format(date);
}
