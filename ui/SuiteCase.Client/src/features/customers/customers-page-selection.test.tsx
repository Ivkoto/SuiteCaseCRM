import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../../routing/app-routes';
import type {
  CustomerDetails,
  CustomerListItem,
  PagedResponse,
} from './api/customer-contracts';
import { CustomersPage } from './customers-page';

const CUSTOMERS: readonly CustomerListItem[] = ['Борис', 'Георги', 'Славян'].map(
  (firstName, index) => ({
    id: index + 1,
    firstName,
    lastName: 'Иванов',
    email: null,
    phoneNumber: null,
    dateOfBirth: null,
    age: null,
    passportExpiresOn: null,
    isPassportValid: false,
    createdAt: '2026-07-19T09:30:00+03:00',
    updatedAt: null,
  }),
);

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.unstubAllGlobals();
});

describe('CustomersPage selection', () => {
  it.each(['clear button', 'deleting the search text'] as const)(
    'retains customers selected through successive searches after %s',
    async (clearMethod) => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce(jsonResponse(customerPage(CUSTOMERS)));
      for (const customer of CUSTOMERS) {
        fetchMock.mockResolvedValueOnce(jsonResponse(customerPage([customer])));
      }
      fetchMock.mockResolvedValueOnce(jsonResponse(customerPage(CUSTOMERS)));

      render(<CustomersPage />);

      await screen.findByRole('checkbox', { name: 'Select Борис Иванов' });
      const searchInput = screen.getByRole('searchbox', { name: 'Search customers' });

      for (const customer of CUSTOMERS) {
        await user.click(searchInput);
        await user.keyboard(`{Control>}a{/Control}${customer.firstName}{Enter}`);
        await user.click(await screen.findByRole('checkbox', {
          name: `Select ${customer.firstName} ${customer.lastName}`,
        }));
      }

      if (clearMethod === 'clear button') {
        await user.click(screen.getByRole('button', { name: 'Clear customer search' }));
      } else {
        await user.clear(searchInput);
      }

      await screen.findByRole('checkbox', { name: 'Select Борис Иванов' });
      for (const customer of CUSTOMERS) {
        expect(screen.getByRole('checkbox', {
          name: `Select ${customer.firstName} ${customer.lastName}`,
        })).toBeChecked();
      }
      expect(screen.getByRole('checkbox', {
        name: 'Select all customers on this page',
      })).toBeChecked();
      expect(screen.getByRole('button', { name: 'Add to Group' })).toBeDisabled();
      expect(fetchMock).toHaveBeenCalledTimes(5);
    },
  );

  it('keeps hidden selections when toggling a page and clears them explicitly', async () => {
    const user = userEvent.setup();
    const firstPage = customerPage(CUSTOMERS.slice(0, 1), 1, 2, 15);
    const secondPage = customerPage(CUSTOMERS.slice(1), 2, 2, 15);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(firstPage))
      .mockResolvedValueOnce(jsonResponse(secondPage))
      .mockResolvedValueOnce(jsonResponse(firstPage))
      .mockResolvedValueOnce(jsonResponse(secondPage))
      .mockResolvedValueOnce(jsonResponse(firstPage));

    render(<CustomersPage />);

    await user.click(await screen.findByRole('checkbox', { name: 'Select Борис Иванов' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('checkbox', { name: 'Select Георги Иванов' });

    const selectPage = screen.getByRole('checkbox', {
      name: 'Select all customers on this page',
    });
    await user.click(selectPage);
    expect(screen.getByRole('checkbox', { name: 'Select Георги Иванов' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select Славян Иванов' })).toBeChecked();
    await user.click(selectPage);
    expect(screen.getByRole('checkbox', { name: 'Select Георги Иванов' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select Славян Иванов' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(await screen.findByRole('checkbox', { name: 'Select Борис Иванов' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('checkbox', { name: 'Select Георги Иванов' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(await screen.findByRole('checkbox', { name: 'Select Борис Иванов' })).not.toBeChecked();
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('starts with no selection after navigating away from Customers and returning', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    fetchMock
      .mockResolvedValueOnce(jsonResponse(customerPage(CUSTOMERS)))
      .mockResolvedValueOnce(jsonResponse(customerPage(CUSTOMERS)));

    render(
      <MemoryRouter initialEntries={['/customers']}>
        <Link to="/">Go to dashboard</Link>
        <Link to="/customers">Return to Customers</Link>
        <AppRoutes />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('checkbox', { name: 'Select Борис Иванов' }));
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeEnabled();

    await user.click(screen.getByRole('link', { name: 'Go to dashboard' }));
    expect(screen.queryByRole('heading', { name: 'Customer Directory' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Return to Customers' }));

    expect(await screen.findByRole('checkbox', { name: 'Select Борис Иванов' })).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('preserves the existing selection when creating a customer refreshes the directory', async () => {
    const user = userEvent.setup();
    const createdCustomer: CustomerDetails = {
      id: 4,
      firstName: 'Нов',
      middleName: null,
      lastName: 'Клиент',
      firstNameLatin: null,
      middleNameLatin: null,
      lastNameLatin: null,
      nationalId: null,
      dateOfBirth: null,
      passportNumber: null,
      passportExpiresOn: null,
      email: null,
      phoneNumber: null,
      residenceCountryCode: 'BG',
      residenceCountryName: 'Bulgaria',
      notes: null,
      createdAt: '2026-07-20T09:30:00+03:00',
      updatedAt: null,
    };
    let wasCreated = false;
    fetchMock.mockImplementation(async (input, options) => {
      if (options?.method === 'POST') {
        wasCreated = true;
        return jsonResponse(createdCustomer, 201);
      }
      if (input === '/api/customers/4') {
        return jsonResponse(createdCustomer);
      }

      return jsonResponse(customerPage(wasCreated
        ? [...CUSTOMERS, { ...createdCustomer, age: null, isPassportValid: false }]
        : CUSTOMERS));
    });

    render(<CustomersPage />);

    await user.click(await screen.findByRole('checkbox', { name: 'Select Борис Иванов' }));
    await user.click(screen.getByRole('button', { name: 'Add New Customer' }));
    const createDialog = screen.getByRole('dialog', { name: 'Add new customer' });
    await user.type(within(createDialog).getByRole('textbox', { name: /First name/ }), 'Нов');
    await user.type(within(createDialog).getByRole('textbox', { name: /Last name/ }), 'Клиент');
    await user.click(within(createDialog).getByRole('button', { name: 'Create customer' }));

    const detailsDialog = await screen.findByRole('dialog', { name: 'Нов Клиент' });
    await user.click(within(detailsDialog).getByRole('button', { name: 'Close customer details' }));
    expect(await screen.findByRole('checkbox', { name: 'Select Борис Иванов' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select Нов Клиент' })).not.toBeChecked();
  });
});

function customerPage(
  items: readonly CustomerListItem[],
  page = 1,
  totalPages = 1,
  totalCount = items.length,
): PagedResponse<CustomerListItem> {
  return { items, page, pageSize: 13, totalCount, totalPages };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
