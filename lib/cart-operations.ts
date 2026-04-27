export interface CartItem {
  id: string
  name: string
  color: string
  size: string
  quantity: number
  price: number
  image: string
}

export const MAX_QUANTITY = 10

export function generateId(color: string, size: string): string {
  return `${color}-${size}`
}

export function addItemToCart(items: CartItem[], item: Omit<CartItem, 'id'>): CartItem[] {
  const id = generateId(item.color, item.size)
  const existing = items.find((i) => i.id === id)
  if (existing) {
    return items.map((i) =>
      i.id === id
        ? { ...i, quantity: Math.min(i.quantity + (item.quantity || 1), MAX_QUANTITY) }
        : i
    )
  }
  return [...items, { ...item, id, quantity: Math.min(item.quantity || 1, MAX_QUANTITY) }]
}

export function removeItemFromCart(items: CartItem[], id: string): CartItem[] {
  return items.filter((i) => i.id !== id)
}

export function updateItemQuantity(items: CartItem[], id: string, quantity: number): CartItem[] {
  if (quantity <= 0) {
    return items.filter((i) => i.id !== id)
  }
  return items.map((i) =>
    i.id === id ? { ...i, quantity: Math.min(quantity, MAX_QUANTITY) } : i
  )
}

export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function calculateItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}
