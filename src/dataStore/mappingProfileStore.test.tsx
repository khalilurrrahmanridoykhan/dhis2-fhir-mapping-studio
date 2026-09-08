import { CustomDataProvider, useDataEngine } from '@dhis2/app-runtime'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { loadMappingProfile, saveMappingProfile } from './mappingProfileStore'
import type { MappingProfile } from '../mapping/MappingProfile'

const PROGRAM_ID = 'prog1'
const RESOURCE = `dataStore/fhirMappingStudio/mappingProfile-${PROGRAM_ID}`

const sampleProfile: MappingProfile = {
  programId: PROGRAM_ID,
  programStageId: 'stage1',
  fieldMappings: [{ dhisDataElementId: 'de1', fhirFieldPath: 'vaccineCode' }],
}

// Mimics a real FetchError shape (details.httpStatusCode) -- confirmed
// from @dhis2/data-engine's own FetchError type -- so isNotFound()'s check
// is exercised the same way a real 404 response would trigger it.
class MockNotFoundError extends Error {
  details = { httpStatusCode: 404 }
}

function wrapper(data: Record<string, unknown>) {
  return ({ children }: { children: React.ReactNode }) => <CustomDataProvider data={data}>{children}</CustomDataProvider>
}

describe('loadMappingProfile', () => {
  it('returns the saved profile when one exists', async () => {
    const { result } = renderHook(() => useDataEngine(), { wrapper: wrapper({ [RESOURCE]: sampleProfile }) })
    const profile = await loadMappingProfile(result.current, PROGRAM_ID)
    expect(profile).toEqual(sampleProfile)
  })

  it('returns null, not a thrown error, when no profile has been saved yet', async () => {
    const { result } = renderHook(() => useDataEngine(), {
      wrapper: wrapper({
        [RESOURCE]: async () => {
          throw new MockNotFoundError('not found')
        },
      }),
    })
    const profile = await loadMappingProfile(result.current, PROGRAM_ID)
    expect(profile).toBeNull()
  })

  it('re-throws a real error that is not a 404', async () => {
    const { result } = renderHook(() => useDataEngine(), {
      wrapper: wrapper({
        [RESOURCE]: async () => {
          const err = new Error('server exploded') as Error & { details: { httpStatusCode: number } }
          err.details = { httpStatusCode: 500 }
          throw err
        },
      }),
    })
    await expect(loadMappingProfile(result.current, PROGRAM_ID)).rejects.toThrow('server exploded')
  })
})

describe('saveMappingProfile', () => {
  it('calls a create-type mutation when existedAlready is false', async () => {
    const calls: unknown[] = []
    const { result } = renderHook(() => useDataEngine(), {
      wrapper: wrapper({
        [RESOURCE]: async (type: string, query: unknown) => {
          calls.push({ type, query })
          return null
        },
      }),
    })
    await saveMappingProfile(result.current, sampleProfile, false)
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toMatchObject({ type: 'create' })
  })

  it('calls an update-type mutation when existedAlready is true', async () => {
    const calls: unknown[] = []
    const { result } = renderHook(() => useDataEngine(), {
      wrapper: wrapper({
        [RESOURCE]: async (type: string, query: unknown) => {
          calls.push({ type, query })
          return null
        },
      }),
    })
    await saveMappingProfile(result.current, sampleProfile, true)
    await waitFor(() => expect(calls).toHaveLength(1))
    // 'update' with no partial flag maps to fetch type 'replace' -- see
    // getMutationFetchType.ts, read directly rather than assumed.
    expect(calls[0]).toMatchObject({ type: 'replace' })
  })
})
