import { Navigate, Route, Routes } from 'react-router'
import App from '../App'
import { APP_PAGES, type AppPageDefinition, type AppPageMetadata } from './app-page-config'

export function AppRoutes() {
  const pageDefinitions = Object.values(APP_PAGES)
  const pages = pageDefinitions.map(toPageMetadata)

  return (
    <Routes>
      <Route element={<App pages={pages} defaultPage={toPageMetadata(APP_PAGES.dashboard)} />}>
        {pageDefinitions.map(({ path, Component }) => (
          <Route
            key={path}
            path={path}
            element={Component === null ? null : <Component />}
          />
        ))}
        <Route path="*" element={<Navigate to={APP_PAGES.dashboard.path} replace />} />
      </Route>
    </Routes>
  )
}

function toPageMetadata(page: AppPageDefinition): AppPageMetadata {
  return {
    path: page.path,
    title: page.title,
    eyebrow: page.eyebrow,
    icon: page.icon,
    isAvailable: page.Component !== null,
  }
}
