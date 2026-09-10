import { act, renderHook, waitFor } from '@testing-library/react'
import { useMappingPreview } from './useMappingPreview'
import { setFieldMapping, type MappingProfile } from './MappingProfile'
import type { DhisTargetProgram } from '../dhis2/types'
import { fetchImmunizationPreview } from '../fhirConnection/fhirRouteFetch'

// The route-fetching mechanics (real fetch(), URL shape, content-type
// handling) are already covered by fhirRouteFetch.test.ts -- this hook's
// own job is orchestration (when to fetch, how to turn the result into
// preview rows), so the network call itself is mocked here.
jest.mock('../fhirConnection/fhirRouteFetch')
const mockFetchImmunizationPreview = fetchImmunizationPreview as jest.MockedFunction<typeof fetchImmunizationPreview>

const program: DhisTargetProgram = {
  id: 'prog1',
  name: 'Immunization program',
  programStages: [
    {
      id: 'stage1',
      name: 'Immunization stage',
      programStageDataElements: [{ dataElement: { id: 'de-status', name: 'Vaccination status', valueType: 'TEXT' } }],
    },
  ],
}

const mappedProfile: MappingProfile = setFieldMapping(
  { programId: 'prog1', programStageId: 'stage1', fieldMappings: [] },
  'de-status',
  'status'
)

describe('useMappingPreview', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('starts with no rows fetched', () => {
    const { result } = renderHook(() => useMappingPreview('route1', program, mappedProfile))
    expect(result.current.rows).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('fetchPreview fetches one resource and builds preview rows from the real saved mapping', async () => {
    mockFetchImmunizationPreview.mockResolvedValue([{ resourceType: 'Immunization', id: 'i1', status: 'completed' }])
    const { result } = renderHook(() => useMappingPreview('route1', program, mappedProfile))

    await act(async () => {
      await result.current.fetchPreview()
    })

    expect(mockFetchImmunizationPreview).toHaveBeenCalledWith('route1', 1)
    expect(result.current.resourceCount).toBe(1)
    expect(result.current.rows).toEqual([
      {
        dhisDataElementId: 'de-status',
        dhisDataElementName: 'Vaccination status',
        fhirFieldPath: 'status',
        fhirFieldLabel: 'Status',
        displayValue: 'completed',
        codeMapping: null,
        compulsory: false,
        willBeWritten: true,
      },
    ])
    // Exposed so a later write step submits exactly what was previewed.
    expect(result.current.resource).toEqual({ resourceType: 'Immunization', id: 'i1', status: 'completed' })
  })

  it('an empty result sets rows to [] (distinct from null/"not fetched yet")', async () => {
    mockFetchImmunizationPreview.mockResolvedValue([])
    const { result } = renderHook(() => useMappingPreview('route1', program, mappedProfile))

    await act(async () => {
      await result.current.fetchPreview()
    })

    expect(result.current.rows).toEqual([])
    expect(result.current.resourceCount).toBe(0)
  })

  it('surfaces a fetch failure as error, leaving rows null', async () => {
    mockFetchImmunizationPreview.mockRejectedValue(new Error('route unreachable'))
    const { result } = renderHook(() => useMappingPreview('route1', program, mappedProfile))

    await act(async () => {
      await result.current.fetchPreview()
    })

    expect(result.current.error?.message).toBe('route unreachable')
    expect(result.current.rows).toBeNull()
  })

  it('does nothing when routeId, program, or profile is missing', async () => {
    const { result } = renderHook(() => useMappingPreview(null, program, mappedProfile))

    await act(async () => {
      await result.current.fetchPreview()
    })

    expect(mockFetchImmunizationPreview).not.toHaveBeenCalled()
  })

  it('clears a previous preview when the target program changes', async () => {
    mockFetchImmunizationPreview.mockResolvedValue([{ resourceType: 'Immunization', id: 'i1', status: 'completed' }])
    const { result, rerender } = renderHook(({ p }: { p: DhisTargetProgram }) => useMappingPreview('route1', p, mappedProfile), {
      initialProps: { p: program },
    })

    await act(async () => {
      await result.current.fetchPreview()
    })
    expect(result.current.rows).not.toBeNull()

    const otherProgram: DhisTargetProgram = { ...program, id: 'prog2' }
    rerender({ p: otherProgram })

    await waitFor(() => expect(result.current.rows).toBeNull())
  })
})
