import { describe, it, expect } from 'vitest'
import { calculatePackageWeight } from './shipping-config'

describe('calculatePackageWeight', () => {
  it('defaults to quantity 1 when items array is empty', () => {
    // 1 tag (2oz) + packaging (3oz) = 5oz
    expect(calculatePackageWeight([])).toBe(5)
  })

  it('calculates weight for a single tag', () => {
    expect(calculatePackageWeight([{ quantity: 1 }])).toBe(5)
  })

  it('scales with quantity of the first item', () => {
    expect(calculatePackageWeight([{ quantity: 3 }])).toBe(9) // 3×2 + 3
  })
})
