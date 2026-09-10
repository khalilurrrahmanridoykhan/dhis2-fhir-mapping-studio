import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import { MappingPreview } from './MappingPreview'
import type { useMappingPreview } from './useMappingPreview'
import type { DhisOptionSet } from '../dhis2/types'

type PreviewResult = ReturnType<typeof useMappingPreview>

function makePreview(overrides: Partial<PreviewResult> = {}): PreviewResult {
  return {
    rows: null,
    resource: null,
    resourceCount: 0,
    loading: false,
    error: null,
    fetchPreview: jest.fn(),
    ...overrides,
  }
}

function renderPreview(preview: PreviewResult, onCodeMappingChange = jest.fn()) {
  render(<MappingPreview preview={preview} onCodeMappingChange={onCodeMappingChange} />)
  return { onCodeMappingChange }
}

const vaccineOptionSet: DhisOptionSet = {
  id: 'os1',
  name: 'Vaccines',
  options: [
    { code: 'YELLOW_FEVER', name: 'Yellow fever' },
    { code: 'MEASLES', name: 'Measles' },
  ],
}

describe('MappingPreview', () => {
  it('renders a button that calls fetchPreview', () => {
    const fetchPreview = jest.fn()
    renderPreview(makePreview({ fetchPreview }))

    fireEvent.click(screen.getByText('Fetch a resource and preview the mapping'))
    expect(fetchPreview).toHaveBeenCalledTimes(1)
  })

  it('shows an error NoticeBox when the fetch failed', () => {
    renderPreview(makePreview({ error: new Error('route unreachable') }))
    expect(screen.getByText('Could not fetch a preview')).toBeInTheDocument()
    expect(screen.getByText('route unreachable')).toBeInTheDocument()
  })

  it('shows "No resources found" when the fetch succeeded but returned nothing', () => {
    renderPreview(makePreview({ rows: [], resourceCount: 0 }))
    expect(screen.getByText('No resources found')).toBeInTheDocument()
  })

  it('renders one table row per preview row, including an unmapped one', () => {
    renderPreview(
      makePreview({
        resourceCount: 1,
        rows: [
          { dhisDataElementId: 'de1', dhisDataElementName: 'Vaccination status', fhirFieldPath: 'status', fhirFieldLabel: 'Status', displayValue: 'completed', codeMapping: null, compulsory: false, willBeWritten: true },
          { dhisDataElementId: 'de2', dhisDataElementName: 'Unrelated field', fhirFieldPath: null, fhirFieldLabel: null, displayValue: 'Not mapped', codeMapping: null, compulsory: false, willBeWritten: false },
        ],
      })
    )

    expect(screen.getByText('Vaccination status')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('Unrelated field')).toBeInTheDocument()
    // Appears twice for the one unmapped row -- once in the "mapped IG
    // field" column, once in "value" -- both legitimately "Not mapped".
    expect(screen.getAllByText('Not mapped')).toHaveLength(2)
    // No code-mapping opportunity on either row -- shown as a dash.
    expect(screen.getAllByText('--')).toHaveLength(2)
  })

  it('renders nothing extra before a preview has ever been fetched', () => {
    renderPreview(makePreview())
    expect(screen.queryByText('No resources found')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('warns, naming them, when compulsory data elements will have no value in the written event', () => {
    renderPreview(
      makePreview({
        resourceCount: 1,
        rows: [
          { dhisDataElementId: 'de1', dhisDataElementName: 'IC Activity', fhirFieldPath: null, fhirFieldLabel: null, displayValue: 'Not mapped', codeMapping: null, compulsory: true, willBeWritten: false },
          { dhisDataElementId: 'de2', dhisDataElementName: 'IC Topic', fhirFieldPath: 'statusReason', fhirFieldLabel: 'Status reason', displayValue: '(no value)', codeMapping: null, compulsory: true, willBeWritten: false },
          { dhisDataElementId: 'de3', dhisDataElementName: 'Status', fhirFieldPath: 'status', fhirFieldLabel: 'Status', displayValue: 'completed', codeMapping: null, compulsory: false, willBeWritten: true },
        ],
      })
    )
    expect(screen.getByText('DHIS2 will reject this write -- compulsory data elements have no value')).toBeInTheDocument()
    expect(screen.getByText(/IC Activity, IC Topic/)).toBeInTheDocument()
  })

  it('shows no compulsory warning when every compulsory row will be written', () => {
    renderPreview(
      makePreview({
        resourceCount: 1,
        rows: [
          { dhisDataElementId: 'de1', dhisDataElementName: 'Status', fhirFieldPath: 'status', fhirFieldLabel: 'Status', displayValue: 'completed', codeMapping: null, compulsory: true, willBeWritten: true },
        ],
      })
    )
    expect(screen.queryByText('DHIS2 will reject this write -- compulsory data elements have no value')).not.toBeInTheDocument()
  })

  describe('code mapping', () => {
    function rowWith(overrides: { resolvedOptionCode: string | null }) {
      return {
        dhisDataElementId: 'de-vaccine',
        dhisDataElementName: 'Vaccine given',
        fhirFieldPath: 'vaccineCode',
        fhirFieldLabel: 'Vaccine code',
        displayValue: 'Yellow fever vaccine',
        compulsory: false,
        willBeWritten: overrides.resolvedOptionCode !== null,
        codeMapping: {
          optionSet: vaccineOptionSet,
          observedCode: 'YF',
          observedDisplay: 'Yellow fever vaccine',
          resolvedOptionCode: overrides.resolvedOptionCode,
        },
      }
    }

    it('shows a picker with a warning when the observed code has no translation yet', () => {
      renderPreview(makePreview({ resourceCount: 1, rows: [rowWith({ resolvedOptionCode: null })] }))
      expect(screen.getByText('Map code "YF" to...')).toBeInTheDocument()
      expect(screen.getByText('Not yet mapped -- omitted from what gets written')).toBeInTheDocument()
    })

    it('shows no warning once a translation is already saved', () => {
      renderPreview(makePreview({ resourceCount: 1, rows: [rowWith({ resolvedOptionCode: 'YELLOW_FEVER' })] }))
      expect(screen.queryByText('Not yet mapped -- omitted from what gets written')).not.toBeInTheDocument()
    })

    it('picking an option calls onCodeMappingChange with the data element id, observed code, and chosen option code', async () => {
      const { onCodeMappingChange } = renderPreview(
        makePreview({ resourceCount: 1, rows: [rowWith({ resolvedOptionCode: null })] })
      )

      fireEvent.click(screen.getByText('Map code "YF" to...'))
      fireEvent.click(await screen.findByText('Yellow fever'))

      expect(onCodeMappingChange).toHaveBeenCalledWith('de-vaccine', 'YF', 'YELLOW_FEVER')
    })
  })
})
