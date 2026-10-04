import { useEffect, useRef, useState } from 'react';
import { createCustomer } from '../api/customers-api';
import type { CustomerDetails } from '../api/customer-contracts';
import { CustomerForm } from '../form/customer-form';
import {
  createEmptyCustomerForm,
  removeError,
  toCreateCustomerRequest,
  type CustomerFormErrors,
  type CustomerFormField,
  type CustomerFormValues,
} from '../form/customer-form-model';
import { describeCustomerSubmissionError } from '../shared/customer-error-messages';
import './customer-dialog.css';

type CreateCustomerDialogProps = Readonly<{
  onClose: () => void;
  onCreated: (customer: CustomerDetails) => void;
}>;

export function CreateCustomerDialog({ onClose, onCreated }: CreateCustomerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CustomerFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>('input[name="firstName"]')?.focus();
    }

    return () => {
      if (dialog?.open === true) {
        dialog.close();
      }
    };
  }, []);

  async function handleSubmit(values: CustomerFormValues) {
    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const customer = await createCustomer(toCreateCustomerRequest(values));
      onCreated(customer);
    } catch (error) {
      const described = describeCustomerSubmissionError(error);
      setFieldErrors(described.fieldErrors);
      setFormError(described.message);
      setIsSubmitting(false);
    }
  }

  function clearFieldError(field: CustomerFormField) {
    setFieldErrors((current) => removeError(current, field));
  }

  return (
    <dialog
      className="customer-dialog customer-create-dialog"
      ref={dialogRef}
      aria-labelledby="create-customer-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) {
          onClose();
        }
      }}
    >
      <section className="customer-dialog-surface">
        <header className="customer-dialog-header">
          <div>
            <p className="customer-dialog-eyebrow">Customer profile</p>
            <h2 id="create-customer-title">Add new customer</h2>
          </div>
          <button
            className="customer-icon-button"
            type="button"
            aria-label="Close customer form"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <p className="customer-dialog-intro">
          Required fields are marked with an asterisk. Optional blank fields are not stored.
        </p>

        <CustomerForm
          mode="create"
          initialValues={createEmptyCustomerForm()}
          submitLabel="Create customer"
          isSubmitting={isSubmitting}
          serverErrors={fieldErrors}
          formError={formError}
          onCancel={onClose}
          onSubmit={handleSubmit}
          onClearServerError={clearFieldError}
        />
      </section>
    </dialog>
  );
}
