import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CustomerForm } from './customer-form';
import { createEmptyCustomerForm, type CustomerFormValues } from './customer-form-model';

function validFormValues(overrides: Partial<CustomerFormValues> = {}): CustomerFormValues {
  return {
    ...createEmptyCustomerForm(),
    firstName: 'Иван',
    lastName: 'Петров',
    ...overrides,
  };
}

describe('CustomerForm validation feedback', () => {
  it('validates only the blurred field and retains its error until corrected', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CustomerForm
      mode="create"
      initialValues={createEmptyCustomerForm()}
      submitLabel="Create customer"
      isSubmitting={false}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
    />);

    const firstName = screen.getByRole('textbox', { name: /First name/ });
    const lastName = screen.getByRole('textbox', { name: /Last name/ });
    await user.type(firstName, 'Ivan');
    expect(firstName).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.tab();
    expect(firstName).toHaveAttribute('aria-invalid', 'true');
    expect(firstName).toHaveAccessibleDescription(/only Bulgarian letters/);
    expect(lastName).toHaveAttribute('aria-invalid', 'false');

    await user.clear(firstName);
    await user.type(firstName, 'И');
    expect(firstName).toHaveAccessibleDescription('First name must contain between 2 and 100 characters.');
    await user.type(firstName, 'ван');
    expect(firstName).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('checks the full form on submit and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CustomerForm
      mode="create"
      initialValues={validFormValues({ firstName: 'Ivan', lastName: 'Petrov', nationalId: '9001010001' })}
      submitLabel="Create customer"
      isSubmitting={false}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
    />);

    await user.click(screen.getByRole('button', { name: 'Create customer' }));

    expect(screen.getByRole('textbox', { name: /First name/ })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: /Last name/ })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox', { name: /^National ID/ })).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('preserves a backend error through blur and clears it only after a valid edit', async () => {
    const user = userEvent.setup();
    const onClearServerError = vi.fn();
    const props = {
      mode: 'create' as const,
      initialValues: validFormValues({ nationalId: '9001010000' }),
      submitLabel: 'Create customer',
      onCancel: vi.fn(),
      onSubmit: vi.fn(),
      onClearServerError,
    };
    const { rerender } = render(<CustomerForm {...props} isSubmitting />);
    rerender(<CustomerForm
      {...props}
      isSubmitting={false}
      serverErrors={{ nationalId: 'This EGN is already in use.' }}
    />);

    const nationalId = screen.getByRole('textbox', { name: /^National ID/ });
    expect(nationalId).toHaveFocus();
    expect(nationalId).toHaveAccessibleDescription('This EGN is already in use.');
    await user.tab();
    expect(nationalId).toHaveAccessibleDescription('This EGN is already in use.');
    expect(onClearServerError).not.toHaveBeenCalled();

    await user.click(nationalId);
    await user.keyboard('{End}{Backspace}');
    expect(nationalId).toHaveAccessibleDescription('Enter a valid 10-digit EGN.');
    expect(onClearServerError).not.toHaveBeenCalled();
    await user.type(nationalId, '1');
    expect(nationalId).toHaveAttribute('aria-invalid', 'true');
    expect(onClearServerError).not.toHaveBeenCalled();
    await user.keyboard('{Backspace}0');
    expect(onClearServerError).toHaveBeenCalledWith('nationalId');
    rerender(<CustomerForm {...props} isSubmitting={false} serverErrors={{}} />);
    expect(nationalId).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows accessible notes length feedback for an existing oversized value', async () => {
    const user = userEvent.setup();
    render(<CustomerForm
      mode="edit"
      initialValues={validFormValues({ notes: 'я'.repeat(4001) })}
      submitLabel="Save changes"
      isSubmitting={false}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
    />);

    const notes = screen.getByRole('textbox', { name: 'Notes' });
    expect(notes).toHaveAttribute('maxlength', '4000');
    await user.click(notes);
    await user.tab();
    expect(notes).toHaveAttribute('aria-invalid', 'true');
    expect(notes).toHaveAccessibleDescription('Notes must not exceed 4000 characters.');

    fireEvent.change(notes, { target: { value: 'я'.repeat(4000) } });
    expect(notes).toHaveAttribute('aria-invalid', 'false');
  });

  it('submits valid optional and international fields', async () => {
    const user = userEvent.setup();
    const values = validFormValues({ phoneNumber: '+442071838750', notes: 'Текст ✈️\nSecond line' });
    const onSubmit = vi.fn();
    render(<CustomerForm
      mode="create"
      initialValues={values}
      submitLabel="Create customer"
      isSubmitting={false}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
    />);

    await user.click(screen.getByRole('button', { name: 'Create customer' }));
    expect(onSubmit).toHaveBeenCalledWith(values);
  });
});

describe('CustomerForm EGN birth date', () => {
  it('fills and submits the birth date as soon as a valid EGN is entered', async () => {
    const user = userEvent.setup();
    const values = validFormValues();
    const onSubmit = vi.fn();
    render(<CustomerForm
      mode="create"
      initialValues={values}
      submitLabel="Create customer"
      isSubmitting={false}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
    />);

    await user.type(screen.getByRole('textbox', { name: /^National ID/ }), '8711095306');
    expect(screen.getByLabelText('Date of birth')).toHaveValue('1987-11-09');
    await user.click(screen.getByRole('button', { name: 'Create customer' }));
    expect(onSubmit).toHaveBeenCalledWith({
      ...values,
      nationalId: '8711095306',
      dateOfBirth: '1987-11-09',
    });
  });

  it('leaves birth date empty for an invalid EGN and updates a previously filled date', async () => {
    const user = userEvent.setup();
    render(<CustomerForm
      mode="create"
      initialValues={validFormValues()}
      submitLabel="Create customer"
      isSubmitting={false}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
    />);

    const nationalId = screen.getByRole('textbox', { name: /^National ID/ });
    const dateOfBirth = screen.getByLabelText('Date of birth');
    await user.type(nationalId, '9001010001');
    expect(dateOfBirth).toHaveValue('');
    await user.keyboard('{Backspace}0');
    expect(dateOfBirth).toHaveValue('1990-01-01');
    await user.clear(nationalId);
    expect(dateOfBirth).toHaveValue('');
    await user.type(nationalId, '8711095306');
    expect(dateOfBirth).toHaveValue('1987-11-09');
  });

  it('preserves an existing manual birth date when the EGN changes', async () => {
    const user = userEvent.setup();
    render(<CustomerForm
      mode="edit"
      initialValues={validFormValues({ dateOfBirth: '1980-06-15' })}
      submitLabel="Save changes"
      isSubmitting={false}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
    />);

    await user.type(screen.getByRole('textbox', { name: /^National ID/ }), '8711095306');
    expect(screen.getByLabelText('Date of birth')).toHaveValue('1980-06-15');
  });

  it('preserves a manual correction to a date previously filled from an EGN', async () => {
    const user = userEvent.setup();
    render(<CustomerForm
      mode="create"
      initialValues={validFormValues()}
      submitLabel="Create customer"
      isSubmitting={false}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
    />);

    const nationalId = screen.getByRole('textbox', { name: /^National ID/ });
    const dateOfBirth = screen.getByLabelText('Date of birth');
    await user.type(nationalId, '8711095306');
    fireEvent.change(dateOfBirth, { target: { value: '1980-06-15' } });
    await user.clear(nationalId);
    await user.type(nationalId, '9001010000');
    expect(dateOfBirth).toHaveValue('1980-06-15');
  });
});
