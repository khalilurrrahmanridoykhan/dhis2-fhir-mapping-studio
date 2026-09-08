import { CustomDataProvider } from '@dhis2/app-runtime'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
// No global jest setup file is exposed by d2-app-scripts' internal test
// config, so the jest-dom matchers (toBeInTheDocument, etc.) are imported
// directly here rather than assumed to be globally registered.
import '@testing-library/jest-dom'
import React from 'react'
import { ProgramPicker } from './ProgramPicker'

// Shaped exactly like the real response verified live against
// play.im.dhis2.org/stable-2-43-1's /api/programs.json with the same
// field selector useTargetPrograms.ts actually sends -- not invented.
// CustomDataProvider matches mock data by the query's `resource` string
// (confirmed directly from @dhis2/data-engine's own CustomDataLink test),
// so this is keyed 'programs' to match useTargetPrograms' query.
const mockProgramsResponse = {
  programs: {
    programs: [
      {
        id: 'lxAQ7Zs9VYR',
        name: 'Antenatal care visit',
        programStages: [
          {
            id: 'dBwrot7S420',
            name: 'Antenatal care visit',
            programStageDataElements: [
              { dataElement: { id: 'sWoqcoByYmD', name: 'WHOMCH Smoking', valueType: 'BOOLEAN' } },
              { dataElement: { id: 'vANAXwtLwcT', name: 'WHOMCH Hemoglobin value', valueType: 'NUMBER' } },
            ],
          },
        ],
      },
    ],
  },
}

describe('ProgramPicker', () => {
  it('lists live-browsed programs and calls onSelect with the full program object', async () => {
    const onSelect = jest.fn()
    render(
      <CustomDataProvider data={mockProgramsResponse}>
        <ProgramPicker selectedProgramId={null} onSelect={onSelect} />
      </CustomDataProvider>
    )

    // @dhis2/ui's SingleSelect renders its placeholder as visible text
    // content, not a real <input placeholder> attribute -- confirmed by
    // running this test and reading the actual rendered DOM rather than
    // assumed from the component's prop name.
    const select = await screen.findByText('Select a target program')
    fireEvent.click(select)

    const option = await screen.findByText('Antenatal care visit')
    fireEvent.click(option)

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(mockProgramsResponse.programs.programs[0])
    })
  })

  it('shows a NoticeBox, not a crash, when the instance has no eligible programs', async () => {
    render(
      <CustomDataProvider data={{ programs: { programs: [] } }}>
        <ProgramPicker selectedProgramId={null} onSelect={jest.fn()} />
      </CustomDataProvider>
    )

    expect(await screen.findByText('No eligible programs found')).toBeInTheDocument()
  })
})
