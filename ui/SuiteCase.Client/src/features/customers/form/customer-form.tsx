import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { SUPPORTED_COUNTRIES } from './countries';
import {
  removeError,
  validateCustomerForm,
  type CustomerFormErrors,
  type CustomerFormField,
  type CustomerFormValues,
} from './customer-form-model';
import './customer-form.css';

type CustomerFormProps = Readonly<{
  mode: 'create' | 'edit';
  initialValues: CustomerFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  serverErrors?: CustomerFormErrors;
  formError?: string | null;
  onCancel: () => void;
  onSubmit: (values: CustomerFormValues) => void;
  onClearServerError?: (field: CustomerFormField) => void;
}>;

type TextFieldProps = Readonly<{
  field: CustomerFormField;
  label: string;
  value: string;
  error?: string;
  idPrefix: string;
  type?: 'text' | 'email' | 'tel';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  sensitive?: boolean;
  onChange: (field: CustomerFormField, value: string) => void;
}>;

export function CustomerForm({
  mode,
  initialValues,
  submitLabel,
  isSubmitting,
  serverErrors = {},
  formError,
  onCancel,
  onSubmit,
  onClearServerError,
}: CustomerFormProps) {
  const [values, setValues] = useState(initialValues);
  const [clientErrors, setClientErrors] = useState<CustomerFormErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmittingRef = useRef(isSubmitting);
  const idPrefix = useId();
  const errors = { ...serverErrors, ...clientErrors };
  const hasFieldErrors = Object.values(errors).some((message) => message !== undefined);

  useEffect(() => {
    const submissionFinished = wasSubmittingRef.current && !isSubmitting;
    wasSubmittingRef.current = isSubmitting;

    if (!submissionFinished) {
      return;
    }

    const firstInvalidField = Object.keys(serverErrors)[0] as CustomerFormField | undefined;
    if (firstInvalidField !== undefined) {
      focusFormField(formRef.current, firstInvalidField);
    }
  }, [isSubmitting, serverErrors]);

  function updateField(field: CustomerFormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setClientErrors((current) => removeError(current, field));
    onClearServerError?.(field);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCustomerForm(values, mode);
    setClientErrors(nextErrors);

    const firstInvalidField = Object.keys(nextErrors)[0] as CustomerFormField | undefined;
    if (firstInvalidField !== undefined) {
      focusFormField(formRef.current, firstInvalidField);
      return;
    }

    onSubmit(values);
  }

  return (
    <form className="customer-form" ref={formRef} noValidate onSubmit={handleSubmit}>
      {formError !== null && formError !== undefined ? (
        <div className="customer-form-banner customer-form-banner--error" role="alert">
          {formError}
        </div>
      ) : null}

      {hasFieldErrors ? (
        <div className="customer-form-banner" role="alert">
          Please correct the highlighted fields.
        </div>
      ) : null}

      <fieldset className="customer-form-grid" disabled={isSubmitting}>
        <legend className="customer-sr-only">Customer information</legend>
        <TextField
          field="firstName"
          label="First name"
          value={values.firstName}
          error={errors.firstName}
          idPrefix={idPrefix}
          required
          minLength={2}
          maxLength={100}
          autoComplete="given-name"
          autoFocus
          onChange={updateField}
        />
        <TextField
          field="middleName"
          label="Middle name"
          value={values.middleName}
          error={errors.middleName}
          idPrefix={idPrefix}
          minLength={2}
          maxLength={100}
          autoComplete="additional-name"
          onChange={updateField}
        />
        <TextField
          field="lastName"
          label="Last name"
          value={values.lastName}
          error={errors.lastName}
          idPrefix={idPrefix}
          required
          minLength={2}
          maxLength={100}
          autoComplete="family-name"
          onChange={updateField}
        />

        {mode === 'edit' ? (
          <>
            <TextField
              field="firstNameLatin"
              label="Latin first name"
              value={values.firstNameLatin}
              error={errors.firstNameLatin}
              idPrefix={idPrefix}
              minLength={2}
              maxLength={100}
              onChange={updateField}
            />
            <TextField
              field="middleNameLatin"
              label="Latin middle name"
              value={values.middleNameLatin}
              error={errors.middleNameLatin}
              idPrefix={idPrefix}
              minLength={2}
              maxLength={100}
              onChange={updateField}
            />
            <TextField
              field="lastNameLatin"
              label="Latin last name"
              value={values.lastNameLatin}
              error={errors.lastNameLatin}
              idPrefix={idPrefix}
              minLength={2}
              maxLength={100}
              onChange={updateField}
            />
          </>
        ) : null}

        <TextField
          field="email"
          label="Email"
          value={values.email}
          error={errors.email}
          idPrefix={idPrefix}
          type="email"
          maxLength={254}
          autoComplete="email"
          onChange={updateField}
        />
        <TextField
          field="phoneNumber"
          label="Phone"
          value={values.phoneNumber}
          error={errors.phoneNumber}
          idPrefix={idPrefix}
          type="tel"
          maxLength={20}
          autoComplete="tel"
          onChange={updateField}
        />

        <label className="customer-field" htmlFor={`${idPrefix}-residenceCountryCode`}>
          <span>Residence country</span>
          <select
            id={`${idPrefix}-residenceCountryCode`}
            name="residenceCountryCode"
            value={values.residenceCountryCode}
            aria-invalid={errors.residenceCountryCode !== undefined}
            aria-describedby={errorId(idPrefix, 'residenceCountryCode', errors)}
            disabled={isSubmitting}
            autoComplete="country"
            onChange={(event) => updateField('residenceCountryCode', event.target.value)}
          >
            {SUPPORTED_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <FieldError
            id={errorId(idPrefix, 'residenceCountryCode', errors)}
            message={errors.residenceCountryCode}
          />
        </label>

        <TextField
          field="nationalId"
          label="National ID"
          value={values.nationalId}
          error={errors.nationalId}
          idPrefix={idPrefix}
          minLength={10}
          maxLength={10}
          sensitive
          onChange={updateField}
        />

        <DateField
          field="dateOfBirth"
          label="Date of birth"
          value={values.dateOfBirth}
          error={errors.dateOfBirth}
          idPrefix={idPrefix}
          isSubmitting={isSubmitting}
          onChange={updateField}
        />

        <TextField
          field="passportNumber"
          label="Passport number"
          value={values.passportNumber}
          error={errors.passportNumber}
          idPrefix={idPrefix}
          minLength={5}
          maxLength={20}
          sensitive
          onChange={updateField}
        />

        <DateField
          field="passportExpiresOn"
          label="Passport expires on"
          value={values.passportExpiresOn}
          error={errors.passportExpiresOn}
          idPrefix={idPrefix}
          isSubmitting={isSubmitting}
          onChange={updateField}
        />

        <label
          className="customer-field customer-field--wide"
          htmlFor={`${idPrefix}-notes`}
        >
          <span>Notes</span>
          <textarea
            id={`${idPrefix}-notes`}
            name="notes"
            rows={4}
            value={values.notes}
            disabled={isSubmitting}
            onChange={(event) => updateField('notes', event.target.value)}
          />
        </label>
      </fieldset>

      <div className="customer-form-actions">
        <button
          className="customer-button customer-button--secondary"
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="customer-button customer-button--primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function TextField({
  field,
  label,
  value,
  error,
  idPrefix,
  type = 'text',
  required = false,
  minLength,
  maxLength,
  autoComplete,
  autoFocus = false,
  sensitive = false,
  onChange,
}: TextFieldProps) {
  const id = `${idPrefix}-${field}`;
  const fieldErrorId = error === undefined ? undefined : `${id}-error`;

  return (
    <label className="customer-field" htmlFor={id}>
      <span>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <input
        id={id}
        name={field}
        type={type}
        value={value}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        autoComplete={sensitive ? 'off' : autoComplete}
        autoFocus={autoFocus}
        aria-required={required || undefined}
        aria-invalid={error !== undefined}
        aria-describedby={fieldErrorId}
        spellCheck={!sensitive}
        onChange={(event) => onChange(field, event.target.value)}
      />
      <FieldError id={fieldErrorId} message={error} />
    </label>
  );
}

function DateField({
  field,
  label,
  value,
  error,
  idPrefix,
  isSubmitting,
  onChange,
}: Readonly<{
  field: 'dateOfBirth' | 'passportExpiresOn';
  label: string;
  value: string;
  error?: string;
  idPrefix: string;
  isSubmitting: boolean;
  onChange: (field: CustomerFormField, value: string) => void;
}>) {
  const id = `${idPrefix}-${field}`;
  const fieldErrorId = error === undefined ? undefined : `${id}-error`;

  return (
    <label className="customer-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        name={field}
        type="date"
        value={value}
        aria-invalid={error !== undefined}
        aria-describedby={fieldErrorId}
        disabled={isSubmitting}
        onChange={(event) => onChange(field, event.target.value)}
      />
      <FieldError id={fieldErrorId} message={error} />
    </label>
  );
}

function FieldError({ id, message }: Readonly<{ id?: string; message?: string }>) {
  return message === undefined ? null : (
    <small className="customer-field-error" id={id}>
      {message}
    </small>
  );
}

function focusFormField(
  form: HTMLFormElement | null,
  fieldName: CustomerFormField,
) {
  const field = form?.elements.namedItem(fieldName);
  if (field instanceof HTMLElement) {
    field.focus();
  }
}

function errorId(
  idPrefix: string,
  field: CustomerFormField,
  errors: CustomerFormErrors,
): string | undefined {
  return errors[field] === undefined ? undefined : `${idPrefix}-${field}-error`;
}
