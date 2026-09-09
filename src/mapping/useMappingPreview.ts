import { useEffect, useState } from 'react'
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
 */
export function useMappingPreview(routeId: string | null, program: DhisTargetProgram | null, profile: MappingProfile | null) {
  const [rows, setRows] = useState<MappingPreviewRow[] | null>(null)
  const [resourceCount, setResourceCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // A preview fetched for a different program (or before this one's own
  // resource loaded) is meaningless once the target program changes --
  // its rows would show a stale program's data elements.
  useEffect(() => {
    setRows(null)
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
      setRows(resources.length > 0 ? buildMappingPreview(program, profile, resources[0]) : [])
    } catch (err) {
      setError(err as Error)
      setRows(null)
    } finally {
      setLoading(false)
    }
  }

  return { rows, resourceCount, loading, error, fetchPreview }
}
