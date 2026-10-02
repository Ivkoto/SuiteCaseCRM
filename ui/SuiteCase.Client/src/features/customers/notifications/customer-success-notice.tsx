import { useEffect } from 'react';
import './customer-success-notice.css';

const AUTO_DISMISS_DELAY_MS = 30_000;

type CustomerSuccessNoticeProps = Readonly<{
  message: string;
  onDismiss: () => void;
}>;

export function CustomerSuccessNotice({
  message,
  onDismiss,
}: CustomerSuccessNoticeProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDismiss, AUTO_DISMISS_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss]);

  return (
    <div className="customer-notice" role="status" aria-atomic="true">
      <span className="customer-notice-icon" aria-hidden="true">✓</span>
      <span className="customer-notice-message">{message}</span>
      <button
        className="customer-notice-dismiss"
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
