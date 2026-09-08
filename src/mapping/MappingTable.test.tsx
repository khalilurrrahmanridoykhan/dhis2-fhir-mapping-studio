import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import type { DhisTargetProgram } from '../dhis2/types'
import { MappingTable } from './MappingTable'
import { createEmptyMappingProfile, fhirFieldMappedTo } from './MappingProfile'

const program: DhisTargetProgram = {
  id: 'prog1',
  name: 'Test Immunization Program',
  programStages: [
    {
      id: 'stage1',
      name: 'Test stage',
      programStageDataElements: [
        { dataElement: { id: 'de1', name: 'Vaccine given', valueType: 'TEXT' } },
        { dataElement: { id: 'de2', name: 'Dose date', valueType: 'DATE' } },
      ],
    },
  ],
}

describe('MappingTable', () => {
  it('renders one row per data element on the program stage', () => {
    render(<MappingTable program={program} profile={createEmptyMappingProfile(program)} onChange={jest.fn()} />)
    expect(screen.getByText('Vaccine given')).toBeInTheDocument()
    expect(screen.getByText('Dose date')).toBeInTheDocument()
    expect(screen.getByText('TEXT')).toBeInTheDocument()
    expect(screen.getByText('DATE')).toBeInTheDocument()
  })

  it('picking a field for a row calls onChange with that field mapped to the right data element', () => {
    const onChange = jest.fn()
    render(<MappingTable program={program} profile={createEmptyMappingProfile(program)} onChange={onChange} />)

    // Both rows start unmapped, so both selects show the same placeholder --
    // scope the click to the first row specifically rather than assuming
    // getByText finds a unique match.
    const firstRowSelect = screen.getAllByText('Not mapped')[0]
    fireEvent.click(firstRowSelect)

    const option = screen.getByText('Vaccine code *')
    fireEvent.click(option)

    expect(onChange).toHaveBeenCalledTimes(1)
    const updatedProfile = onChange.mock.calls[0][0]
    expect(fhirFieldMappedTo(updatedProfile, 'de1')).toBe('vaccineCode')
  })

  it('a required field mapped in shows a "required" tag', () => {
    let profile = createEmptyMappingProfile(program)
    profile = { ...profile, fieldMappings: [{ dhisDataElementId: 'de1', fhirFieldPath: 'vaccineCode' }] }

    render(<MappingTable program={program} profile={profile} onChange={jest.fn()} />)
    expect(screen.getByText('required')).toBeInTheDocument()
  })
})
