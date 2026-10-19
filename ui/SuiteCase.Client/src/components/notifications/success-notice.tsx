import { useEffect } from 'react';
import './success-notice.css';

const AUTO_DISMISS_DELAY_MS = 10_000;

type SuccessNoticeProps = Readonly<{
  message: string;
  onDismiss: () => void;
}>;

export function SuccessNotice({
  message,
  onDismiss,
}: SuccessNoticeProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDismiss, AUTO_DISMISS_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss]);

  return (
    <div className="success-notice" role="status" aria-atomic="true">
      <span className="success-notice-icon" aria-hidden="true">✓</span>
      <span className="success-notice-message">{message}</span>
      <button
        className="success-notice-dismiss"
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
