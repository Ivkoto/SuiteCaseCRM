import type { ReactNode } from 'react'

type NavigationIconName =
  | 'dashboard'
  | 'customers'
  | 'programs'
  | 'bookings'
  | 'documents'
  | 'payments'
  | 'administration'

type NavigationItem = Readonly<{
  label: string
  icon: NavigationIconName
  isActive?: boolean
}>

type AppSidebarProps = Readonly<{
  isCollapsed: boolean
  onToggle: () => void
}>

const navigationItems: readonly NavigationItem[] = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Customers', icon: 'customers', isActive: true },
  { label: 'Programs & Groups', icon: 'programs' },
  { label: 'Bookings', icon: 'bookings' },
  { label: 'Documents', icon: 'documents' },
  { label: 'Payments', icon: 'payments' },
  { label: 'Administration', icon: 'administration' },
]

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  return (
    <aside className="app-sidebar" id="primary-sidebar">
      <div className="app-sidebar-header">
        <div className="app-brand">
          <img
            className="app-brand-logo"
            src="/Logo_Idea_2_TR.png"
            alt=""
          />
        </div>

        <button
          aria-controls="primary-sidebar"
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="app-sidebar-toggle"
          type="button"
          onClick={onToggle}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="app-sidebar-toggle-label">
            {isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          </span>
        </button>
      </div>

      <nav className="app-navigation" aria-label="Primary navigation">
        <ul>
          {navigationItems.map((item) => (
            <li key={item.label}>
              {item.isActive ? (
                <a
                  className="app-nav-item app-nav-item--active"
                  href="#main-content"
                  aria-current="page"
                  title={item.label}
                >
                  <NavigationIcon name={item.icon} />
                  <span className="app-nav-label">{item.label}</span>
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="app-nav-item app-nav-item--disabled"
                  title={`${item.label} — coming later`}
                >
                  <NavigationIcon name={item.icon} />
                  <span className="app-nav-label">{item.label}</span>
                  <span className="app-nav-badge">Soon</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

function NavigationIcon({ name }: Readonly<{ name: NavigationIconName }>) {
  const paths: Record<NavigationIconName, ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    customers: (
      <>
        <circle cx="9" cy="8" r="3.25" />
        <path d="M3.75 19c.35-3.15 2.1-5 5.25-5s4.9 1.85 5.25 5" />
        <path d="M15.5 5.25a3 3 0 0 1 0 5.5M16.5 14c2.25.35 3.45 2 3.75 4.5" />
      </>
    ),
    programs: (
      <>
        <path d="M4 6.5h16M6.5 3.5v3M17.5 3.5v3" />
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M8 10h3v3H8zM14 10h3v3h-3zM8 16h3v1.5H8zM14 16h3v1.5h-3z" />
      </>
    ),
    bookings: (
      <>
        <path d="M4 6.5h16M7 3.5v5M17 3.5v5" />
        <rect x="3.5" y="5" width="17" height="16" rx="2" />
        <path d="m8 14 2.25 2.25L16.5 10" />
      </>
    ),
    documents: (
      <>
        <path d="M6 2.75h8l4 4V21H6z" />
        <path d="M14 2.75V7h4M9 12h6M9 16h6" />
      </>
    ),
    payments: (
      <>
        <rect x="2.75" y="5" width="18.5" height="14" rx="2" />
        <path d="M2.75 9h18.5M7 15h4" />
      </>
    ),
    administration: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 13.5v-3l-2-.5a7.5 7.5 0 0 0-.7-1.7l1.05-1.75-2.1-2.1L13.5 5.5a7.5 7.5 0 0 0-1.7-.7l-.5-2h-3l-.5 2a7.5 7.5 0 0 0-1.7.7L4.35 4.45l-2.1 2.1L3.3 8.3A7.5 7.5 0 0 0 2.6 10l-2 .5v3l2 .5a7.5 7.5 0 0 0 .7 1.7l-1.05 1.75 2.1 2.1L6.1 18.5a7.5 7.5 0 0 0 1.7.7l.5 2h3l.5-2a7.5 7.5 0 0 0 1.7-.7l1.75 1.05 2.1-2.1-1.05-1.75A7.5 7.5 0 0 0 17 14z" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="app-nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      {paths[name]}
    </svg>
  )
}
