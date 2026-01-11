'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Check if it's a chunk loading error
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      // Automatically retry after a short delay for chunk errors
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} retry={this.retry} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  const isChunkError = error?.name === 'ChunkLoadError' || error?.message.includes('Loading chunk')
  
  if (isChunkError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Updating...
          </h2>
          <p className="text-gray-600 mb-4">
            The app is being updated. This will only take a moment.
          </p>
          <p className="text-sm text-gray-500">
            If this takes too long, try refreshing the page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Please try again.
        </p>
        <button
          onClick={retry}
          className="btn-primary w-full"
        >
          Try Again
        </button>
        {error && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer">
              Technical details
            </summary>
            <pre className="text-xs text-gray-400 mt-2 overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export default ErrorBoundary