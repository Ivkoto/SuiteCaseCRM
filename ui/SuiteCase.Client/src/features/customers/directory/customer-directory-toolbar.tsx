import type { Ref, SubmitEvent } from 'react';

type CustomerDirectoryToolbarProps = Readonly<{
  searchDraft: string;
  hasActiveSearch: boolean;
  searchError: string | null;
  selectedCustomerCount: number;
  addCustomerButtonRef: Ref<HTMLButtonElement>;
  onSearchDraftChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onClearSelection: () => void;
  onAddCustomer: () => void;
}>;

export function CustomerDirectoryToolbar({
  searchDraft,
  hasActiveSearch,
  searchError,
  selectedCustomerCount,
  addCustomerButtonRef,
  onSearchDraftChange,
  onSearch,
  onClearSearch,
  onClearSelection,
  onAddCustomer,
}: CustomerDirectoryToolbarProps) {
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <>
      <header className="customers-panel-header">
        <h2 id="customer-directory-title">Customer Directory</h2>
        <form className="customer-search" role="search" onSubmit={handleSubmit}>
          <label className="customer-sr-only" htmlFor="customer-search-input">
            Search customers
          </label>
          <div className="customer-search-controls">
            <input
              id="customer-search-input"
              type="search"
              value={searchDraft}
              maxLength={100}
              placeholder="Name or phone"
              aria-invalid={searchError !== null}
              aria-describedby={
                searchError === null
                  ? 'customer-search-help'
                  : 'customer-search-help customer-search-error'
              }
              onChange={(event) => onSearchDraftChange(event.target.value)}
            />
            {searchDraft.length > 0 || hasActiveSearch ? (
              <button
                className="customer-search-clear"
                type="button"
                aria-label="Clear customer search"
                onClick={onClearSearch}
              >
                ×
              </button>
            ) : null}
            <button
              className="customer-search-submit"
              type="submit"
              aria-label="Search customers"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
            </button>
          </div>
          <span className="customer-sr-only" id="customer-search-help">
            Names and phone numbers support partial matches.
          </span>
          {searchError !== null ? (
            <small className="customer-field-error" id="customer-search-error" role="alert">
              {searchError}
            </small>
          ) : null}
        </form>
      </header>

      <section className="customers-quick-actions" aria-labelledby="customer-quick-actions-title">
        <h3 id="customer-quick-actions-title">Quick Actions</h3>
        <div className="customers-quick-actions-buttons">
          {selectedCustomerCount > 0 ? (
            <>
              <button
                className="customer-button customer-button--secondary"
                type="button"
                disabled
                title="Available when the Programs & Groups feature is implemented"
              >
                Add to Group
              </button>
              <button
                className="customer-button customer-button--secondary"
                type="button"
                onClick={onClearSelection}
              >
                Clear selection
              </button>
            </>
          ) : null}
          <button
            className="customer-button customer-button--secondary customer-add-button"
            ref={addCustomerButtonRef}
            type="button"
            onClick={onAddCustomer}
          >
            Add New Customer
          </button>
        </div>
      </section>
    </>
  );
}
