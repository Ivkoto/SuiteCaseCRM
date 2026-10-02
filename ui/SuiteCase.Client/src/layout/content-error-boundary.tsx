import { Component, type ReactNode } from 'react'

type ContentErrorBoundaryProps = Readonly<{
  children: ReactNode
}>

type ContentErrorBoundaryState = Readonly<{
  hasError: boolean
}>

export class ContentErrorBoundary extends Component<
  ContentErrorBoundaryProps,
  ContentErrorBoundaryState
> {
  state: ContentErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ContentErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="app-error-fallback" role="alert">
          <h2>Something went wrong</h2>
          <p>An unexpected error prevented this content from loading.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </section>
      )
    }

    return this.props.children
  }
}
