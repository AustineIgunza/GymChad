import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 min cache — no refetch on every navigation
      gcTime: 1000 * 60 * 10,          // 10 min garbage collect
      retry: 2,
      refetchOnWindowFocus: false,      // prevents refetch on tab switch
    },
  },
})

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[GymChad] Unhandled error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-primary px-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h2>
          <p className="text-sm text-text-muted mb-2 max-w-xs">
            {(this.state.error as Error).message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2.5 bg-primary-700 text-white rounded-xl font-semibold text-sm"
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 2500,
              style: {
                background: 'var(--color-bg-card, #1a1a2e)',
                color: 'var(--color-text-primary, #f1f5f9)',
                border: '1px solid var(--color-border, #2a2a3e)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: { duration: 2000 },
              error: { duration: 4000 },
            }}
          />
        </BrowserRouter>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
