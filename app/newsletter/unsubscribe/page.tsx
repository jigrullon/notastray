import { Suspense } from 'react'
import UnsubscribeContent from './UnsubscribeContent'

export const dynamic = 'force-dynamic'

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<UnsubscribeLoading />}>
      <UnsubscribeContent />
    </Suspense>
  )
}

function UnsubscribeLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4 animate-pulse" />
        <p className="text-gray-600 dark:text-gray-400">Processing...</p>
      </div>
    </div>
  )
}
