import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerSuccessNotice } from './customer-success-notice';

describe('CustomerSuccessNotice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dismisses 30 seconds after the latest message is shown', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <CustomerSuccessNotice message="Customer created." onDismiss={onDismiss} />,
    );

    act(() => vi.advanceTimersByTime(29_999));
    expect(onDismiss).not.toHaveBeenCalled();

    rerender(
      <CustomerSuccessNotice message="Customer updated." onDismiss={onDismiss} />,
    );

    act(() => vi.advanceTimersByTime(29_999));
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('can be dismissed immediately', () => {
    const onDismiss = vi.fn();
    render(<CustomerSuccessNotice message="Customer created." onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
