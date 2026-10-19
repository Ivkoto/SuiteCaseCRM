import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SuccessNotice } from './success-notice';

describe('SuccessNotice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dismisses 10 seconds after the latest message is shown', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <SuccessNotice message="Changes saved." onDismiss={onDismiss} />,
    );

    act(() => vi.advanceTimersByTime(9_999));
    expect(onDismiss).not.toHaveBeenCalled();

    rerender(
      <SuccessNotice message="Settings updated." onDismiss={onDismiss} />,
    );

    act(() => vi.advanceTimersByTime(9_999));
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('can be dismissed immediately', () => {
    const onDismiss = vi.fn();
    render(<SuccessNotice message="Changes saved." onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('cancels automatic dismissal when unmounted', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <SuccessNotice message="Changes saved." onDismiss={onDismiss} />,
    );

    unmount();
    act(() => vi.advanceTimersByTime(15_000));

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
