import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import { Progress } from '../progress'

describe('Progress', () => {
  it('renders with default value of 0', () => {
    render(<Progress data-testid="progress" />)
    const progress = screen.getByTestId('progress')
    const progressBar = progress.querySelector('[data-state="loading"]')
    
    expect(progress).toBeInTheDocument()
    expect(progress).toHaveClass('relative', 'h-4', 'w-full', 'overflow-hidden', 'rounded-full', 'bg-secondary')
    expect(progressBar).toHaveStyle('transform: translateX(-100%)')
  })

  it('renders with specified value', () => {
    render(<Progress value={50} data-testid="progress" />)
    const progress = screen.getByTestId('progress')
    const progressBar = progress.querySelector('[data-state="loading"]')
    
    expect(progressBar).toHaveStyle('transform: translateX(-50%)')
  })

  it('renders with 100% value', () => {
    render(<Progress value={100} data-testid="progress" />)
    const progress = screen.getByTestId('progress')
    const progressBar = progress.querySelector('[data-state="complete"]')
    
    expect(progressBar).toHaveStyle('transform: translateX(0%)')
  })

  it('handles values over 100', () => {
    render(<Progress value={150} data-testid="progress" />)
    const progress = screen.getByTestId('progress')
    const progressBar = progress.querySelector('[data-state="complete"]')
    
    expect(progressBar).toHaveStyle('transform: translateX(0%)')
  })

  it('handles negative values', () => {
    render(<Progress value={-50} data-testid="progress" />)
    const progress = screen.getByTestId('progress')
    const progressBar = progress.querySelector('[data-state="loading"]')
    
    expect(progressBar).toHaveStyle('transform: translateX(-100%)')
  })

  it('applies custom className', () => {
    render(<Progress className="custom-progress" data-testid="progress" />)
    expect(screen.getByTestId('progress')).toHaveClass('custom-progress')
  })

  it('has proper accessibility attributes', () => {
    render(<Progress value={75} data-testid="progress" />)
    const progress = screen.getByTestId('progress')
    
    expect(progress).toHaveAttribute('data-value', '75')
    expect(progress).toHaveAttribute('data-state', 'loading')
  })

  it('indicates complete state at 100%', () => {
    render(<Progress value={100} data-testid="progress" />)
    const progress = screen.getByTestId('progress')
    
    expect(progress).toHaveAttribute('data-state', 'complete')
  })

  it('shows loading state for values less than 100%', () => {
    const { rerender } = render(<Progress value={0} data-testid="progress" />)
    expect(screen.getByTestId('progress')).toHaveAttribute('data-state', 'loading')

    rerender(<Progress value={50} data-testid="progress" />)
    expect(screen.getByTestId('progress')).toHaveAttribute('data-state', 'loading')

    rerender(<Progress value={99} data-testid="progress" />)
    expect(screen.getByTestId('progress')).toHaveAttribute('data-state', 'loading')
  })
})