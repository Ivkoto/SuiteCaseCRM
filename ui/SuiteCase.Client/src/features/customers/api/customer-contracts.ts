export type IsoDate = string;
export type IsoDateTime = string;

export const CUSTOMER_ERROR_CODES = {
  notFound: 'customer.not_found',
  duplicateNationalId: 'customer.duplicate_national_id',
  duplicatePassportNumber: 'customer.duplicate_passport_number',
} as const;

export type CustomerErrorCode =
  (typeof CUSTOMER_ERROR_CODES)[keyof typeof CUSTOMER_ERROR_CODES];

export type CustomerListQuery = Readonly<{
  page?: number;
  pageSize?: number;
  search?: string;
}>;

export type PagedResponse<T> = Readonly<{
  items: readonly T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}>;

export type CustomerListItem = Readonly<{
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  dateOfBirth: IsoDate | null;
  age: number | null;
  passportExpiresOn: IsoDate | null;
  isPassportValid: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime | null;
}>;

export type CustomerDetails = Readonly<{
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  firstNameLatin: string | null;
  middleNameLatin: string | null;
  lastNameLatin: string | null;
  nationalId: string | null;
  dateOfBirth: IsoDate | null;
  passportNumber: string | null;
  passportExpiresOn: IsoDate | null;
  email: string | null;
  phoneNumber: string | null;
  residenceCountryCode: string;
  residenceCountryName: string;
  notes: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime | null;
}>;

export type CreateCustomerRequest = Readonly<{
  firstName: string;
  middleName: string | null;
  lastName: string;
  nationalId: string | null;
  dateOfBirth: IsoDate | null;
  passportNumber: string | null;
  passportExpiresOn: IsoDate | null;
  email: string | null;
  phoneNumber: string | null;
  residenceCountryCode: string | null;
  notes: string | null;
}>;

export type UpdateCustomerRequest = Readonly<{
  firstName: string;
  middleName: string | null;
  lastName: string;
  firstNameLatin: string | null;
  middleNameLatin: string | null;
  lastNameLatin: string | null;
  nationalId: string | null;
  dateOfBirth: IsoDate | null;
  passportNumber: string | null;
  passportExpiresOn: IsoDate | null;
  email: string | null;
  phoneNumber: string | null;
  residenceCountryCode: string | null;
  notes: string | null;
}>;

export function isCustomerErrorCode(value: string | undefined): value is CustomerErrorCode {
  return Object.values(CUSTOMER_ERROR_CODES).some((code) => code === value);
}
