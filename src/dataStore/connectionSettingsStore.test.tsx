import { useDataEngine } from '@dhis2/app-runtime'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { loadConnectionSettings, saveConnectionSettings } from './connectionSettingsStore'
import { customDataWrapper as wrapper } from '../test-utils/customDataProvider'

const RESOURCE = 'dataStore/fhirMappingStudio/connection'

class MockNotFoundError extends Error {
  details = { httpStatusCode: 404 }
}

describe('loadConnectionSettings', () => {
  it('returns the saved settings when a connection has been configured', async () => {
    const { result } = renderHook(() => useDataEngine(), { wrapper: wrapper({ [RESOURCE]: { routeId: 'r1' } }) })
    const settings = await loadConnectionSettings(result.current)
    expect(settings).toEqual({ routeId: 'r1' })
  })

  it('returns null, not a thrown error, when no connection has been configured yet', async () => {
    const { result } = renderHook(() => useDataEngine(), {
      wrapper: wrapper({
        [RESOURCE]: async () => {
          throw new MockNotFoundError('not found')
        },
      }),
    })
    const settings = await loadConnectionSettings(result.current)
    expect(settings).toBeNull()
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
    await expect(loadConnectionSettings(result.current)).rejects.toThrow('server exploded')
  })
})

describe('saveConnectionSettings', () => {
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
    await saveConnectionSettings(result.current, { routeId: 'r1' }, false)
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
    await saveConnectionSettings(result.current, { routeId: 'r2' }, true)
    await waitFor(() => expect(calls).toHaveLength(1))
    // 'update' with no partial flag maps to fetch type 'replace' -- same
    // getMutationFetchType behavior mappingProfileStore.test.tsx confirms.
    expect(calls[0]).toMatchObject({ type: 'replace' })
  })
})
