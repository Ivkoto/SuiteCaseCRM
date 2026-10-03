import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppRoutes } from './app-routes'

vi.mock('./app-page-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./app-page-config')>()

  return {
    ...actual,
    APP_PAGES: {
      ...actual.APP_PAGES,
      programs: {
        ...actual.APP_PAGES.programs,
        Component: () => <div>Programs page content</div>,
      },
    },
  }
})

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  window.localStorage.clear()
  delete document.documentElement.dataset.theme

  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
})

afterEach(() => {
  window.history.replaceState(null, '', '/')
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  vi.unstubAllGlobals()
})

it('activates a future page through its registry component without changing the shared layout', async () => {
  const user = userEvent.setup()
  render(
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>,
  )

  const programsLink = screen.getByRole('link', { name: 'Programs & Groups' })
  expect(programsLink).not.toHaveTextContent('Soon')

  await user.click(programsLink)

  expect(window.location.pathname).toBe('/programs')
  expect(screen.getByRole('heading', { name: 'Programs & Groups' })).toBeVisible()
  expect(screen.getByText('Travel planning')).toBeVisible()
  expect(screen.getByText('Programs page content')).toBeVisible()
  expect(programsLink).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('main')).toHaveFocus()
})
