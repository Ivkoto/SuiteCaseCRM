import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const customersPageMock = vi.hoisted(() => vi.fn())

vi.mock('./features/customers/customers-page', () => ({
  CustomersPage: () => customersPageMock(),
}))

beforeEach(() => {
  customersPageMock.mockReturnValue(<div>Customer directory</div>)
  window.localStorage.clear()
  delete document.documentElement.dataset.theme

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('App theme', () => {
  it('uses light mode by default and saves a theme change', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(window.localStorage.getItem('suitecase-theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
  })

  it('restores a saved dark theme', () => {
    window.localStorage.setItem('suitecase-theme', 'dark')

    render(<App />)

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
  })

  it('replaces an invalid saved theme with the light default', () => {
    window.localStorage.setItem('suitecase-theme', 'unknown')

    render(<App />)

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(window.localStorage.getItem('suitecase-theme')).toBe('light')
  })
})

describe('App error boundary', () => {
  it('keeps the sidebar available when the customer content crashes', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    customersPageMock.mockImplementation(() => {
      throw new Error('Unexpected render failure')
    })

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Collapse navigation' }))
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toBeEnabled()
  })
})
