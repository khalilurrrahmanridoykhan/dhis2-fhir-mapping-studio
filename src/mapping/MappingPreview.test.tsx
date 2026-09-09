import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import { MappingPreview } from './MappingPreview'
import type { useMappingPreview } from './useMappingPreview'

type PreviewResult = ReturnType<typeof useMappingPreview>

function makePreview(overrides: Partial<PreviewResult> = {}): PreviewResult {
  return {
    rows: null,
    resourceCount: 0,
    loading: false,
    error: null,
    fetchPreview: jest.fn(),
    ...overrides,
  }
}

describe('MappingPreview', () => {
  it('renders a button that calls fetchPreview', () => {
    const fetchPreview = jest.fn()
    render(<MappingPreview preview={makePreview({ fetchPreview })} />)

    fireEvent.click(screen.getByText('Fetch a resource and preview the mapping'))
    expect(fetchPreview).toHaveBeenCalledTimes(1)
  })

  it('shows an error NoticeBox when the fetch failed', () => {
    render(<MappingPreview preview={makePreview({ error: new Error('route unreachable') })} />)
    expect(screen.getByText('Could not fetch a preview')).toBeInTheDocument()
    expect(screen.getByText('route unreachable')).toBeInTheDocument()
  })

  it('shows "No resources found" when the fetch succeeded but returned nothing', () => {
    render(<MappingPreview preview={makePreview({ rows: [], resourceCount: 0 })} />)
    expect(screen.getByText('No resources found')).toBeInTheDocument()
  })

  it('renders one table row per preview row, including an unmapped one', () => {
    render(
      <MappingPreview
        preview={makePreview({
          resourceCount: 1,
          rows: [
            { dhisDataElementId: 'de1', dhisDataElementName: 'Vaccination status', fhirFieldPath: 'status', fhirFieldLabel: 'Status', displayValue: 'completed' },
            { dhisDataElementId: 'de2', dhisDataElementName: 'Unrelated field', fhirFieldPath: null, fhirFieldLabel: null, displayValue: 'Not mapped' },
          ],
        })}
      />
    )

    expect(screen.getByText('Vaccination status')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('Unrelated field')).toBeInTheDocument()
    // Appears twice for the one unmapped row -- once in the "mapped IG
    // field" column, once in "value" -- both legitimately "Not mapped".
    expect(screen.getAllByText('Not mapped')).toHaveLength(2)
  })

  it('renders nothing extra before a preview has ever been fetched', () => {
    render(<MappingPreview preview={makePreview()} />)
    expect(screen.queryByText('No resources found')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
