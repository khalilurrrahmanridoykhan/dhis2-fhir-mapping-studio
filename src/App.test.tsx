import { CustomDataProvider } from '@dhis2/app-runtime'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

it('Step 4 asks to connect a FHIR server first, and hides the fetch action, when no route is picked yet', async () => {
    render(
        <CustomDataProvider data={mockProgramsData}>
            <App />
        </CustomDataProvider>
    )

    fireEvent.click(await screen.findByText('Select a target program'))
    fireEvent.click(await screen.findByText('Immunization program'))

    expect(await screen.findByText('Connect a FHIR server in Step 1 to preview this mapping')).toBeInTheDocument()
    // The step heading still shows, but the preview action does not.
    expect(screen.queryByText('Fetch a resource and preview the mapping')).not.toBeInTheDocument()
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

it('Step 4 lets an admin map an observed FHIR code to a DHIS2 option, and Step 5 writes the real option code', async () => {
    const vaccineOptionSetProgramsData = {
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
                            programStageDataElements: [
                                {
                                    dataElement: {
                                        id: 'de1',
                                        name: 'Vaccine given',
                                        valueType: 'OPTION_SET',
                                        optionSet: { id: 'os1', name: 'Vaccines', options: [{ code: 'YELLOW_FEVER', name: 'Yellow fever' }] },
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        // Already mapped, so Step 4's preview has something to translate --
        // this test is about the code-mapping step itself, not authoring
        // the field mapping (already covered by other tests above).
        'dataStore/fhirMappingStudio/mappingProfile-prog1': {
            programId: 'prog1',
            programStageId: 'stage1',
            fieldMappings: [{ dhisDataElementId: 'de1', fhirFieldPath: 'vaccineCode' }],
        },
        routes: { routes: [{ id: 'route1', name: 'Clinic FHIR server', code: 'clinic', url: 'https://hapi.fhir.org/baseR4/**' }] },
        'dataStore/fhirMappingStudio/connection': { routeId: 'route1' },
        organisationUnits: (_type: string, query: { id?: string }) => {
            if (query.id) {
                return Promise.resolve({ id: query.id, displayName: 'National level', path: `/${query.id}`, children: [] })
            }
            return Promise.resolve({ organisationUnits: [{ id: 'orgUnit1' }] })
        },
    }
    const trackerCalls: unknown[] = []
    const trackerMock = async (type: string, query: { data?: unknown }) => {
        trackerCalls.push({ type, data: query?.data })
        return { status: 'OK', bundleReport: { typeReportMap: { EVENT: { objectReports: [{ uid: 'newEvent1' }] } } } }
    }

    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
            resourceType: 'Bundle',
            entry: [
                {
                    resource: {
                        resourceType: 'Immunization',
                        id: 'i1',
                        status: 'completed',
                        occurrenceDateTime: '2026-06-30T09:00:00+00:00',
                        vaccineCode: { coding: [{ code: 'YF', display: 'Yellow fever vaccine' }] },
                    },
                },
            ],
        }),
    }) as unknown as typeof fetch

    render(
        <CustomDataProvider data={{ ...vaccineOptionSetProgramsData, 'tracker?async=false': trackerMock }}>
            <App />
        </CustomDataProvider>
    )

    fireEvent.click(await screen.findByText('Select a target program'))
    fireEvent.click(await screen.findByText('Immunization program'))
    await screen.findByText('Step 4: preview against a real fetched resource')

    fireEvent.click(screen.getByText('Fetch a resource and preview the mapping'))

    // The code-mapping picker appears, unmapped, for the observed code.
    expect(await screen.findByText('Map code "YF" to...')).toBeInTheDocument()
    expect(screen.getByText('Not yet mapped -- omitted from what gets written')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Map code "YF" to...'))
    fireEvent.click(await screen.findByText('Yellow fever'))

    // The warning clears once a translation is picked.
    await waitFor(() => expect(screen.queryByText('Not yet mapped -- omitted from what gets written')).not.toBeInTheDocument())

    fireEvent.click(await screen.findByText('National level'))
    fireEvent.click(screen.getByText('Write this event to DHIS2'))

    expect(await screen.findByText('Event written')).toBeInTheDocument()
    expect(trackerCalls).toEqual([
        {
            type: 'create',
            data: {
                events: [
                    {
                        program: 'prog1',
                        programStage: 'stage1',
                        orgUnit: 'orgUnit1',
                        occurredAt: '2026-06-30T09:00:00+00:00',
                        status: 'COMPLETED',
                        // The real DHIS2 option code -- not "Yellow fever vaccine" display text.
                        dataValues: [{ dataElement: 'de1', value: 'YELLOW_FEVER' }],
                    },
                ],
            },
        },
    ])

    jest.restoreAllMocks()
})

it('Step 5 appears only once a preview has been fetched, then writes exactly that resource to DHIS2', async () => {
    const trackerCalls: unknown[] = []
    const data = {
        ...mockProgramsData,
        routes: { routes: [{ id: 'route1', name: 'Clinic FHIR server', code: 'clinic', url: 'https://hapi.fhir.org/baseR4/**' }] },
        'dataStore/fhirMappingStudio/connection': { routeId: 'route1' },
        organisationUnits: (_type: string, query: { id?: string }) => {
            if (query.id) {
                return Promise.resolve({ id: query.id, displayName: 'National level', path: `/${query.id}`, children: [] })
            }
            return Promise.resolve({ organisationUnits: [{ id: 'orgUnit1' }] })
        },
        'tracker?async=false': async (type: string, query: { data?: unknown }) => {
            trackerCalls.push({ type, data: query?.data })
            return { status: 'OK', bundleReport: { typeReportMap: { EVENT: { objectReports: [{ uid: 'newEvent1' }] } } } }
        },
    }

    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
            resourceType: 'Bundle',
            entry: [{ resource: { resourceType: 'Immunization', id: 'i1', status: 'completed', occurrenceDateTime: '2026-06-30T09:00:00+00:00' } }],
        }),
    }) as unknown as typeof fetch

    render(
        <CustomDataProvider data={data}>
            <App />
        </CustomDataProvider>
    )

    fireEvent.click(await screen.findByText('Select a target program'))
    fireEvent.click(await screen.findByText('Immunization program'))
    expect(screen.queryByText('Step 5: write this event to DHIS2')).not.toBeInTheDocument()

    await screen.findByText('Step 4: preview against a real fetched resource')
    fireEvent.click(screen.getByText('Fetch a resource and preview the mapping'))
    await screen.findByText('Not mapped')

    expect(await screen.findByText('Step 5: write this event to DHIS2')).toBeInTheDocument()

    fireEvent.click(await screen.findByText('National level'))
    fireEvent.click(screen.getByText('Write this event to DHIS2'))

    expect(await screen.findByText('Event written')).toBeInTheDocument()
    expect(screen.getByText(/newEvent1/)).toBeInTheDocument()
    expect(trackerCalls).toEqual([
        {
            type: 'create',
            data: {
                events: [
                    {
                        program: 'prog1',
                        programStage: 'stage1',
                        orgUnit: 'orgUnit1',
                        occurredAt: '2026-06-30T09:00:00+00:00',
                        status: 'COMPLETED',
                        dataValues: [],
                    },
                ],
            },
        },
    ])

    jest.restoreAllMocks()
})
