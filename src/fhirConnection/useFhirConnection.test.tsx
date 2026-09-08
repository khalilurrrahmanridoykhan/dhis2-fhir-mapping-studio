import { CustomDataProvider } from '@dhis2/app-runtime'
import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { useFhirConnection } from './useFhirConnection'

const RESOURCE = 'dataStore/fhirMappingStudio/connection'

class MockNotFoundError extends Error {
  details = { httpStatusCode: 404 }
}

function wrapper(data: Record<string, unknown>) {
  return ({ children }: { children: React.ReactNode }) => <CustomDataProvider data={data}>{children}</CustomDataProvider>
}

describe('useFhirConnection', () => {
  it('starts with no routeId selected when nothing has been saved yet', async () => {
    const { result } = renderHook(() => useFhirConnection(), {
      wrapper: wrapper({
        [RESOURCE]: async () => {
          throw new MockNotFoundError('not found')
        },
      }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.routeId).toBeNull()
    expect(result.current.loadError).toBeNull()
  })

  it('loads a previously saved routeId', async () => {
    const { result } = renderHook(() => useFhirConnection(), {
      wrapper: wrapper({ [RESOURCE]: { routeId: 'r1' } }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.routeId).toBe('r1')
  })

  it('setRouteId updates state immediately and persists it -- create when nothing existed yet', async () => {
    const calls: string[] = []
    const { result } = renderHook(() => useFhirConnection(), {
      wrapper: wrapper({
        [RESOURCE]: async (type: string) => {
          calls.push(type)
          if (type === 'read') throw new MockNotFoundError('not found')
          return null
        },
      }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setRouteId('r1')
    })

    expect(result.current.routeId).toBe('r1')
    expect(result.current.saveError).toBeNull()
    expect(calls).toEqual(['read', 'create'])
  })

  it('a second setRouteId call updates, not creates', async () => {
    const calls: string[] = []
    const { result } = renderHook(() => useFhirConnection(), {
      wrapper: wrapper({
        [RESOURCE]: async (type: string) => {
          calls.push(type)
          if (type === 'read') return { routeId: 'r1' }
          return null
        },
      }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setRouteId('r2')
    })

    expect(result.current.routeId).toBe('r2')
    expect(calls).toEqual(['read', 'replace'])
  })

  it('a failed save surfaces saveError without reverting the optimistic routeId', async () => {
    const { result } = renderHook(() => useFhirConnection(), {
      wrapper: wrapper({
        [RESOURCE]: async (type: string) => {
          if (type === 'read') throw new MockNotFoundError('not found')
          throw new Error('save failed')
        },
      }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setRouteId('r1')
    })

    expect(result.current.routeId).toBe('r1')
    expect(result.current.saveError?.message).toBe('save failed')
  })
})
