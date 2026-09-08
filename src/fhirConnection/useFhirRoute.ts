import { useDataEngine } from '@dhis2/app-runtime'
import { useCallback, useEffect, useState } from 'react'
import type { CreateRouteInput, RouteSummary } from './types'

/**
 * Lists existing wildcard Routes (GET /api/routes) and creates a new one --
 * the DHIS2-native way to reach a FHIR server without a separate backend
 * (this app's core architectural constraint; see the design doc). Every
 * outbound call to the FHIR server itself runs through the created Route,
 * never straight from the browser, so credentials never touch the client.
 *
 * This is a port of the same hook already proven live in the
 * dhis2-fhir-sync-console sibling app (confirmed against a real DHIS2
 * 2.42.5 instance), not a fresh guess -- including two real bugs that hook
 * caught and this one inherits the fix for:
 *
 * 1. A newly-created Route defaults to fully PRIVATE sharing
 *    (`"public": "--------"`) -- confirmed live by creating a route as one
 *    user and finding a second, properly-authorized user simply couldn't
 *    see it ("No routes found"). Fixed by granting public read access
 *    right after creation. Read-only, not read-write: a Route's `auth`
 *    config (credentials) is a write-only property DHIS2 never returns
 *    from a GET regardless of permissions, so granting read access doesn't
 *    expose secrets -- it only lets other users see the route exists and
 *    pick it.
 * 2. Only routes whose url ends in "/**" are usable here, since a
 *    non-wildcard route can't proxy an arbitrary FHIR sub-path (e.g.
 *    Immunization?_count=50&_lastUpdated=...). Filtered out at read time
 *    rather than shown and failing later.
 */

interface RoutesListResponse {
  routes: { routes: { id: string; name: string; code: string | null; url: string }[] }
}

interface CreateRouteResponse {
  response: { uid: string }
}

const ROUTE_SHARING_PAYLOAD = {
  object: { publicAccess: 'r-------', userGroupAccesses: [], userAccesses: [] },
}

export interface UseFhirRouteResult {
  loading: boolean
  error: string | null
  wildcardRoutes: RouteSummary[]
  refresh: () => Promise<void>
  createRoute: (input: CreateRouteInput) => Promise<string>
}

export function useFhirRoute(): UseFhirRouteResult {
  const engine = useDataEngine()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wildcardRoutes, setWildcardRoutes] = useState<RouteSummary[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = (await engine.query({
        routes: { resource: 'routes', params: { fields: 'id,name,code,url', paging: 'false' } },
      })) as unknown as RoutesListResponse
      const all = response.routes.routes ?? []
      setWildcardRoutes(all.filter((r) => r.url.endsWith('/**')))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [engine])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createRoute = useCallback(
    async (input: CreateRouteInput): Promise<string> => {
      const payload: Record<string, unknown> = {
        name: input.name,
        code: input.code,
        url: `${input.baseUrl.replace(/\/+$/, '')}/**`,
        responseTimeoutSeconds: input.responseTimeoutSeconds,
      }
      if (input.authType !== 'none') {
        payload.auth = { type: input.authType, ...input.authConfig }
      }
      const response = (await engine.mutate({
        resource: 'routes',
        type: 'create',
        data: payload,
      })) as unknown as CreateRouteResponse
      const routeId = response.response.uid
      await engine.mutate({
        resource: `sharing?type=route&id=${routeId}`,
        type: 'create',
        data: ROUTE_SHARING_PAYLOAD,
      })
      await refresh()
      return routeId
    },
    [engine, refresh]
  )

  return { loading, error, wildcardRoutes, refresh, createRoute }
}
