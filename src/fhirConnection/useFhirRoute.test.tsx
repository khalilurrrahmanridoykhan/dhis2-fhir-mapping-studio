import { CustomDataProvider } from '@dhis2/app-runtime'
import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { useFhirRoute } from './useFhirRoute'
import type { CreateRouteInput } from './types'

function wrapper(data: Record<string, unknown>) {
  return ({ children }: { children: React.ReactNode }) => <CustomDataProvider data={data}>{children}</CustomDataProvider>
}

describe('useFhirRoute', () => {
  it('lists only wildcard routes, filtering out ones that cannot proxy an arbitrary FHIR sub-path', async () => {
    const { result } = renderHook(() => useFhirRoute(), {
      wrapper: wrapper({
        routes: {
          routes: [
            { id: 'r1', name: 'Clinic FHIR server', code: 'clinic', url: 'https://hapi.fhir.org/baseR4/**' },
            { id: 'r2', name: 'Unrelated fixed route', code: 'fixed', url: 'https://example.org/one-endpoint' },
          ],
        },
      }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.wildcardRoutes).toEqual([
      { id: 'r1', name: 'Clinic FHIR server', code: 'clinic', url: 'https://hapi.fhir.org/baseR4/**' },
    ])
  })

  it('surfaces a load error instead of throwing', async () => {
    const { result } = renderHook(() => useFhirRoute(), {
      wrapper: wrapper({
        routes: async () => {
          throw new Error('network exploded')
        },
      }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('network exploded')
    expect(result.current.wildcardRoutes).toEqual([])
  })

  it('createRoute appends the "/**" wildcard suffix, grants public read sharing, and refreshes the list', async () => {
    const calls: { resource: string; type: string; data: unknown }[] = []
    const { result } = renderHook(() => useFhirRoute(), {
      wrapper: wrapper({
        routes: async (type: string, query: { data?: unknown }) => {
          calls.push({ resource: 'routes', type, data: query?.data })
          if (type === 'create') {
            return { response: { uid: 'newRouteId' } }
          }
          return { routes: [{ id: 'newRouteId', name: 'Clinic FHIR server', code: 'clinic', url: 'https://hapi.fhir.org/baseR4/**' }] }
        },
        'sharing?type=route&id=newRouteId': async (type: string, query: { data?: unknown }) => {
          calls.push({ resource: 'sharing', type, data: query?.data })
          return null
        },
      }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    const input: CreateRouteInput = {
      name: 'Clinic FHIR server',
      code: 'clinic',
      baseUrl: 'https://hapi.fhir.org/baseR4',
      authType: 'none',
      responseTimeoutSeconds: 30,
    }

    let routeId = ''
    await act(async () => {
      routeId = await result.current.createRoute(input)
    })

    expect(routeId).toBe('newRouteId')
    const createCall = calls.find((c) => c.resource === 'routes' && c.type === 'create')
    expect(createCall?.data).toMatchObject({ url: 'https://hapi.fhir.org/baseR4/**', name: 'Clinic FHIR server' })
    expect((createCall?.data as Record<string, unknown>).auth).toBeUndefined()

    const sharingCall = calls.find((c) => c.resource === 'sharing')
    expect(sharingCall?.data).toMatchObject({ object: { publicAccess: 'r-------' } })

    await waitFor(() => expect(result.current.wildcardRoutes).toHaveLength(1))
  })

  it('includes an auth block when authType is not "none"', async () => {
    const calls: { resource: string; type: string; data: unknown }[] = []
    const { result } = renderHook(() => useFhirRoute(), {
      wrapper: wrapper({
        routes: async (type: string, query: { data?: unknown }) => {
          calls.push({ resource: 'routes', type, data: query?.data })
          if (type === 'create') {
            return { response: { uid: 'r2' } }
          }
          return { routes: [] }
        },
        'sharing?type=route&id=r2': async () => null,
      }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createRoute({
        name: 'Token-secured server',
        code: 'token_secured_server',
        baseUrl: 'https://fhir.example.org/r4',
        authType: 'api-headers',
        authConfig: { token: 'secret-token' },
        responseTimeoutSeconds: 30,
      })
    })

    const createCall = calls.find((c) => c.resource === 'routes' && c.type === 'create')
    expect(createCall?.data).toMatchObject({ auth: { type: 'api-headers', token: 'secret-token' } })
  })
})
