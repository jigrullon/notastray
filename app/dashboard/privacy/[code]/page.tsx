'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Privacy sharing is account-wide now (applies to all of a user's pets at
// once) rather than configured per pet — redirect anyone who still hits the
// old per-tag URL to the single settings page.
export default function LegacyPetPrivacyRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/privacy')
  }, [router])

  return null
}
