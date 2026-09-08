import { useDataEngine } from '@dhis2/app-runtime'
import { useEffect, useState } from 'react'
import { loadConnectionSettings, saveConnectionSettings } from '../dataStore/connectionSettingsStore'

/**
 * Loads the persisted FHIR Route connection on mount, and persists a new
 * selection as soon as it's made. Auto-save rather than an explicit Save
 * button, deliberately unlike the mapping table's own save flow -- picking
 * a route is a single, atomic choice (much like picking a program in Step
 * 1's ProgramPicker, which also has no separate save step), not iterative
 * editing that benefits from a distinct "commit this" action.
 */
export function useFhirConnection() {
  const engine = useDataEngine()

  const [routeId, setRouteIdState] = useState<string | null>(null)
  const [existedAlready, setExistedAlready] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    loadConnectionSettings(engine)
      .then((loaded) => {
        if (cancelled) return
        if (loaded) {
          setRouteIdState(loaded.routeId)
          setExistedAlready(true)
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // engine is stable for the lifetime of the app (from useDataEngine) --
    // this only needs to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setRouteId = async (id: string): Promise<void> => {
    setRouteIdState(id)
    setSaving(true)
    setSaveError(null)
    try {
      await saveConnectionSettings(engine, { routeId: id }, existedAlready)
      setExistedAlready(true)
    } catch (error) {
      setSaveError(error as Error)
    } finally {
      setSaving(false)
    }
  }

  return { routeId, setRouteId, loading, loadError, saving, saveError }
}
