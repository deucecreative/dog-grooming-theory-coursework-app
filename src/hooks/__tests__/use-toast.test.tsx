import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast, toast } from '../use-toast'
import { ToastAction } from '@/components/ui/toast'

import { memoryState } from '../use-toast'

// Reset global toast state and clear any pending timers
const resetToastState = () => {
  memoryState.toasts = []
  vi.clearAllTimers()
}

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
    
    // Clear global toast state between tests
    resetToastState()
  })

  afterEach(() => {
    vi.useRealTimers()
    // Ensure complete state cleanup after each test
    resetToastState()
  })

  it('initializes with empty toasts array', () => {
    const { result } = renderHook(() => useToast())
    
    expect(result.current.toasts).toEqual([])
    expect(result.current.toast).toBeInstanceOf(Function)
    expect(result.current.dismiss).toBeInstanceOf(Function)
  })

  it('adds a new toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'This is a test toast',
      })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]).toMatchObject({
      title: 'Test Toast',
      description: 'This is a test toast',
    })
    expect(result.current.toasts[0].id).toBeDefined()
  })

  it('adds multiple toasts', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: 'Toast 1' })
      result.current.toast({ title: 'Toast 2' })
    })

    expect(result.current.toasts).toHaveLength(2)
    expect(result.current.toasts[0].title).toBe('Toast 1')
    expect(result.current.toasts[1].title).toBe('Toast 2')
  })

  it('dismisses a specific toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: 'Toast 1' })
      result.current.toast({ title: 'Toast 2' })
    })

    expect(result.current.toasts).toHaveLength(2)
    const toastId = result.current.toasts[0].id

    act(() => {
      result.current.dismiss(toastId)
    })

    expect(result.current.toasts).toHaveLength(2)
    expect(result.current.toasts[0].open).toBe(false)
    expect(result.current.toasts[1].open).toBe(true)
  })

  it('dismisses all toasts when called without id', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: 'Toast 1' })
      result.current.toast({ title: 'Toast 2' })
    })

    expect(result.current.toasts).toHaveLength(2)

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.toasts).toHaveLength(2)
    expect(result.current.toasts[0].open).toBe(false)
    expect(result.current.toasts[1].open).toBe(false)
  })

  it('schedules toast removal after dismiss delay', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        title: 'Auto dismiss toast',
      })
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      result.current.dismiss(result.current.toasts[0].id)
    })

    // Toast is dismissed (open: false) but not yet removed
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].open).toBe(false)

    // After the long delay (1000000ms), toast would be removed
    act(() => {
      vi.advanceTimersByTime(1000000)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it('does not auto-dismiss when duration is Infinity', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        title: 'Persistent toast',
        duration: Infinity,
      })
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(10000) // Wait much longer than normal timeout
    })

    expect(result.current.toasts).toHaveLength(1) // Should still be there
  })

  it('handles toast variants', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        title: 'Success toast',
        variant: 'default',
      })
    })

    expect(result.current.toasts[0].variant).toBe('default')

    act(() => {
      result.current.toast({
        title: 'Error toast',
        variant: 'destructive',
      })
    })

    // Should have both toasts with different variants
    expect(result.current.toasts).toHaveLength(2)
    expect(result.current.toasts[0].variant).toBe('default')
    expect(result.current.toasts[1].variant).toBe('destructive')
  })

  it('handles toast actions', () => {
    const { result } = renderHook(() => useToast())
    const mockOnClick = vi.fn()
    const mockAction = <ToastAction altText="Undo" onClick={mockOnClick} />

    act(() => {
      result.current.toast({
        title: 'Toast with action',
        action: mockAction,
      })
    })

    expect(result.current.toasts[0].action).toEqual(mockAction)
  })

  it('limits the number of toasts to prevent UI overflow', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      // Add 7 toasts to exceed the limit of 5
      for (let i = 1; i <= 7; i++) {
        result.current.toast({ title: `Toast ${i}` })
      }
    })

    // Should only keep the latest 5 toasts for good UX
    expect(result.current.toasts).toHaveLength(5)
    expect(result.current.toasts[0].title).toBe('Toast 3') // First kept toast (7-5+1)
    expect(result.current.toasts[4].title).toBe('Toast 7') // Latest toast
  })

  it('updates existing toast if same id is provided', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        id: 'test-toast',
        title: 'Original toast',
      })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].title).toBe('Original toast')

    act(() => {
      result.current.toast({
        id: 'test-toast',
        title: 'Updated toast',
      })
    })

    // Should still be 1 toast, but updated
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].title).toBe('Updated toast')
  })

  it('provides correct toast properties', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        title: 'Complete toast',
        description: 'With description',
        variant: 'destructive',
        duration: 5000,
      })
    })

    const toast = result.current.toasts[0]
    expect(toast).toMatchObject({
      title: 'Complete toast',
      description: 'With description',
      variant: 'destructive',
    })
    expect(toast.id).toBeDefined()
    expect(typeof toast.id).toBe('string')
  })
})

describe('toast function', () => {
  it('creates toast through global function', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      toast({ title: 'Global toast' })
    })

    // Since toast function dispatches to all useToast instances,
    // we need to check that it was called correctly
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].title).toBe('Global toast')
  })
})