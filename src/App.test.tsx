import { CustomDataProvider } from '@dhis2/app-runtime'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { requiredImmunizationIgFields } from './fhir/immunizationIgFields'

class MockNotFoundError extends Error {
    details = { httpStatusCode: 404 }
}

// Shared across every test below -- App now also queries 'routes' and
// 'me' (via useFhirRoute/useCurrentUserAuthorities for Step 1's
// RoutePicker) and the connection dataStore key (via useFhirConnection),
// on top of 'programs'. Each hook's own test file already covers the
// populated and error states in detail; these mocks just keep App itself
// mountable without touching Step 1's own behavior.
const baseAppData = {
    routes: { routes: [] },
    me: { username: 'admin', authorities: ['ALL'] },
    'dataStore/fhirMappingStudio/connection': async () => {
        throw new MockNotFoundError('not found')
    },
}

it('renders without crashing', () => {
    const container = document.createElement('div')

    const data = {
        ...baseAppData,
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

const mockProgramsData = {
    ...baseAppData,
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

it('selecting a program reveals step 3, the mapping table, with an unmapped-required-fields count', async () => {
    render(
        <CustomDataProvider data={mockProgramsData}>
            <App />
        </CustomDataProvider>
    )

    fireEvent.click(await screen.findByText('Select a target program'))
    fireEvent.click(await screen.findByText('Immunization program'))

    expect(await screen.findByText('Step 3: map its data elements to the WHO SG Immunization IG')).toBeInTheDocument()
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
    await screen.findByText('Step 3: map its data elements to the WHO SG Immunization IG')

    fireEvent.click(screen.getByText('Save mapping'))

    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(mutateCalls).toEqual(['read', 'create'])
})

it('picking a route in Step 1 persists the connection', async () => {
    const connectionCalls: string[] = []
    const data = {
        ...mockProgramsData,
        routes: { routes: [{ id: 'route1', name: 'Clinic FHIR server', code: 'clinic', url: 'https://hapi.fhir.org/baseR4/**' }] },
        'dataStore/fhirMappingStudio/connection': async (type: string) => {
            connectionCalls.push(type)
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

    fireEvent.click(await screen.findByText('Select a route to a FHIR server'))
    fireEvent.click(await screen.findByText('Clinic FHIR server'))

    expect(await screen.findByText(/Selected route target/)).toBeInTheDocument()
    expect(connectionCalls).toEqual(['read', 'create'])
})

it('Step 3 asks to connect a FHIR server first when no route is picked yet', async () => {
    render(
        <CustomDataProvider data={mockProgramsData}>
            <App />
        </CustomDataProvider>
    )

    fireEvent.click(await screen.findByText('Select a target program'))
    fireEvent.click(await screen.findByText('Immunization program'))

    expect(await screen.findByText('Connect a FHIR server in Step 1 to preview this mapping')).toBeInTheDocument()
    expect(screen.queryByText('Step 4: preview against a real fetched resource')).not.toBeInTheDocument()
})

it('with a route already connected, Step 4 fetches a real resource and previews the mapping', async () => {
    const data = {
        ...mockProgramsData,
        routes: { routes: [{ id: 'route1', name: 'Clinic FHIR server', code: 'clinic', url: 'https://hapi.fhir.org/baseR4/**' }] },
        'dataStore/fhirMappingStudio/connection': { routeId: 'route1' },
    }

    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
            resourceType: 'Bundle',
            entry: [{ resource: { resourceType: 'Immunization', id: 'i1', status: 'completed' } }],
        }),
    }) as unknown as typeof fetch

    render(
        <CustomDataProvider data={data}>
            <App />
        </CustomDataProvider>
    )

    fireEvent.click(await screen.findByText('Select a target program'))
    fireEvent.click(await screen.findByText('Immunization program'))

    expect(await screen.findByText('Step 4: preview against a real fetched resource')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Fetch a resource and preview the mapping'))

    expect(await screen.findByText('Not mapped')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
        `${window.location.origin}/api/routes/route1/run/Immunization?_count=1`,
        expect.anything()
    )

    jest.restoreAllMocks()
})
