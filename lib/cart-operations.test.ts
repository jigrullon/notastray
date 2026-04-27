import { describe, it, expect } from 'vitest'
import {
  generateId,
  addItemToCart,
  removeItemFromCart,
  updateItemQuantity,
  calculateSubtotal,
  calculateItemCount,
  MAX_QUANTITY,
} from './cart-operations'

const base = { name: 'Pet Tag', color: 'red', size: 'small', price: 29.99, image: '/tag.jpg' }
const makeItem = (overrides: Record<string, unknown> = {}) => ({ ...base, ...overrides })

describe('generateId', () => {
  it('combines color and size with a dash', () => {
    expect(generateId('red', 'small')).toBe('red-small')
  })
})

describe('addItemToCart', () => {
  it('adds a new item to an empty cart', () => {
    const result = addItemToCart([], makeItem({ quantity: 1 }))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('red-small')
    expect(result[0].quantity).toBe(1)
  })

  it('merges quantity when adding the same color+size again', () => {
    const cart = addItemToCart([], makeItem({ quantity: 2 }))
    const result = addItemToCart(cart, makeItem({ quantity: 3 }))
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(5)
  })

  it('adds a different color as a separate entry', () => {
    const cart = addItemToCart([], makeItem({ color: 'blue', quantity: 1 }))
    const result = addItemToCart(cart, makeItem({ color: 'red', quantity: 1 }))
    expect(result).toHaveLength(2)
  })

  it('caps quantity at MAX_QUANTITY for a new item', () => {
    const result = addItemToCart([], makeItem({ quantity: MAX_QUANTITY + 5 }))
    expect(result[0].quantity).toBe(MAX_QUANTITY)
  })

  it('caps merged quantity at MAX_QUANTITY', () => {
    const cart = addItemToCart([], makeItem({ quantity: MAX_QUANTITY - 1 }))
    const result = addItemToCart(cart, makeItem({ quantity: 5 }))
    expect(result[0].quantity).toBe(MAX_QUANTITY)
  })
})

describe('removeItemFromCart', () => {
  it('removes the matching item', () => {
    const cart = addItemToCart([], makeItem({ quantity: 1 }))
    expect(removeItemFromCart(cart, 'red-small')).toHaveLength(0)
  })

  it('leaves other items untouched', () => {
    let cart = addItemToCart([], makeItem({ color: 'red', quantity: 1 }))
    cart = addItemToCart(cart, makeItem({ color: 'blue', quantity: 1 }))
    const result = removeItemFromCart(cart, 'red-small')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('blue-small')
  })

  it('is a no-op for a non-existent id', () => {
    const cart = addItemToCart([], makeItem({ quantity: 1 }))
    expect(removeItemFromCart(cart, 'ghost-item')).toHaveLength(1)
  })
})

describe('updateItemQuantity', () => {
  it('updates the quantity', () => {
    const cart = addItemToCart([], makeItem({ quantity: 1 }))
    expect(updateItemQuantity(cart, 'red-small', 4)[0].quantity).toBe(4)
  })

  it('removes the item when quantity is 0', () => {
    const cart = addItemToCart([], makeItem({ quantity: 1 }))
    expect(updateItemQuantity(cart, 'red-small', 0)).toHaveLength(0)
  })

  it('removes the item when quantity is negative', () => {
    const cart = addItemToCart([], makeItem({ quantity: 1 }))
    expect(updateItemQuantity(cart, 'red-small', -1)).toHaveLength(0)
  })

  it('caps at MAX_QUANTITY', () => {
    const cart = addItemToCart([], makeItem({ quantity: 1 }))
    expect(updateItemQuantity(cart, 'red-small', MAX_QUANTITY + 99)[0].quantity).toBe(MAX_QUANTITY)
  })
})

describe('calculateSubtotal', () => {
  it('returns 0 for an empty cart', () => {
    expect(calculateSubtotal([])).toBe(0)
  })

  it('multiplies price by quantity and sums across items', () => {
    let cart = addItemToCart([], makeItem({ color: 'red', quantity: 2, price: 10 }))
    cart = addItemToCart(cart, makeItem({ color: 'blue', quantity: 3, price: 5 }))
    expect(calculateSubtotal(cart)).toBe(35) // 2×10 + 3×5
  })
})

describe('calculateItemCount', () => {
  it('returns 0 for an empty cart', () => {
    expect(calculateItemCount([])).toBe(0)
  })

  it('sums quantities across all items', () => {
    let cart = addItemToCart([], makeItem({ color: 'red', quantity: 2 }))
    cart = addItemToCart(cart, makeItem({ color: 'blue', quantity: 3 }))
    expect(calculateItemCount(cart)).toBe(5)
  })
})
