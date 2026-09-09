import { useEffect, useMemo, useState } from 'react'
import type { DhisTargetProgram } from '../dhis2/types'
import { fetchImmunizationPreview } from '../fhirConnection/fhirRouteFetch'
import { buildMappingPreview, type MappingPreviewRow } from './buildMappingPreview'
import type { MappingProfile } from './MappingProfile'

/**
 * Fetches one real Immunization resource through the connected Route and
 * applies the saved Mapping Profile to it -- an explicit action (fetchPreview),
 * not automatic, since it makes a real outbound call to the FHIR server
 * every time and there's no reason to fire that on every keystroke while a
 * mapping is being edited.
 *
 * `rows` is derived (useMemo), not stored as its own state set only at
 * fetch time -- it has to react to the profile changing too, not just to
 * a new fetch. Found by a real failing test, not spotted by inspection:
 * picking a code-mapping translation in Step 4 updates the profile, and
 * the preview table needs to show that translation immediately, without
 * requiring a second live fetch just to re-render what's already been
 * fetched.
 */
export function useMappingPreview(routeId: string | null, program: DhisTargetProgram | null, profile: MappingProfile | null) {
  // The raw resource the derived rows below are built from -- exposed so a
  // later write step (see src/write/) submits exactly what was already
  // shown in the preview, not a second, independently fetched resource
  // that could differ from it.
  const [resource, setResource] = useState<Record<string, unknown> | null>(null)
  // Distinguishes "never fetched yet" (rows should read null) from "fetched,
  // but the FHIR server returned zero resources" (rows should read []) --
  // both leave `resource` at null, so resource alone can't tell them apart.
  const [hasFetchedResult, setHasFetchedResult] = useState(false)
  const [resourceCount, setResourceCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // A preview fetched for a different program (or before this one's own
  // resource loaded) is meaningless once the target program changes --
  // its rows would show a stale program's data elements.
  useEffect(() => {
    setResource(null)
    setHasFetchedResult(false)
    setError(null)
  }, [program?.id])

  const fetchPreview = async (): Promise<void> => {
    if (!routeId || !program || !profile) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const resources = await fetchImmunizationPreview(routeId, 1)
      setResourceCount(resources.length)
      setResource(resources.length > 0 ? resources[0] : null)
      setHasFetchedResult(true)
    } catch (err) {
      setError(err as Error)
      setResource(null)
      setHasFetchedResult(false)
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo<MappingPreviewRow[] | null>(() => {
    if (!hasFetchedResult) {
      return null
    }
    if (!program || !profile || !resource) {
      return []
    }
    return buildMappingPreview(program, profile, resource)
  }, [hasFetchedResult, program, profile, resource])

  return { rows, resource, resourceCount, loading, error, fetchPreview }
}
