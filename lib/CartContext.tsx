'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  CartItem,
  MAX_QUANTITY,
  addItemToCart,
  removeItemFromCart,
  updateItemQuantity,
  calculateSubtotal,
  calculateItemCount,
} from './cart-operations'

export type { CartItem }

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  itemCount: number
  subtotal: number
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const STORAGE_KEY = 'notastray-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    }
    setIsInitialized(true)
  }, [])

  // Save cart to localStorage on every change (after initialization)
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      } catch {
        // Ignore storage errors
      }
    }
  }, [items, isInitialized])

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    setItems((prev) => addItemToCart(prev, item))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => removeItemFromCart(prev, id))
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => updateItemQuantity(prev, id, quantity))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const itemCount = calculateItemCount(items)
  const subtotal = calculateSubtotal(items)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
