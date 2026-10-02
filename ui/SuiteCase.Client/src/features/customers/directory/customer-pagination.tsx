import type { CustomerListItem, PagedResponse } from '../api/customer-contracts';

type CustomerPaginationProps = Readonly<{
  data: PagedResponse<CustomerListItem> | null;
  currentPage: number;
  onPrevious: () => void;
  onNext: () => void;
}>;

export function CustomerPagination({
  data,
  currentPage,
  onPrevious,
  onNext,
}: CustomerPaginationProps) {
  return (
    <footer className="customers-pagination">
      <p>
        {data === null || data.totalCount === 0
          ? 'No records to display'
          : `${(data.page - 1) * data.pageSize + 1}–${Math.min(
              data.page * data.pageSize,
              data.totalCount,
            )} of ${data.totalCount}`}
      </p>
      <div className="customers-pagination-controls">
        <button
          className="customer-button customer-button--secondary"
          type="button"
          disabled={data === null || data.page <= 1}
          onClick={onPrevious}
        >
          Previous
        </button>
        <span aria-current="page">
          Page {data?.page ?? currentPage} of {Math.max(1, data?.totalPages ?? 1)}
        </span>
        <button
          className="customer-button customer-button--secondary"
          type="button"
          disabled={data === null || data.totalPages === 0 || data.page >= data.totalPages}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </footer>
  );
}
