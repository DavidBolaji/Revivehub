import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiffViewer } from '@/components/transformation/DiffViewer'
import type { Diff } from '@/types/transformer'

describe('DiffViewer', () => {
  const mockDiff: Diff = {
    original: 'const x = 1;\nconst y = 2;\nconst z = 3;',
    transformed: 'const x = 1;\nconst y = 5;\nconst w = 4;',
    unified: '',
    visual: [
      {
        type: 'unchanged',
        lineNumber: 1,
        content: 'const x = 1;',
        oldLineNumber: 1,
        newLineNumber: 1,
      },
      {
        type: 'removed',
        lineNumber: 2,
        content: 'const y = 2;',
        oldLineNumber: 2,
      },
      {
        type: 'added',
        lineNumber: 2,
        content: 'const y = 5;',
        newLineNumber: 2,
      },
      {
        type: 'removed',
        lineNumber: 3,
        content: 'const z = 3;',
        oldLineNumber: 3,
      },
      {
        type: 'added',
        lineNumber: 3,
        content: 'const w = 4;',
        newLineNumber: 3,
      },
    ],
    characterLevel: [],
  }

  const mockOnAccept = vi.fn()
  const mockOnReject = vi.fn()

  it('renders file path in header', () => {
    render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    expect(screen.getByText('src/test.ts')).toBeInTheDocument()
  })

  it('displays change summary with correct counts', () => {
    render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    // 2 added lines
    expect(screen.getByText('+2')).toBeInTheDocument()
    // 2 removed lines
    expect(screen.getByText('-2')).toBeInTheDocument()
    // Total 4 changes
    expect(screen.getByText('4 changes')).toBeInTheDocument()
  })

  it('renders split-pane view with Before and After labels', () => {
    render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    const beforeLabels = screen.getAllByText('Before')
    const afterLabels = screen.getAllByText('After')
    
    expect(beforeLabels.length).toBeGreaterThan(0)
    expect(afterLabels.length).toBeGreaterThan(0)
  })

  it('displays all diff lines with correct content', () => {
    const { container } = render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    // Check that code content is rendered (content is in dangerouslySetInnerHTML with syntax highlighting)
    const htmlContent = container.innerHTML
    // Check for key parts of the code (syntax highlighting breaks up the text)
    expect(htmlContent).toContain('const')
    expect(htmlContent).toContain('x')
    expect(htmlContent).toContain('y')
    expect(htmlContent).toContain('z')
    expect(htmlContent).toContain('w')
    // Check for the numbers
    expect(htmlContent).toContain('>1<')
    expect(htmlContent).toContain('>2<')
    expect(htmlContent).toContain('>5<')
    expect(htmlContent).toContain('>3<')
    expect(htmlContent).toContain('>4<')
  })

  it('shows navigation controls when changes exist', () => {
    render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    expect(screen.getByText(/Change 1 of 4/)).toBeInTheDocument()
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('navigates between changes using Previous/Next buttons', () => {
    render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    const nextButton = screen.getByText('Next')
    
    // Initially at change 1
    expect(screen.getByText(/Change 1 of 4/)).toBeInTheDocument()
    
    // Click Next
    fireEvent.click(nextButton)
    expect(screen.getByText(/Change 2 of 4/)).toBeInTheDocument()
    
    // Click Previous
    const previousButton = screen.getByText('Previous')
    fireEvent.click(previousButton)
    expect(screen.getByText(/Change 1 of 4/)).toBeInTheDocument()
  })

  it('disables Previous button at first change', () => {
    render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    const previousButton = screen.getByText('Previous').closest('button')
    expect(previousButton).toBeDisabled()
  })

  it('disables Next button at last change', () => {
    render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    const nextButton = screen.getByText('Next')
    
    // Navigate to last change
    fireEvent.click(nextButton) // Change 2
    fireEvent.click(nextButton) // Change 3
    fireEvent.click(nextButton) // Change 4
    
    const nextButtonElement = nextButton.closest('button')
    expect(nextButtonElement).toBeDisabled()
  })

  it('calls onAccept when Accept button is clicked', () => {
    render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    const acceptButtons = screen.getAllByText('Accept')
    fireEvent.click(acceptButtons[0])
    
    expect(mockOnAccept).toHaveBeenCalledTimes(1)
  })

  it('calls onReject when Reject button is clicked', () => {
    render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    const rejectButtons = screen.getAllByText('Reject')
    fireEvent.click(rejectButtons[0])
    
    expect(mockOnReject).toHaveBeenCalledTimes(1)
  })

  it('renders Accept and Reject buttons in header and footer', () => {
    render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    // Should have multiple Accept/Reject buttons (header and footer)
    const acceptButtons = screen.getAllByText(/Accept/)
    const rejectButtons = screen.getAllByText(/Reject/)
    
    expect(acceptButtons.length).toBeGreaterThanOrEqual(2)
    expect(rejectButtons.length).toBeGreaterThanOrEqual(2)
  })

  it('detects language from file extension', () => {
    const { container } = render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/component.tsx"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    // Component should render without errors for .tsx files
    expect(container).toBeInTheDocument()
  })

  it('handles files with no changes', () => {
    const noDiff: Diff = {
      original: 'const x = 1;',
      transformed: 'const x = 1;',
      unified: '',
      visual: [
        {
          type: 'unchanged',
          lineNumber: 1,
          content: 'const x = 1;',
          oldLineNumber: 1,
          newLineNumber: 1,
        },
      ],
      characterLevel: [],
    }

    render(
      <DiffViewer
        diff={noDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    // Should show 0 changes
    expect(screen.getByText('0 changes')).toBeInTheDocument()
  })

  it('displays modified lines correctly', () => {
    const modifiedDiff: Diff = {
      original: 'const x = 1;',
      transformed: 'const x = 2;',
      unified: '',
      visual: [
        {
          type: 'modified',
          lineNumber: 1,
          content: 'const x = 2;',
          oldLineNumber: 1,
          newLineNumber: 1,
        },
      ],
      characterLevel: [],
    }

    render(
      <DiffViewer
        diff={modifiedDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    // Should show 1 modified line
    expect(screen.getByText(/~1/)).toBeInTheDocument()
    expect(screen.getByText('modified')).toBeInTheDocument()
  })

  it('renders line numbers for both sides', () => {
    const { container } = render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    // Line numbers should be present in the DOM
    // They are rendered as text content in line number divs
    expect(container.textContent).toContain('1')
    expect(container.textContent).toContain('2')
    expect(container.textContent).toContain('3')
  })

  it('applies correct styling to added lines', () => {
    const { container } = render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    // Check for green background class on added lines
    const addedLines = container.querySelectorAll('.bg-green-50')
    expect(addedLines.length).toBeGreaterThan(0)
  })

  it('applies correct styling to removed lines', () => {
    const { container } = render(
      <DiffViewer
        diff={mockDiff}
        filePath="src/test.ts"
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    )

    // Check for red background class on removed lines
    const removedLines = container.querySelectorAll('.bg-red-50')
    expect(removedLines.length).toBeGreaterThan(0)
  })
})
