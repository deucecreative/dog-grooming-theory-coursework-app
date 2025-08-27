import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { Input } from '../input'

describe('Input', () => {
  it('renders with default styles', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    
    // Test for key structural and accessibility classes
    expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md')
    expect(input).toHaveClass('border', 'border-input', 'bg-background')
    expect(input).toHaveClass('px-3', 'py-2')
    // Test responsive text sizing (text-base by default, text-sm on md screens)
    expect(input).toHaveClass('text-base', 'md:text-sm')
    // Test accessibility classes
    expect(input).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2')
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
  })

  it('accepts different input types', () => {
    const { rerender } = render(<Input type="email" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password')

    rerender(<Input type="number" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'number')
  })

  it('handles value changes', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    
    render(<Input onChange={handleChange} placeholder="Type here" />)
    const input = screen.getByPlaceholderText('Type here')
    
    await user.type(input, 'Hello World')
    
    expect(input).toHaveValue('Hello World')
    expect(handleChange).toHaveBeenCalled()
  })

  it('can be disabled', () => {
    render(<Input disabled placeholder="Disabled input" />)
    const input = screen.getByPlaceholderText('Disabled input')
    expect(input).toBeDisabled()
  })

  it('supports controlled input', async () => {
    const user = userEvent.setup()
    let value = ''
    const handleChange = vi.fn((e) => {
      value = e.target.value
    })

    const { rerender } = render(
      <Input value={value} onChange={handleChange} placeholder="Controlled" />
    )
    
    const input = screen.getByPlaceholderText('Controlled')
    await user.type(input, 'test')
    
    // Simulate controlled component rerender with new value
    rerender(
      <Input value="test" onChange={handleChange} placeholder="Controlled" />
    )
    
    expect(input).toHaveValue('test')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<Input className="custom-input" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveClass('custom-input')
  })

  it('supports all standard input attributes', () => {
    render(
      <Input
        id="test-input"
        name="testName"
        placeholder="Test placeholder"
        required
        minLength={5}
        maxLength={100}
        data-testid="input"
      />
    )
    
    const input = screen.getByTestId('input')
    expect(input).toHaveAttribute('id', 'test-input')
    expect(input).toHaveAttribute('name', 'testName')
    expect(input).toHaveAttribute('placeholder', 'Test placeholder')
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('minlength', '5')
    expect(input).toHaveAttribute('maxlength', '100')
  })

  it('has proper focus styles', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Focus test" />)
    
    const input = screen.getByPlaceholderText('Focus test')
    await user.click(input)
    
    expect(input).toHaveFocus()
  })
})