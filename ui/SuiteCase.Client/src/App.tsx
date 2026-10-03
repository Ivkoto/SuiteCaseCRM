import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { matchPath, Outlet, useLocation } from 'react-router'
import './App.css'
import { AppSidebar } from './layout/app-sidebar'
import { ContentErrorBoundary } from './layout/content-error-boundary'
import type { AppPageMetadata } from './routing/app-page-config'

type AppProps = Readonly<{
  pages: readonly AppPageMetadata[]
  defaultPage: AppPageMetadata
}>

type AppTheme = 'light' | 'dark'

const themeStorageKey = 'suitecase-theme'

function getInitialTheme(): AppTheme {
  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey)
    return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light'
  } catch {
    return 'light'
  }
}

function App({ pages, defaultPage }: AppProps) {
  const { pathname } = useLocation()
  const currentPage = pages.find((page) => (
    matchPath({ path: page.path, end: page.path === '/' }, pathname) !== null
  )) ?? defaultPage
  const mainRef = useRef<HTMLElement>(null)
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.matchMedia('(max-width: 62rem)').matches,
  )

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme

    try {
      window.localStorage.setItem(themeStorageKey, theme)
    } catch {
      // The selected theme still applies when browser storage is unavailable.
    }
  }, [theme])

  useEffect(() => {
    const compactSidebar = window.matchMedia('(max-width: 62rem)')
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsSidebarCollapsed(event.matches)
    }

    compactSidebar.addEventListener('change', handleViewportChange)
    return () => compactSidebar.removeEventListener('change', handleViewportChange)
  }, [])

  useEffect(() => {
    mainRef.current?.focus()
  }, [pathname])

  return (
    <>
      <a className="app-skip-link" href="#main-content">
        Skip to main content
      </a>

      <div className={`app-shell${isSidebarCollapsed ? ' app-shell--collapsed' : ''}`}>
        <AppSidebar
          pages={pages}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((isCollapsed) => !isCollapsed)}
        />

        <div className="app-workspace">
          <header className="app-workspace-header">
            <div>
              <p className="app-workspace-eyebrow">
                {currentPage.eyebrow}
              </p>
              <h1>{currentPage.title}</h1>
            </div>
            <button
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              className="app-theme-toggle"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              type="button"
              onClick={() => setTheme((currentTheme) => (
                currentTheme === 'light' ? 'dark' : 'light'
              ))}
            >
              {theme === 'light' ? (
                <svg
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.25 15.1A8.5 8.5 0 0 1 8.9 3.75 8.5 8.5 0 1 0 20.25 15.1Z" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="3.75" />
                  <path d="M12 2.5v2M12 19.5v2M4.3 4.3l1.4 1.4M18.3 18.3l1.4 1.4M2.5 12h2M19.5 12h2M4.3 19.7l1.4-1.4M18.3 5.7l1.4-1.4" />
                </svg>
              )}
            </button>
          </header>

          <main className="app-main" id="main-content" ref={mainRef} tabIndex={-1}>
            <ContentErrorBoundary key={pathname}>
              <Outlet />
            </ContentErrorBoundary>
          </main>
        </div>
      </div>
    </>
  )
}

export default App
