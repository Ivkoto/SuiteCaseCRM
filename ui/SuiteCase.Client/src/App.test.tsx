import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './routing/app-routes'

const customersPageMock = vi.hoisted(() => vi.fn())

vi.mock('./features/customers/customers-page', () => ({
  CustomersPage: () => customersPageMock(),
}))

function renderApp(path = '/customers') {
  window.history.replaceState(null, '', path)
  return render(
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>,
  )
}

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
  window.history.replaceState(null, '', '/')
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
})

describe('App routing', () => {
  it('keeps the dashboard blank and navigates to Customers through the sidebar', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    expect(screen.getByRole('main')).toBeEmptyDOMElement()
    expect(customersPageMock).not.toHaveBeenCalled()

    const customersLink = screen.getByRole('link', { name: 'Customers' })
    expect(customersLink).not.toHaveAttribute('aria-current')
    expect(screen.getByText('Programs & Groups').closest('[aria-disabled]'))
      .toHaveAttribute('aria-disabled', 'true')

    await user.click(customersLink)

    expect(window.location.pathname).toBe('/customers')
    expect(screen.getByRole('heading', { name: 'Customers' })).toBeVisible()
    expect(screen.getByText('Customer directory')).toBeVisible()
    expect(customersLink).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('renders Customers when opened directly at /customers', () => {
    renderApp()

    expect(screen.getByText('Customer directory')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Customers' }))
      .toHaveAttribute('aria-current', 'page')
  })

  it.each([
    { path: '/programs', title: 'Programs & Groups' },
    { path: '/bookings', title: 'Bookings' },
    { path: '/documents', title: 'Documents' },
    { path: '/payments', title: 'Payments' },
    { path: '/administration', title: 'Administration' },
  ])('reserves $path with blank content and disabled navigation', ({ path, title }) => {
    renderApp(path)

    expect(window.location.pathname).toBe(path)
    expect(screen.getByRole('heading', { name: title })).toBeVisible()
    expect(screen.getByRole('main')).toBeEmptyDOMElement()
    expect(customersPageMock).not.toHaveBeenCalled()

    const navigation = within(screen.getByRole('navigation', { name: 'Primary navigation' }))
    const plannedNavigationItem = navigation.getByText(title).closest('[aria-disabled]')
    expect(plannedNavigationItem).toHaveAttribute('aria-disabled', 'true')
    expect(plannedNavigationItem).toHaveTextContent('Soon')
    expect(navigation.queryByRole('link', { name: title })).not.toBeInTheDocument()
  })

  it('redirects an unknown URL to the blank dashboard', async () => {
    renderApp('/unknown-section')

    await waitFor(() => expect(window.location.pathname).toBe('/'))
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    expect(screen.getByRole('main')).toBeEmptyDOMElement()
    expect(customersPageMock).not.toHaveBeenCalled()
  })
})

describe('App theme', () => {
  it('uses light mode by default and saves a theme change', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(window.localStorage.getItem('suitecase-theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
  })

  it('restores a saved dark theme', () => {
    window.localStorage.setItem('suitecase-theme', 'dark')

    renderApp()

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
  })

  it('replaces an invalid saved theme with the light default', () => {
    window.localStorage.setItem('suitecase-theme', 'unknown')

    renderApp()

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(window.localStorage.getItem('suitecase-theme')).toBe('light')
  })
})

describe('App error boundary', () => {
  it('keeps the sidebar available after a content crash and resets the error on navigation', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    customersPageMock.mockImplementation(() => {
      throw new Error('Unexpected render failure')
    })

    renderApp('/')
    await user.click(screen.getByRole('link', { name: 'Customers' }))

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Collapse navigation' }))
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toBeEnabled()

    window.history.back()
    await screen.findByRole('heading', { name: 'Dashboard' })
    expect(screen.getByRole('main')).toBeEmptyDOMElement()

    customersPageMock.mockReturnValue(<div>Customer directory</div>)
    await user.click(screen.getByRole('link', { name: 'Customers' }))
    expect(screen.getByText('Customer directory')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument()
  })
})
