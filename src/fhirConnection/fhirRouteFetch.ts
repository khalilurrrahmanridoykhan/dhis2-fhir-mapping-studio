/**
 * Runs a request through a DHIS2 Route (/api/routes/{id}/run/{subPath}) --
 * the only way this app talks to a FHIR server, per its core architectural
 * constraint (no separate backend; see the design doc). Ported from the
 * same fetch mechanism already proven live in the dhis2-fhir-sync-console
 * sibling app, including a real bug that hook caught and this one
 * inherits the fix for:
 *
 * Deliberately NOT using @dhis2/app-runtime's engine.query() here -- a
 * real bug found live (not a spec-reading guess): a FHIR server responds
 * with `Content-Type: application/fhir+json` (correct per the FHIR spec),
 * but @dhis2/data-engine's fetchData() only calls response.json() when the
 * content type is EXACTLY `application/json` (strict equality, not a
 * prefix/suffix check) -- anything else, including `application/fhir+json`,
 * falls through to response.blob(), so engine.query() silently hands back
 * an unparsed Blob instead of the FHIR Bundle. Fixed by calling fetch()
 * directly against this same-origin DHIS2 API (every DHIS2 App is always
 * served same-origin with its own instance) and always parsing the body as
 * JSON ourselves, regardless of the declared content type.
 */

export interface FhirBundleEntry {
  fullUrl?: string
  resource?: Record<string, unknown>
}

export interface FhirBundleLink {
  relation: string
  url: string
}

export interface FhirBundle {
  resourceType: 'Bundle'
  type?: string
  total?: number
  entry?: FhirBundleEntry[]
  link?: FhirBundleLink[]
}

function routeRunUrl(routeId: string, subPath: string, params: Record<string, string>): string {
  const path = subPath ? `/api/routes/${routeId}/run/${subPath}` : `/api/routes/${routeId}/run`
  const query = new URLSearchParams(params).toString()
  return `${window.location.origin}${path}${query ? `?${query}` : ''}`
}

export async function runFhirRoute(routeId: string, subPath: string, params: Record<string, string>): Promise<FhirBundle> {
  const response = await fetch(routeRunUrl(routeId, subPath, params), {
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
  if (!response.ok) {
    throw new Error(`FHIR route request failed: ${response.status} ${response.statusText}`)
  }
  // Deliberately not gated on Content-Type -- see header comment.
  return (await response.json()) as FhirBundle
}

/**
 * A single, unpaginated fetch of up to `count` Immunization resources --
 * enough for a mapping preview, which only needs to show what a real
 * fetched resource looks like once a Mapping Profile is applied to it, not
 * walk an entire result set. Full multi-page sync is a separate, later
 * concern (see the design doc) and can build on runFhirRoute() directly
 * when it's needed, reusing this same route-running primitive.
 */
export async function fetchImmunizationPreview(routeId: string, count: number): Promise<Record<string, unknown>[]> {
  const bundle = await runFhirRoute(routeId, 'Immunization', { _count: String(count) })
  return (bundle.entry ?? []).map((entry) => entry.resource).filter((resource): resource is Record<string, unknown> => Boolean(resource))
}
