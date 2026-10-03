import type { Ref } from 'react';
import type { CustomerListItem, PagedResponse } from '../api/customer-contracts';
import { formatAuditDate, formatDate } from '../shared/customer-format';

export type CustomerDirectoryState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'success'; data: PagedResponse<CustomerListItem> }>
  | Readonly<{ status: 'error'; message: string }>;

type CustomerTableProps = Readonly<{
  state: CustomerDirectoryState;
  hasActiveSearch: boolean;
  selectedCustomerIds: readonly number[];
  allVisibleCustomersSelected: boolean;
  selectAllCustomersRef: Ref<HTMLInputElement>;
  onRetry: () => void;
  onClearSearch: () => void;
  onVisibleSelectionChange: (isChecked: boolean) => void;
  onCustomerSelectionChange: (customerId: number) => void;
  onOpenCustomer: (customerId: number, trigger: HTMLButtonElement) => void;
}>;

export function CustomerTable({
  state,
  hasActiveSearch,
  selectedCustomerIds,
  allVisibleCustomersSelected,
  selectAllCustomersRef,
  onRetry,
  onClearSearch,
  onVisibleSelectionChange,
  onCustomerSelectionChange,
  onOpenCustomer,
}: CustomerTableProps) {
  const data = state.status === 'success' ? state.data : null;

  return (
    <div className="customers-table-region">
      {state.status === 'loading' ? (
        <div className="customer-state customer-state--loading" role="status">
          <span className="customer-spinner" aria-hidden="true" />
          <p>Loading customer directory…</p>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="customer-state customer-state--error" role="alert">
          <strong>Customer directory unavailable</strong>
          <p>{state.message}</p>
          <button
            className="customer-button customer-button--secondary"
            type="button"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      ) : null}

      {data !== null && data.items.length === 0 ? (
        <div className="customer-state customer-state--empty">
          <span className="customer-empty-icon" aria-hidden="true">◎</span>
          <strong>{hasActiveSearch ? 'No matching customers' : 'No customers yet'}</strong>
          <p>
            {hasActiveSearch
              ? 'Try a different name or criteria.'
              : 'Create the first customer record to start the directory.'}
          </p>
          {hasActiveSearch ? (
            <button
              className="customer-button customer-button--secondary"
              type="button"
              onClick={onClearSearch}
            >
              Clear search
            </button>
          ) : null}
        </div>
      ) : null}

      {data !== null && data.items.length > 0 ? (
        <div className="customers-table-scroll">
          <table className="customers-table">
            <caption className="customer-sr-only">Active customers</caption>
            <colgroup>
              <col className="customer-col-selection" />
              <col className="customer-col-name" />
              <col className="customer-col-email" />
              <col className="customer-col-phone" />
              <col className="customer-col-birth-date" />
              <col className="customer-col-age" />
              <col className="customer-col-passport-expiry" />
              <col className="customer-col-passport-status" />
              <col className="customer-col-date-audit" />
            </colgroup>
            <thead>
              <tr>
                <th className="customer-selection-cell" scope="col">
                  <input
                    ref={selectAllCustomersRef}
                    className="customer-selection-checkbox"
                    type="checkbox"
                    checked={allVisibleCustomersSelected}
                    aria-label="Select all customers on this page"
                    onChange={(event) => onVisibleSelectionChange(event.target.checked)}
                  />
                </th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Birth date</th>
                <th scope="col">Age</th>
                <th scope="col">Passport expires</th>
                <th scope="col">Passport status</th>
                <th scope="col">Last update</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  isSelected={selectedCustomerIds.includes(customer.id)}
                  onSelectionChange={() => onCustomerSelectionChange(customer.id)}
                  onOpen={(trigger) => onOpenCustomer(customer.id, trigger)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function CustomerRow({
  customer,
  isSelected,
  onSelectionChange,
  onOpen,
}: Readonly<{
  customer: CustomerListItem;
  isSelected: boolean;
  onSelectionChange: () => void;
  onOpen: (trigger: HTMLButtonElement) => void;
}>) {
  const fullName = `${customer.firstName} ${customer.lastName}`;
  const passportStatus = customer.passportExpiresOn === null
    ? 'missing'
    : customer.isPassportValid
      ? 'valid'
      : 'review';

  return (
    <tr className={isSelected ? 'customers-table-row--selected' : undefined}>
      <td className="customer-selection-cell">
        <input
          className="customer-selection-checkbox"
          type="checkbox"
          checked={isSelected}
          aria-label={`Select ${fullName}`}
          onChange={onSelectionChange}
        />
      </td>
      <td>
        <button
          className="customer-name-button"
          type="button"
          aria-label={`View details for ${fullName}`}
          onClick={(event) => onOpen(event.currentTarget)}
        >
          <strong>{fullName}</strong>
        </button>
      </td>
      <td>{customer.email ?? <span className="customer-muted">Not provided</span>}</td>
      <td>{customer.phoneNumber ?? <span className="customer-muted">Not provided</span>}</td>
      <td>{formatDate(customer.dateOfBirth)}</td>
      <td>{customer.age ?? <span className="customer-muted">—</span>}</td>
      <td>{formatDate(customer.passportExpiresOn)}</td>
      <td>
        <span className={`customer-status customer-status--${passportStatus}`}>
          {passportStatus === 'valid' ? 'Valid' : passportStatus === 'review' ? 'Review' : 'Missing'}
        </span>
      </td>
      <td>{formatAuditDate(customer.updatedAt ?? customer.createdAt)}</td>
    </tr>
  );
}
