import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default styles', () => {
      render(<Card data-testid="card">Card content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card')
    })

    it('applies custom className', () => {
      render(<Card className="custom-card">Card</Card>)
      expect(screen.getByText('Card')).toHaveClass('custom-card')
    })
  })

  describe('CardHeader', () => {
    it('renders with correct styles', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
    })
  })

  describe('CardTitle', () => {
    it('renders as h3 by default with correct styles', () => {
      render(<CardTitle>Card Title</CardTitle>)
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveClass('text-2xl', 'font-semibold')
      expect(title).toHaveTextContent('Card Title')
    })
  })

  describe('CardDescription', () => {
    it('renders with correct styles', () => {
      render(<CardDescription>Card description text</CardDescription>)
      const description = screen.getByText('Card description text')
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('text-sm', 'text-muted-foreground')
    })
  })

  describe('CardContent', () => {
    it('renders with correct padding', () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      const content = screen.getByTestId('content')
      expect(content).toBeInTheDocument()
      expect(content).toHaveClass('p-6', 'pt-0')
    })
  })

  describe('CardFooter', () => {
    it('renders with correct styles', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
    })
  })

  describe('Complete Card Structure', () => {
    it('renders a complete card with all sections', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      )

      // Check all parts are rendered
      expect(screen.getByTestId('complete-card')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Test Title' })).toBeInTheDocument()
      expect(screen.getByText('Test description')).toBeInTheDocument()
      expect(screen.getByText('Main content goes here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })
  })
})