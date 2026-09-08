import { CustomDataProvider } from '@dhis2/app-runtime'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { requiredImmunizationIgFields } from './fhir/immunizationIgFields'

it('renders without crashing', () => {
    const container = document.createElement('div')

    // App no longer queries 'me' directly -- its child ProgramPicker
    // queries 'programs' (see useTargetPrograms.ts). Mocked here with an
    // empty result; ProgramPicker.test.tsx already covers the populated
    // and error states in detail, this smoke test only needs App itself
    // to mount without crashing.
    const data = {
        programs: { programs: [] },
    }

    const root = createRoot(container)
    root.render(
        <CustomDataProvider data={data}>
            <App />
        </CustomDataProvider>
    )

    root.unmount()
})

class MockNotFoundError extends Error {
    details = { httpStatusCode: 404 }
}

const mockProgramsData = {
    programs: {
        programs: [
            {
                id: 'prog1',
                name: 'Immunization program',
                programStages: [
                    {
                        id: 'stage1',
                        name: 'Immunization stage',
                        programStageDataElements: [{ dataElement: { id: 'de1', name: 'Vaccine given', valueType: 'TEXT' } }],
                    },
                ],
            },
        ],
    },
    // useMappingProfile calls loadMappingProfile as soon as a program is
    // picked -- without a mock for this exact resource key,
    // CustomDataProvider's default failOnMiss throws, not simulates 404.
    'dataStore/fhirMappingStudio/mappingProfile-prog1': async () => {
        throw new MockNotFoundError('not found')
    },
}

it('selecting a program reveals step 2, the mapping table, with an unmapped-required-fields count', async () => {
    render(
        <CustomDataProvider data={mockProgramsData}>
            <App />
        </CustomDataProvider>
    )

    fireEvent.click(await screen.findByText('Select a target program'))
    fireEvent.click(await screen.findByText('Immunization program'))

    expect(await screen.findByText('Step 2: map its data elements to the WHO SG Immunization IG')).toBeInTheDocument()
    expect(screen.getByText('Vaccine given')).toBeInTheDocument()
    // Nothing mapped yet -- every required IG field should be reported
    // missing. Read the real count from immunizationIgFields.ts itself
    // rather than hardcode a number here that could silently drift.
    const requiredCount = requiredImmunizationIgFields().length
    expect(screen.getByText(new RegExp(`${requiredCount} required IG field\\(s\\) still unmapped`))).toBeInTheDocument()
})

it('clicking Save persists the current mapping and shows a saved confirmation', async () => {
    const mutateCalls: string[] = []
    const data = {
        ...mockProgramsData,
        'dataStore/fhirMappingStudio/mappingProfile-prog1': async (type: string) => {
            mutateCalls.push(type)
            if (type === 'read') {
                throw new MockNotFoundError('not found')
            }
            return null
        },
    }

    render(
        <CustomDataProvider data={data}>
            <App />
        </CustomDataProvider>
    )

    fireEvent.click(await screen.findByText('Select a target program'))
    fireEvent.click(await screen.findByText('Immunization program'))
    await screen.findByText('Step 2: map its data elements to the WHO SG Immunization IG')

    fireEvent.click(screen.getByText('Save mapping'))

    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(mutateCalls).toEqual(['read', 'create'])
})
