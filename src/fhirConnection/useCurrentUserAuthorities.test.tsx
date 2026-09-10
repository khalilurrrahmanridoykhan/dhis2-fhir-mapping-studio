import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { useCurrentUserAuthorities } from './useCurrentUserAuthorities'
import { customDataWrapper as wrapper } from '../test-utils/customDataProvider'

describe('useCurrentUserAuthorities', () => {
  it('grants canCreateRoutes for a superuser (ALL)', async () => {
    const { result } = renderHook(() => useCurrentUserAuthorities(), {
      wrapper: wrapper({ me: { username: 'admin', authorities: ['ALL'] } }),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canCreateRoutes).toBe(true)
    expect(result.current.username).toBe('admin')
  })

  it('grants canCreateRoutes for the real F_ROUTE_PUBLIC_ADD authority', async () => {
    const { result } = renderHook(() => useCurrentUserAuthorities(), {
      wrapper: wrapper({ me: { username: 'route_admin', authorities: ['F_ROUTE_PUBLIC_ADD'] } }),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canCreateRoutes).toBe(true)
  })

  it('grants canCreateRoutes for the real F_ROUTE_PRIVATE_ADD authority', async () => {
    const { result } = renderHook(() => useCurrentUserAuthorities(), {
      wrapper: wrapper({ me: { username: 'route_admin', authorities: ['F_ROUTE_PRIVATE_ADD'] } }),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canCreateRoutes).toBe(true)
  })

  it('denies canCreateRoutes for a user without any real route authority', async () => {
    const { result } = renderHook(() => useCurrentUserAuthorities(), {
      wrapper: wrapper({ me: { username: 'viewer', authorities: ['F_PROGRAM_PUBLIC_ADD'] } }),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canCreateRoutes).toBe(false)
  })

  // Regression guard: an earlier version of this check (in the sibling
  // dhis2-fhir-sync-console app) tested for a literal authority string
  // 'Route', which is not a real DHIS2 authority and always evaluated
  // false even for a user granted the real authorities above it was meant
  // to detect.
  it('does not treat the literal string "Route" as a real authority', async () => {
    const { result } = renderHook(() => useCurrentUserAuthorities(), {
      wrapper: wrapper({ me: { username: 'viewer', authorities: ['Route'] } }),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canCreateRoutes).toBe(false)
  })
})
