export type FhirAuthType = 'none' | 'http-basic' | 'api-token' | 'api-headers'

export interface RouteSummary {
  id: string
  name: string
  code: string | null
  url: string
}

export interface CreateRouteInput {
  name: string
  code: string
  /** Base FHIR server URL, e.g. "https://hapi.fhir.org/baseR4" -- the
   * creating hook appends "/**" itself, since a wildcard route is required
   * to proxy a paginated FHIR API (arbitrary sub-paths and query strings). */
  baseUrl: string
  authType: FhirAuthType
  /** Shape depends on authType: http-basic -> {username, password};
   * api-token / api-headers -> {token}. Omitted for 'none'. */
  authConfig?: Record<string, unknown>
  responseTimeoutSeconds: number
}
