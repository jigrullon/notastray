import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { verifyInternalMetricsKey } from './internalMetricsAuth'

const ORIGINAL_KEY = process.env.INTERNAL_METRICS_API_KEY

function requestWithKey(key: string | null): Request {
  const headers = new Headers()
  if (key !== null) headers.set('x-internal-metrics-key', key)
  return new Request('https://notastray.com/api/internal/metrics/summary', { headers })
}

describe('verifyInternalMetricsKey', () => {
  afterEach(() => {
    process.env.INTERNAL_METRICS_API_KEY = ORIGINAL_KEY
  })

  it('rejects when INTERNAL_METRICS_API_KEY is not configured', async () => {
    delete process.env.INTERNAL_METRICS_API_KEY
    const result = verifyInternalMetricsKey(requestWithKey('anything'))
    expect(result).not.toBeNull()
    expect(result?.status).toBe(500)
  })

  describe('with a configured key', () => {
    beforeEach(() => {
      process.env.INTERNAL_METRICS_API_KEY = 'test-secret-key'
    })

    it('rejects a missing header', () => {
      const result = verifyInternalMetricsKey(requestWithKey(null))
      expect(result?.status).toBe(401)
    })

    it('rejects a wrong key', () => {
      const result = verifyInternalMetricsKey(requestWithKey('wrong-key'))
      expect(result?.status).toBe(401)
    })

    it('accepts the correct key', () => {
      const result = verifyInternalMetricsKey(requestWithKey('test-secret-key'))
      expect(result).toBeNull()
    })
  })
})
