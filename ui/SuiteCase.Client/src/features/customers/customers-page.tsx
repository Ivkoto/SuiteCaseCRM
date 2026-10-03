import { useCallback, useEffect, useRef, useState } from 'react';
import type { CustomerDetails } from './api/customer-contracts';
import { listCustomers } from './api/customers-api';
import { CustomerDirectoryToolbar } from './directory/customer-directory-toolbar';
import { CustomerPagination } from './directory/customer-pagination';
import {
  CustomerTable,
  type CustomerDirectoryState,
} from './directory/customer-table';
import { CreateCustomerDialog } from './dialogs/create-customer-dialog';
import { CustomerDetailsDialog } from './dialogs/customer-details-dialog';
import { CustomerSuccessNotice } from './notifications/customer-success-notice';
import { isAbortError } from '../../lib/http-client';
import {
  describeCustomerListError,
} from './shared/customer-error-messages';
import { formatFullName } from './shared/customer-format';
import './shared/customers.css';
import './customers-page.css';

const PAGE_SIZE = 13;

export function CustomersPage() {
  const addCustomerButtonRef = useRef<HTMLButtonElement>(null);
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const focusAfterDialogRef = useRef<HTMLElement | null>(null);
  const selectAllCustomersRef = useRef<HTMLInputElement>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [listState, setListState] = useState<CustomerDirectoryState>({ status: 'loading' });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<readonly number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    const controller = new AbortController();

    listCustomers(
      {
        page,
        pageSize: PAGE_SIZE,
        search: search.length === 0 ? undefined : search,
      },
      controller.signal,
    )
      .then((data) => {
        if (data.totalPages > 0 && data.page > data.totalPages) {
          setPage(data.totalPages);
          return;
        }

        setListState({ status: 'success', data });
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setListState({ status: 'error', message: describeCustomerListError(error) });
        }
      });

    return () => controller.abort();
  }, [page, refreshKey, search]);

  useEffect(() => {
    if (isCreateDialogOpen || selectedCustomerId !== null) {
      return;
    }

    const requestedTarget = focusAfterDialogRef.current;
    if (requestedTarget === null) {
      return;
    }

    focusAfterDialogRef.current = null;
    const target = requestedTarget.isConnected ? requestedTarget : addCustomerButtonRef.current;
    target?.focus();
  }, [isCreateDialogOpen, selectedCustomerId]);

  function submitSearch() {
    const nextSearch = searchDraft.trim();

    if (nextSearch.length > 100) {
      setSearchError('Search must not exceed 100 characters.');
      return;
    }

    setSearchError(null);
    setNotice(null);
    setSelectedCustomerIds([]);
    setPage(1);

    if (nextSearch === search) {
      setListState({ status: 'loading' });
      setRefreshKey((current) => current + 1);
    } else {
      setListState({ status: 'loading' });
      setSearch(nextSearch);
    }
  }

  function updateSearchDraft(nextSearchDraft: string) {
    const isActiveSearchCleared = nextSearchDraft.trim().length === 0
      && search.length > 0;
    setSearchDraft(isActiveSearchCleared ? '' : nextSearchDraft);
    setSearchError(null);

    if (isActiveSearchCleared) {
      setNotice(null);
      setSelectedCustomerIds([]);
      setPage(1);
      setListState({ status: 'loading' });
      setSearch('');
    }
  }

  function clearSearch() {
    setSearchDraft('');
    setSearchError(null);
    setNotice(null);

    if (search.length > 0) {
      setSelectedCustomerIds([]);
      setPage(1);
      setListState({ status: 'loading' });
      setSearch('');
    }
  }

  function handleCreated(customer: CustomerDetails) {
    setIsCreateDialogOpen(false);
    setSearchDraft('');
    setSearch('');
    setPage(1);
    setSelectedCustomerIds([]);
    setListState({ status: 'loading' });
    setRefreshKey((current) => current + 1);
    setSelectedCustomerId(customer.id);
    setNotice(`Customer ${formatFullName(customer)} created.`);
  }

  function handleChanged(customer: CustomerDetails) {
    setListState({ status: 'loading' });
    setRefreshKey((current) => current + 1);
    setNotice(`Customer ${formatFullName(customer)} updated.`);
  }

  function handleDeleted(customerId: number) {
    focusAfterDialogRef.current = addCustomerButtonRef.current;
    setSelectedCustomerId(null);
    setSelectedCustomerIds((current) => current.filter((id) => id !== customerId));
    setNotice(`Customer #${customerId} deleted from active records.`);
    setListState({ status: 'loading' });

    if (
      listState.status === 'success'
      && listState.data.items.length === 1
      && page > 1
    ) {
      setPage((current) => current - 1);
    } else {
      setRefreshKey((current) => current + 1);
    }
  }

  const listData = listState.status === 'success' ? listState.data : null;
  const visibleCustomerIds = listData?.items.map((customer) => customer.id) ?? [];
  const selectedVisibleCustomerCount = visibleCustomerIds.filter(
    (customerId) => selectedCustomerIds.includes(customerId),
  ).length;
  const allVisibleCustomersSelected = visibleCustomerIds.length > 0
    && selectedVisibleCustomerCount === visibleCustomerIds.length;
  const someVisibleCustomersSelected = selectedVisibleCustomerCount > 0
    && !allVisibleCustomersSelected;

  useEffect(() => {
    if (selectAllCustomersRef.current !== null) {
      selectAllCustomersRef.current.indeterminate = someVisibleCustomersSelected;
    }
  }, [someVisibleCustomersSelected]);

  function toggleCustomerSelection(customerId: number) {
    setSelectedCustomerIds((current) => (
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId]
    ));
  }

  function toggleVisibleCustomerSelection(isChecked: boolean) {
    setSelectedCustomerIds((current) => {
      if (isChecked) {
        return Array.from(new Set([...current, ...visibleCustomerIds]));
      }

      return current.filter((id) => !visibleCustomerIds.includes(id));
    });
  }

  function clearCustomerSelection() {
    setSelectedCustomerIds([]);
    selectAllCustomersRef.current?.focus();
  }

  function retryCustomerList() {
    setListState({ status: 'loading' });
    setRefreshKey((current) => current + 1);
  }

  function openCustomerDetails(customerId: number, trigger: HTMLButtonElement) {
    setNotice(null);
    detailsTriggerRef.current = trigger;
    setSelectedCustomerId(customerId);
  }

  function openCreateDialog() {
    setNotice(null);
    setIsCreateDialogOpen(true);
  }

  function goToPreviousPage() {
    setListState({ status: 'loading' });
    setSelectedCustomerIds([]);
    setPage((current) => Math.max(1, current - 1));
  }

  function goToNextPage() {
    setListState({ status: 'loading' });
    setSelectedCustomerIds([]);
    setPage((current) => current + 1);
  }

  return (
    <section className="customers-panel" aria-labelledby="customer-directory-title">
      <CustomerDirectoryToolbar
        searchDraft={searchDraft}
        hasActiveSearch={search.length > 0}
        searchError={searchError}
        selectedCustomerCount={selectedCustomerIds.length}
        addCustomerButtonRef={addCustomerButtonRef}
        onSearchDraftChange={updateSearchDraft}
        onSearch={submitSearch}
        onClearSearch={clearSearch}
        onClearSelection={clearCustomerSelection}
        onAddCustomer={openCreateDialog}
      />

      {notice !== null ? (
        <CustomerSuccessNotice message={notice} onDismiss={dismissNotice} />
      ) : null}

      <CustomerTable
        state={listState}
        hasActiveSearch={search.length > 0}
        selectedCustomerIds={selectedCustomerIds}
        allVisibleCustomersSelected={allVisibleCustomersSelected}
        selectAllCustomersRef={selectAllCustomersRef}
        onRetry={retryCustomerList}
        onClearSearch={clearSearch}
        onVisibleSelectionChange={toggleVisibleCustomerSelection}
        onCustomerSelectionChange={toggleCustomerSelection}
        onOpenCustomer={openCustomerDetails}
      />

      <CustomerPagination
        data={listData}
        currentPage={page}
        onPrevious={goToPreviousPage}
        onNext={goToNextPage}
      />

      {isCreateDialogOpen ? (
        <CreateCustomerDialog
          onClose={() => {
            focusAfterDialogRef.current = addCustomerButtonRef.current;
            setIsCreateDialogOpen(false);
          }}
          onCreated={handleCreated}
        />
      ) : null}

      {selectedCustomerId !== null ? (
        <CustomerDetailsDialog
          key={selectedCustomerId}
          customerId={selectedCustomerId}
          onClose={() => {
            focusAfterDialogRef.current = detailsTriggerRef.current;
            setSelectedCustomerId(null);
          }}
          onChanged={handleChanged}
          onDeleted={handleDeleted}
        />
      ) : null}
    </section>
  );
}
