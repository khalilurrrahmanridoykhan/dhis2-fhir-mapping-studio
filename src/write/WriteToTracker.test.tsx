import { CustomDataProvider } from '@dhis2/app-runtime'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import { WriteToTracker } from './WriteToTracker'
import type { useWriteMappedEvent } from './useWriteMappedEvent'
import type { MockData } from '../test-utils/customDataProvider'

type WriteResult = ReturnType<typeof useWriteMappedEvent>

function makeWrite(overrides: Partial<WriteResult> = {}): WriteResult {
  return {
    orgUnitId: null,
    setOrgUnitId: jest.fn(),
    writing: false,
    outcome: null,
    buildError: null,
    canWrite: false,
    write: jest.fn(),
    ...overrides,
  }
}

function renderWithProvider(ui: React.ReactElement, data: MockData = { organisationUnits: { organisationUnits: [] } }) {
  return render(<CustomDataProvider data={data as never}>{ui}</CustomDataProvider>)
}

describe('WriteToTracker', () => {
  it('renders the org unit picker and a disabled write button until canWrite is true', () => {
    renderWithProvider(<WriteToTracker write={makeWrite()} />)
    const button = screen.getByText('Write this event to DHIS2')
    expect(button.closest('button')).toBeDisabled()
  })

  it('clicking an enabled write button calls write()', () => {
    const writeFn = jest.fn()
    renderWithProvider(<WriteToTracker write={makeWrite({ canWrite: true, write: writeFn })} />)

    fireEvent.click(screen.getByText('Write this event to DHIS2'))
    expect(writeFn).toHaveBeenCalledTimes(1)
  })

  it('shows a build error distinctly from a submit failure', () => {
    renderWithProvider(<WriteToTracker write={makeWrite({ buildError: 'This resource has no occurrenceDateTime.' })} />)
    expect(screen.getByText('Could not build this event')).toBeInTheDocument()
    expect(screen.getByText('This resource has no occurrenceDateTime.')).toBeInTheDocument()
  })

  it('shows a success notice with the created event id', () => {
    renderWithProvider(
      <WriteToTracker write={makeWrite({ outcome: { success: true, eventId: 'newEvent1', errorMessages: [] } })} />
    )
    expect(screen.getByText('Event written')).toBeInTheDocument()
    expect(screen.getByText(/newEvent1/)).toBeInTheDocument()
  })

  it('shows DHIS2 own validation messages on a rejected write', () => {
    renderWithProvider(
      <WriteToTracker
        write={makeWrite({ outcome: { success: false, eventId: null, errorMessages: ['Value is not a valid option.'] } })}
      />
    )
    expect(screen.getByText('DHIS2 rejected this event')).toBeInTheDocument()
    expect(screen.getByText('Value is not a valid option.')).toBeInTheDocument()
  })
})
