import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CustomerDetails,
  CustomerListItem,
  PagedResponse,
} from './api/customer-contracts';
import { CustomersPage } from './customers-page';

const FIRST_CUSTOMER: CustomerListItem = {
  id: 41,
  firstName: 'Ада',
  lastName: 'Лъвлейс',
  email: 'ada@example.test',
  phoneNumber: '+359000000001',
  dateOfBirth: '1815-12-10',
  age: 36,
  passportExpiresOn: '2030-01-01',
  isPassportValid: true,
  createdAt: '2026-07-19T09:30:00+03:00',
  updatedAt: null,
};

const SECOND_CUSTOMER: CustomerListItem = {
  id: 42,
  firstName: 'Grace',
  lastName: 'Hopper',
  email: null,
  phoneNumber: null,
  dateOfBirth: null,
  age: null,
  passportExpiresOn: null,
  isPassportValid: false,
  createdAt: '2026-07-20T10:00:00+03:00',
  updatedAt: null,
};

const FIRST_CUSTOMER_DETAILS: CustomerDetails = {
  id: 41,
  firstName: 'Ада',
  middleName: null,
  lastName: 'Лъвлейс',
  firstNameLatin: 'Ada',
  middleNameLatin: null,
  lastNameLatin: 'Lovelace',
  nationalId: '1532100016',
  dateOfBirth: '1815-12-10',
  passportNumber: 'PX90001',
  passportExpiresOn: '2030-01-01',
  email: 'ada@example.test',
  phoneNumber: '+359000000001',
  residenceCountryCode: 'BG',
  residenceCountryName: 'Bulgaria',
  notes: 'Prefers written correspondence.',
  createdAt: '2026-07-19T09:30:00+03:00',
  updatedAt: null,
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CustomersPage', () => {
  it('loads and renders the initial customer directory', async () => {
    fetchMock.mockResolvedValue(jsonResponse(customerPage([FIRST_CUSTOMER])));

    render(<CustomersPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading customer directory');
    expect(await screen.findByRole('button', {
      name: 'View details for Ада Лъвлейс',
    })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'ada@example.test' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Ада Лъвлейс' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quick Actions', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add New Customer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add to Group' })).not.toBeInTheDocument();
    expect(screen.queryByText('Customer #41')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/customers?page=1&pageSize=13',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('shows the updated audit date and falls back to the creation date', async () => {
    fetchMock.mockResolvedValue(jsonResponse(customerPage([
      FIRST_CUSTOMER,
      {
        ...SECOND_CUSTOMER,
        updatedAt: '2026-07-21T10:00:00+03:00',
      },
    ])));

    render(<CustomersPage />);

    expect(await screen.findByRole('cell', { name: '19 Jul 2026' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '21 Jul 2026' })).toBeInTheDocument();
  });

  it('selects individual and all visible customers without refetching', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(customerPage([
      FIRST_CUSTOMER,
      SECOND_CUSTOMER,
    ])));

    render(<CustomersPage />);

    const firstCustomerCheckbox = await screen.findByRole('checkbox', {
      name: 'Select Ада Лъвлейс',
    });
    const secondCustomerCheckbox = screen.getByRole('checkbox', {
      name: 'Select Grace Hopper',
    });
    const selectAllCheckbox = screen.getByRole('checkbox', {
      name: 'Select all customers on this page',
    });

    expect(firstCustomerCheckbox).not.toBeChecked();
    expect(secondCustomerCheckbox).not.toBeChecked();
    expect(selectAllCheckbox).not.toBeChecked();

    await user.click(firstCustomerCheckbox);

    expect(firstCustomerCheckbox).toBeChecked();
    expect(secondCustomerCheckbox).not.toBeChecked();
    expect(selectAllCheckbox).toBePartiallyChecked();
    expect(screen.getByRole('button', { name: 'Add to Group' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(firstCustomerCheckbox).not.toBeChecked();
    expect(secondCustomerCheckbox).not.toBeChecked();
    expect(selectAllCheckbox).not.toBeChecked();
    expect(selectAllCheckbox).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add to Group' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add New Customer' })).toBeVisible();

    await user.click(firstCustomerCheckbox);

    await user.click(selectAllCheckbox);

    expect(selectAllCheckbox).toBeChecked();
    expect(firstCustomerCheckbox).toBeChecked();
    expect(secondCustomerCheckbox).toBeChecked();

    await user.click(selectAllCheckbox);

    expect(selectAllCheckbox).not.toBeChecked();
    expect(firstCustomerCheckbox).not.toBeChecked();
    expect(secondCustomerCheckbox).not.toBeChecked();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('submits an exact trimmed search only on request and resets pagination', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER], 1, 2, 14)))
      .mockResolvedValueOnce(jsonResponse(customerPage([SECOND_CUSTOMER], 2, 2, 14)))
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER], 1, 1, 1)));

    render(<CustomersPage />);

    await screen.findByRole('button', { name: 'View details for Ада Лъвлейс' });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('button', { name: 'View details for Grace Hopper' });

    const searchInput = screen.getByRole('searchbox', { name: 'Search customers' });
    const searchSubmit = screen.getByRole('button', { name: 'Search customers' });
    expect(searchSubmit).toHaveAttribute('aria-label', 'Search customers');
    await user.type(searchInput, '  Ada  ');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await user.click(searchSubmit);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      '/api/customers?page=1&pageSize=13&search=Ada',
    );
    expect(await screen.findByText('Page 1 of 1')).toBeInTheDocument();
  });

  it('resets an active search when its final character is manually deleted', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER])))
      .mockResolvedValueOnce(jsonResponse(customerPage([SECOND_CUSTOMER])))
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER])));

    render(<CustomersPage />);

    await screen.findByRole('button', { name: 'View details for Ада Лъвлейс' });
    const searchInput = screen.getByRole('searchbox', { name: 'Search customers' });
    await user.type(searchInput, 'Grace');
    expect(fetchMock).toHaveBeenCalledOnce();
    await user.keyboard('{Enter}');
    await screen.findByRole('button', { name: 'View details for Grace Hopper' });

    await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}');
    expect(searchInput).toHaveValue('G');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await user.keyboard('{Backspace}');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/customers?page=1&pageSize=13');
    expect(await screen.findByRole('button', {
      name: 'View details for Ада Лъвлейс',
    })).toBeInTheDocument();
  });

  it('treats whitespace replacement as clearing an active search', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER])))
      .mockResolvedValueOnce(jsonResponse(customerPage([SECOND_CUSTOMER])))
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER])));

    render(<CustomersPage />);

    await screen.findByRole('button', { name: 'View details for Ада Лъвлейс' });
    const searchInput = screen.getByRole('searchbox', { name: 'Search customers' });
    await user.type(searchInput, 'Grace{Enter}');
    await screen.findByRole('button', { name: 'View details for Grace Hopper' });

    fireEvent.change(searchInput, { target: { value: '   ' } });

    expect(searchInput).toHaveValue('');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/customers?page=1&pageSize=13');
    expect(await screen.findByRole('button', {
      name: 'View details for Ада Лъвлейс',
    })).toBeInTheDocument();
  });

  it('clears an unsubmitted draft without refetching or resetting the current page', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER], 1, 2, 14)))
      .mockResolvedValueOnce(jsonResponse(customerPage([SECOND_CUSTOMER], 2, 2, 14)));

    render(<CustomersPage />);

    await screen.findByRole('button', { name: 'View details for Ада Лъвлейс' });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('button', { name: 'View details for Grace Hopper' });

    const searchInput = screen.getByRole('searchbox', { name: 'Search customers' });
    await user.type(searchInput, 'Ada');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Clear customer search' }));

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'View details for Grace Hopper',
    })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the directory silent when the request is cancelled', async () => {
    let rejectRequest: (error: Error) => void = () => {
      throw new Error('Request rejection handler was not initialized.');
    };
    const pendingRequest = new Promise<Response>((_resolve, reject) => {
      rejectRequest = reject;
    });
    fetchMock.mockReturnValueOnce(pendingRequest);

    render(<CustomersPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    await act(async () => {
      rejectRequest(
        Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }),
      );
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers retry after a directory request fails', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockRejectedValueOnce(new TypeError('Network unavailable'))
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER])));

    render(<CustomersPage />);

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Customer directory unavailable');
    expect(error).toHaveTextContent(
      'The customer directory could not be loaded. Check your connection and try again.',
    );
    expect(error).not.toHaveTextContent('Network unavailable');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('button', {
      name: 'View details for Ада Лъвлейс',
    })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps create input and shows a duplicate National ID error from the API', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([])))
      .mockResolvedValueOnce(jsonResponse({
        title: 'Conflict',
        status: 409,
        code: 'customer.duplicate_national_id',
        existingCustomerId: 77,
      }, 409));

    render(<CustomersPage />);

    await screen.findByText('No customers yet');
    const addCustomer = screen.getByRole('button', { name: 'Add New Customer' });
    await user.click(addCustomer);

    const firstName = screen.getByRole('textbox', { name: /First name/ });
    const lastName = screen.getByRole('textbox', { name: /Last name/ });
    const nationalId = screen.getByRole('textbox', { name: 'National ID' });
    expect(firstName).toHaveFocus();
    await user.type(firstName, 'Тест');
    await user.type(lastName, 'Клиент');
    await user.type(nationalId, '1532100016');
    await user.click(screen.getByRole('button', { name: 'Create customer' }));

    const duplicateError = await screen.findByText(
      'Another active customer already uses this National ID. Existing customer #77.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please correct the highlighted fields.',
    );
    await waitFor(() => expect(nationalId).toHaveFocus());
    expect(nationalId).toHaveAttribute('aria-invalid', 'true');
    expect(nationalId).toHaveAccessibleDescription(duplicateError.textContent ?? '');
    expect(nationalId).toHaveValue('1532100016');
    expect(screen.getByRole('dialog', { name: 'Add new customer' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the create form open after a failed create request', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([])))
      .mockResolvedValueOnce(jsonResponse({ title: 'Server error' }, 500));

    render(<CustomersPage />);

    await screen.findByText('No customers yet');
    await user.click(screen.getByRole('button', { name: 'Add New Customer' }));

    const dialog = screen.getByRole('dialog', { name: 'Add new customer' });
    const firstName = within(dialog).getByRole('textbox', { name: /First name/ });
    const lastName = within(dialog).getByRole('textbox', { name: /Last name/ });
    await user.type(firstName, 'Тест');
    await user.type(lastName, 'Клиент');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The request could not be completed. Try again.',
    );
    expect(firstName).toHaveValue('Тест');
    expect(lastName).toHaveValue('Клиент');
    expect(within(dialog).getByRole('button', { name: 'Create customer' })).toBeEnabled();
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
  });

  it('warns to check the directory when a successful create response cannot be validated', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([])))
      .mockResolvedValueOnce(jsonResponse({ id: 43, firstName: 'Тест', lastName: 'Клиент' }, 201));

    render(<CustomersPage />);

    await screen.findByText('No customers yet');
    await user.click(screen.getByRole('button', { name: 'Add New Customer' }));

    const dialog = screen.getByRole('dialog', { name: 'Add new customer' });
    const firstName = within(dialog).getByRole('textbox', { name: /First name/ });
    const lastName = within(dialog).getByRole('textbox', { name: /Last name/ });
    await user.type(firstName, 'Тест');
    await user.type(lastName, 'Клиент');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The server returned an unexpected response, so the result could not be confirmed. '
      + 'The change may already have been saved. Check the customer directory before submitting again.',
    );
    expect(firstName).toHaveValue('Тест');
    expect(lastName).toHaveValue('Клиент');
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
  });

  it('warns to check the directory when a create request fails before a response arrives', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([])))
      .mockRejectedValueOnce(new TypeError('Network unavailable'));

    render(<CustomersPage />);

    await screen.findByText('No customers yet');
    await user.click(screen.getByRole('button', { name: 'Add New Customer' }));

    const dialog = screen.getByRole('dialog', { name: 'Add new customer' });
    const firstName = within(dialog).getByRole('textbox', { name: /First name/ });
    const lastName = within(dialog).getByRole('textbox', { name: /Last name/ });
    await user.type(firstName, 'Тест');
    await user.type(lastName, 'Клиент');
    await user.click(within(dialog).getByRole('button', { name: 'Create customer' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The request could not be completed, so the result could not be confirmed. '
      + 'The change may already have been saved. Check the customer directory before submitting again.',
    );
    expect(firstName).toHaveValue('Тест');
    expect(lastName).toHaveValue('Клиент');
    expect(within(dialog).getByRole('button', { name: 'Create customer' })).toBeEnabled();
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
  });

  it('keeps edit mode and its input after a failed update request', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER])))
      .mockResolvedValueOnce(jsonResponse(FIRST_CUSTOMER_DETAILS))
      .mockResolvedValueOnce(jsonResponse({ title: 'Server error' }, 500));

    render(<CustomersPage />);

    await user.click(await screen.findByRole('button', {
      name: 'View details for Ада Лъвлейс',
    }));
    const dialog = await screen.findByRole('dialog', { name: 'Ада Лъвлейс' });
    await user.click(within(dialog).getByRole('button', { name: 'Edit profile' }));
    const email = within(dialog).getByRole('textbox', { name: 'Email' });
    await user.clear(email);
    await user.type(email, 'failed-update@example.test');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The request could not be completed. Try again.',
    );
    expect(within(dialog).getByRole('heading', {
      name: 'Update customer information',
    })).toBeVisible();
    expect(email).toHaveValue('failed-update@example.test');
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeEnabled();
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(1);
  });

  it('keeps the customer and confirmation open after a failed delete request', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER])))
      .mockResolvedValueOnce(jsonResponse(FIRST_CUSTOMER_DETAILS))
      .mockResolvedValueOnce(jsonResponse({ title: 'Server error' }, 500));

    render(<CustomersPage />);

    await user.click(await screen.findByRole('button', {
      name: 'View details for Ада Лъвлейс',
    }));
    const dialog = await screen.findByRole('dialog', { name: 'Ада Лъвлейс' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete customer' }));
    const deleteHeading = within(dialog).getByRole('heading', {
      name: 'Delete this customer?',
    });
    const confirmation = deleteHeading.closest('section');
    if (confirmation === null) {
      throw new Error('Delete confirmation section was not rendered.');
    }
    const confirmDelete = within(confirmation).getByRole('button', {
      name: 'Delete customer',
    });
    await user.click(confirmDelete);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The request could not be completed. Try again.',
    );
    expect(confirmDelete).toBeEnabled();
    expect(screen.getByRole('button', { name: 'View details for Ада Лъвлейс' })).toBeVisible();
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(1);
  });

  it('loads details, sends a full replacement edit, and refetches after soft delete', async () => {
    const user = userEvent.setup();
    const updatedDetails: CustomerDetails = {
      ...FIRST_CUSTOMER_DETAILS,
      email: 'updated@example.test',
    };
    const updatedListItem: CustomerListItem = {
      ...FIRST_CUSTOMER,
      email: updatedDetails.email,
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER])))
      .mockResolvedValueOnce(jsonResponse(FIRST_CUSTOMER_DETAILS))
      .mockResolvedValueOnce(jsonResponse(updatedDetails))
      .mockResolvedValueOnce(jsonResponse(customerPage([updatedListItem])))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(customerPage([])));

    render(<CustomersPage />);

    await user.click(await screen.findByRole('button', {
      name: 'View details for Ада Лъвлейс',
    }));

    const detailsDialog = await screen.findByRole('dialog', { name: 'Ада Лъвлейс' });
    expect(within(detailsDialog).getByText('Prefers written correspondence.')).toBeInTheDocument();
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/customers/41');

    await user.click(within(detailsDialog).getByRole('button', { name: 'Edit profile' }));
    expect(within(detailsDialog).getByRole('textbox', { name: /First name/ })).toHaveFocus();
    const email = within(detailsDialog).getByRole('textbox', { name: 'Email' });
    await user.clear(email);
    await user.type(email, 'updated@example.test');
    await user.click(within(detailsDialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    const putCall = fetchMock.mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(putCall?.[0]).toBe('/api/customers/41');
    expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
      firstName: 'Ада',
      middleName: null,
      lastName: 'Лъвлейс',
      firstNameLatin: 'Ada',
      middleNameLatin: null,
      lastNameLatin: 'Lovelace',
      nationalId: '1532100016',
      dateOfBirth: '1815-12-10',
      passportNumber: 'PX90001',
      passportExpiresOn: '2030-01-01',
      email: 'updated@example.test',
      phoneNumber: '+359000000001',
      residenceCountryCode: 'BG',
      notes: 'Prefers written correspondence.',
    });
    expect(await screen.findByRole('cell', {
      name: 'updated@example.test',
    })).toBeInTheDocument();
    await waitFor(() => {
      expect(within(detailsDialog).getByRole('button', { name: 'Edit profile' })).toHaveFocus();
    });

    await user.click(within(detailsDialog).getByRole('button', { name: 'Delete customer' }));
    const deleteHeading = within(detailsDialog).getByRole('heading', {
      name: 'Delete this customer?',
    });
    const deleteConfirmation = deleteHeading.closest('section');
    if (deleteConfirmation === null) {
      throw new Error('Delete confirmation section was not rendered.');
    }
    expect(deleteConfirmation).toHaveFocus();
    await user.click(within(deleteConfirmation).getByRole('button', { name: 'Cancel' }));
    expect(within(detailsDialog).getByRole('button', { name: 'Delete customer' })).toHaveFocus();

    await user.click(within(detailsDialog).getByRole('button', { name: 'Delete customer' }));
    const confirmedDeleteHeading = within(detailsDialog).getByRole('heading', {
      name: 'Delete this customer?',
    });
    const confirmedDeleteSection = confirmedDeleteHeading.closest('section');
    if (confirmedDeleteSection === null) {
      throw new Error('Delete confirmation section was not rendered.');
    }
    await user.click(within(confirmedDeleteSection).getByRole('button', {
      name: 'Delete customer',
    }));

    expect(await screen.findByText('No customers yet')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Customer #41 deleted from active records.',
    );
    expect(screen.queryByRole('dialog', { name: 'Ада Лъвлейс' })).not.toBeInTheDocument();
    const deleteCall = fetchMock.mock.calls.find(([, options]) => options?.method === 'DELETE');
    expect(deleteCall?.[0]).toBe('/api/customers/41');
    expect(fetchMock.mock.calls[5]?.[0]).toBe('/api/customers?page=1&pageSize=13');
  });

  it('prevents editing while a customer deletion is pending', async () => {
    const user = userEvent.setup();
    let resolveDelete: (response: Response) => void = () => {
      throw new Error('Delete response resolver was not initialized.');
    };
    const pendingDeleteResponse = new Promise<Response>((resolve) => {
      resolveDelete = resolve;
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER])))
      .mockResolvedValueOnce(jsonResponse(FIRST_CUSTOMER_DETAILS))
      .mockReturnValueOnce(pendingDeleteResponse)
      .mockResolvedValueOnce(jsonResponse(customerPage([])));

    render(<CustomersPage />);

    await user.click(await screen.findByRole('button', {
      name: 'View details for Ада Лъвлейс',
    }));

    const detailsDialog = await screen.findByRole('dialog', { name: 'Ада Лъвлейс' });
    const editButton = within(detailsDialog).getByRole('button', { name: 'Edit profile' });
    const deleteButton = within(detailsDialog).getByRole('button', { name: 'Delete customer' });
    await user.click(deleteButton);

    const deleteConfirmationHeading = within(detailsDialog).getByRole('heading', {
      name: 'Delete this customer?',
    });
    const deleteConfirmation = deleteConfirmationHeading.closest('section');
    if (deleteConfirmation === null) {
      throw new Error('Delete confirmation section was not rendered.');
    }

    const confirmDeleteButton = within(deleteConfirmation).getByRole('button', {
      name: 'Delete customer',
    });
    const cancelDeleteButton = within(deleteConfirmation).getByRole('button', {
      name: 'Cancel',
    });
    await user.click(confirmDeleteButton);

    expect(editButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(confirmDeleteButton).toBeDisabled();
    expect(cancelDeleteButton).toBeDisabled();
    expect(confirmDeleteButton).toHaveTextContent('Deleting…');

    await user.click(editButton);

    expect(within(detailsDialog).queryByRole('heading', {
      name: 'Update customer information',
    })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(0);

    resolveDelete(new Response(null, { status: 204 }));

    expect(await screen.findByText('No customers yet')).toBeInTheDocument();
  });

  it('hides the deleted last row while loading the previous page', async () => {
    const user = userEvent.setup();
    let resolvePreviousPage: (response: Response) => void = () => {
      throw new Error('Previous-page response resolver was not initialized.');
    };
    const pendingPreviousPageResponse = new Promise<Response>((resolve) => {
      resolvePreviousPage = resolve;
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage([SECOND_CUSTOMER], 1, 2, 14)))
      .mockResolvedValueOnce(jsonResponse(customerPage([FIRST_CUSTOMER], 2, 2, 14)))
      .mockResolvedValueOnce(jsonResponse(FIRST_CUSTOMER_DETAILS))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockReturnValueOnce(pendingPreviousPageResponse);

    render(<CustomersPage />);

    await screen.findByRole('button', { name: 'View details for Grace Hopper' });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', {
      name: 'View details for Ада Лъвлейс',
    }));

    const detailsDialog = await screen.findByRole('dialog', { name: 'Ада Лъвлейс' });
    await user.click(within(detailsDialog).getByRole('button', { name: 'Delete customer' }));
    const deleteConfirmationHeading = within(detailsDialog).getByRole('heading', {
      name: 'Delete this customer?',
    });
    const deleteConfirmation = deleteConfirmationHeading.closest('section');
    if (deleteConfirmation === null) {
      throw new Error('Delete confirmation section was not rendered.');
    }
    await user.click(within(deleteConfirmation).getByRole('button', {
      name: 'Delete customer',
    }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(screen.getByText('Loading customer directory…')).toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'View details for Ада Лъвлейс',
    })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Ада Лъвлейс' })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[4]?.[0]).toBe('/api/customers?page=1&pageSize=13');

    resolvePreviousPage(jsonResponse(customerPage([SECOND_CUSTOMER], 1, 1, 13)));

    expect(await screen.findByRole('button', {
      name: 'View details for Grace Hopper',
    })).toBeInTheDocument();
  });

  it('closes the create dialog when the browser emits its Escape cancel event', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(customerPage([])));

    render(<CustomersPage />);

    await screen.findByText('No customers yet');
    const addCustomer = screen.getByRole('button', { name: 'Add New Customer' });
    await user.click(addCustomer);

    const dialog = screen.getByRole('dialog', { name: 'Add new customer' });
    fireEvent(dialog, new Event('cancel', { cancelable: true }));

    expect(screen.queryByRole('dialog', { name: 'Add new customer' })).not.toBeInTheDocument();
    expect(addCustomer).toHaveFocus();
  });
});

function customerPage(
  items: readonly CustomerListItem[],
  page = 1,
  totalPages = items.length === 0 ? 0 : 1,
  totalCount = items.length,
): PagedResponse<CustomerListItem> {
  return {
    items,
    page,
    pageSize: 13,
    totalCount,
    totalPages,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
