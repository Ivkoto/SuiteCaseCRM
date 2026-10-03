import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode, } from 'react';
import { deleteCustomer, getCustomer, updateCustomer } from '../api/customers-api';
import type { CustomerDetails } from '../api/customer-contracts';
import { CustomerForm } from '../form/customer-form';
import { customerDetailsToForm, removeError, toUpdateCustomerRequest, type CustomerFormErrors, type CustomerFormField, type CustomerFormValues, } from '../form/customer-form-model';
import { formatAuditDate, formatDate, formatFullName } from '../shared/customer-format';
import { isAbortError } from '../../../lib/http-client';
import { describeCustomerLoadError, describeCustomerSubmissionError, } from '../shared/customer-error-messages';
import { CustomerSuccessNotice } from '../notifications/customer-success-notice';
import './customer-dialog.css';

type CustomerDetailsState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'success'; customer: CustomerDetails }>
  | Readonly<{ status: 'error'; message: string }>;

type CustomerDetailsDialogProps = Readonly<{
  customerId: number;
  onClose: () => void;
  onChanged: (customer: CustomerDetails) => void;
  onDeleted: (customerId: number) => void;
}>;

export function CustomerDetailsDialog({ customerId, onClose, onChanged, onDeleted, }: CustomerDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const loadingStateRef = useRef<HTMLDivElement>(null);
  const errorStateRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const deleteConfirmationRef = useRef<HTMLElement>(null);
  const shouldFocusAfterRetry = useRef(false);
  const shouldReturnFocusToEditButton = useRef(false);
  const shouldReturnFocusToDeleteButton = useRef(false);
  const [detailsState, setDetailsState] = useState<CustomerDetailsState>({ status: 'loading' });
  const [retryKey, setRetryKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CustomerFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const dismissStatusMessage = useCallback(() => setStatusMessage(null), []);
  const isBusy = isSaving || isDeleting;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open === true) {
        dialog.close();
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    getCustomer(customerId, controller.signal)
      .then((customer) => setDetailsState({ status: 'success', customer }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setDetailsState({ status: 'error', message: describeCustomerLoadError(error) });
        }
      });

    return () => controller.abort();
  }, [customerId, retryKey]);

  useEffect(() => {
    if (!shouldFocusAfterRetry.current) {
      return;
    }

    if (detailsState.status === 'loading') {
      loadingStateRef.current?.focus();
      return;
    }

    shouldFocusAfterRetry.current = false;
    if (detailsState.status === 'error') {
      errorStateRef.current?.focus();
    } else {
      titleRef.current?.focus();
    }
  }, [detailsState.status]);

  useEffect(() => {
    if (!isEditing && shouldReturnFocusToEditButton.current) {
      shouldReturnFocusToEditButton.current = false;
      editButtonRef.current?.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isDeleteConfirmationVisible) {
      deleteConfirmationRef.current?.focus();
      return;
    }

    if (shouldReturnFocusToDeleteButton.current) {
      shouldReturnFocusToDeleteButton.current = false;
      deleteButtonRef.current?.focus();
    }
  }, [isDeleteConfirmationVisible]);

  async function handleSave(values: CustomerFormValues) {
    if (isBusy) {
      return;
    }

    setIsSaving(true);
    setFieldErrors({});
    setFormError(null);
    setStatusMessage(null);

    try {
      const customer = await updateCustomer(customerId, toUpdateCustomerRequest(values));
      setDetailsState({ status: 'success', customer });
      shouldReturnFocusToEditButton.current = true;
      setIsEditing(false);
      setStatusMessage('Customer changes saved.');
      onChanged(customer);
    } catch (error) {
      const described = describeCustomerSubmissionError(error);
      setFieldErrors(described.fieldErrors);
      setFormError(described.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (isBusy) {
      return;
    }

    setIsDeleting(true);
    setFormError(null);

    try {
      await deleteCustomer(customerId);
      onDeleted(customerId);
    } catch (error) {
      const described = describeCustomerSubmissionError(error);
      setFormError(described.message ?? 'The customer could not be deleted. Try again.');
      setIsDeleting(false);
    }
  }

  function clearFieldError(field: CustomerFormField) {
    setFieldErrors((current) => removeError(current, field));
  }

  function beginEditing() {
    if (isBusy) {
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setStatusMessage(null);
    setIsDeleteConfirmationVisible(false);
    setIsEditing(true);
  }

  function cancelEditing() {
    if (isBusy) {
      return;
    }

    setFieldErrors({});
    setFormError(null);
    shouldReturnFocusToEditButton.current = true;
    setIsEditing(false);
  }

  function showDeleteConfirmation() {
    if (isBusy) {
      return;
    }

    setFormError(null);
    setIsDeleteConfirmationVisible(true);
  }

  function cancelDeleteConfirmation() {
    if (isBusy) {
      return;
    }

    shouldReturnFocusToDeleteButton.current = true;
    setIsDeleteConfirmationVisible(false);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget && !isBusy) {
      onClose();
    }
  }

  const customer = detailsState.status === 'success' ? detailsState.customer : null;
  const customerName = customer === null ? 'Customer details' : formatFullName(customer);

  return (
    <dialog
      className="customer-dialog customer-details-dialog"
      ref={dialogRef}
      aria-labelledby="customer-details-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isBusy) {
          onClose();
        }
      }}
      onMouseDown={handleBackdropClick}
    >
      <section className="customer-dialog-surface customer-drawer-surface">
        <header className="customer-dialog-header customer-drawer-header">
          <div>
            <p className="customer-dialog-eyebrow">Customer profile</p>
            <h2 id="customer-details-title" ref={titleRef} tabIndex={-1}>{customerName}</h2>
            {customer?.email !== null && customer?.email !== undefined ? (
              <p className="customer-drawer-subtitle">{customer.email}</p>
            ) : null}
          </div>
          <button
            className="customer-icon-button"
            type="button"
            aria-label="Close customer details"
            disabled={isBusy}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="customer-drawer-content">
          {detailsState.status === 'loading' ? (
            <div
              className="customer-state customer-state--loading"
              ref={loadingStateRef}
              role="status"
              tabIndex={-1}
            >
              <span className="customer-spinner" aria-hidden="true" />
              <p>Loading customer details…</p>
            </div>
          ) : null}

          {detailsState.status === 'error' ? (
            <div
              className="customer-state customer-state--error"
              ref={errorStateRef}
              role="alert"
              tabIndex={-1}
            >
              <strong>Customer details unavailable</strong>
              <p>{detailsState.message}</p>
              <button
                className="customer-button customer-button--secondary"
                type="button"
                onClick={() => {
                  shouldFocusAfterRetry.current = true;
                  setDetailsState({ status: 'loading' });
                  setRetryKey((current) => current + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : null}

          {customer !== null && !isEditing ? (
            <>
              <div className="customer-drawer-actions">
                <button
                  className="customer-button customer-button--primary"
                  ref={editButtonRef}
                  type="button"
                  disabled={isBusy}
                  onClick={beginEditing}
                >
                  Edit profile
                </button>
                <button
                  className="customer-button customer-button--danger-secondary"
                  ref={deleteButtonRef}
                  type="button"
                  disabled={isBusy}
                  onClick={showDeleteConfirmation}
                >
                  Delete customer
                </button>
              </div>

              {statusMessage !== null ? (
                <CustomerSuccessNotice
                  message={statusMessage}
                  onDismiss={dismissStatusMessage}
                />
              ) : null}

              {formError !== null ? (
                <p className="customer-form-banner customer-form-banner--error" role="alert">
                  {formError}
                </p>
              ) : null}

              {isDeleteConfirmationVisible ? (
                <section
                  className="customer-delete-confirmation"
                  ref={deleteConfirmationRef}
                  tabIndex={-1}
                  aria-labelledby="delete-customer-title"
                >
                  <div>
                    <h3 id="delete-customer-title">Delete this customer?</h3>
                    <p>
                      This removes the customer from active records. This action cannot be undone in the UI.
                    </p>
                  </div>
                  <div className="customer-delete-actions">
                    <button
                      className="customer-button customer-button--secondary"
                      type="button"
                      disabled={isBusy}
                      onClick={cancelDeleteConfirmation}
                    >
                      Cancel
                    </button>
                    <button
                      className="customer-button customer-button--danger"
                      type="button"
                      disabled={isBusy}
                      onClick={handleDelete}
                    >
                      {isDeleting ? 'Deleting…' : 'Delete customer'}
                    </button>
                  </div>
                </section>
              ) : null}

              <div className="customer-details-grid">
                <DetailCard title="Identity">
                  <DetailItem label="Full name" value={formatFullName(customer)} />
                  <DetailItem label="Latin name" value={formatLatinName(customer)} />
                  <DetailItem label="National ID" value={customer.nationalId} sensitive />
                  <DetailItem label="Date of birth" value={formatDate(customer.dateOfBirth)} />
                </DetailCard>

                <DetailCard title="Passport">
                  <DetailItem label="Passport number" value={customer.passportNumber} sensitive />
                  <DetailItem
                    label="Expires on"
                    value={formatDate(customer.passportExpiresOn)}
                  />
                  <DetailItem label="Residence" value={customer.residenceCountryName} />
                </DetailCard>

                <DetailCard title="Contact">
                  <DetailItem label="Email" value={customer.email} />
                  <DetailItem label="Phone" value={customer.phoneNumber} />
                </DetailCard>

                <DetailCard title="Record information">
                  <DetailItem
                    label="Created on"
                    value={formatAuditDate(customer.createdAt)}
                  />
                  <DetailItem
                    label="Last updated"
                    value={
                      customer.updatedAt === null
                        ? 'Never updated'
                        : formatAuditDate(customer.updatedAt)
                    }
                  />
                </DetailCard>

                <DetailCard title="Notes" wide>
                  <p className="customer-notes">{customer.notes ?? 'No notes recorded.'}</p>
                </DetailCard>
              </div>
            </>
          ) : null}

          {customer !== null && isEditing ? (
            <section aria-labelledby="edit-customer-title">
              <div className="customer-edit-heading">
                <p className="customer-dialog-eyebrow">Edit mode</p>
                <h3 id="edit-customer-title">Update customer information</h3>
              </div>
              <CustomerForm
                key={customer.id}
                mode="edit"
                initialValues={customerDetailsToForm(customer)}
                submitLabel="Save changes"
                isSubmitting={isBusy}
                serverErrors={fieldErrors}
                formError={formError}
                onCancel={cancelEditing}
                onSubmit={handleSave}
                onClearServerError={clearFieldError}
              />
            </section>
          ) : null}
        </div>
      </section>
    </dialog>
  );
}

function DetailCard({
  title,
  wide = false,
  children,
}: Readonly<{
  title: string;
  wide?: boolean;
  children: ReactNode;
}>) {
  return (
    <section className={`customer-detail-card${wide ? ' customer-detail-card--wide' : ''}`}>
      <h3>{title}</h3>
      <div className="customer-detail-card-content">{children}</div>
    </section>
  );
}

function DetailItem({
  label,
  value,
  sensitive = false,
}: Readonly<{
  label: string;
  value: string | null;
  sensitive?: boolean;
}>) {
  return (
    <div className="customer-detail-item">
      <span>{label}</span>
      <strong className={sensitive ? 'customer-sensitive-value' : undefined}>
        {value ?? 'Not provided'}
      </strong>
    </div>
  );
}

function formatLatinName(customer: CustomerDetails): string | null {
  const name = [customer.firstNameLatin, customer.middleNameLatin, customer.lastNameLatin]
    .filter((part): part is string => part !== null && part.trim().length > 0)
    .join(' ');
  return name.length === 0 ? null : name;
}
