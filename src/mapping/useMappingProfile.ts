import { useDataEngine } from '@dhis2/app-runtime'
import { useEffect, useState } from 'react'
import { loadMappingProfile, saveMappingProfile } from '../dataStore/mappingProfileStore'
import type { DhisTargetProgram } from '../dhis2/types'
import { createEmptyMappingProfile, type MappingProfile } from './MappingProfile'

/**
 * Loads a program's saved Mapping Profile when one is picked (falling back
 * to an empty profile if nothing's been saved for it yet), and exposes a
 * save() action. `existedAlready` is tracked internally -- set from
 * whether loadMappingProfile found something, flipped to true after the
 * first successful save -- so callers never have to reason about
 * create-vs-update themselves; see mappingProfileStore.ts for why that
 * distinction has to be passed in explicitly at the storage layer.
 */
export function useMappingProfile(program: DhisTargetProgram | null) {
  const engine = useDataEngine()

  const [profile, setProfile] = useState<MappingProfile | null>(null)
  const [existedAlready, setExistedAlready] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<Error | null>(null)
  const [savedRecently, setSavedRecently] = useState(false)

  useEffect(() => {
    if (!program) {
      setProfile(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setSavedRecently(false)

    loadMappingProfile(engine, program.id)
      .then((loaded) => {
        if (cancelled) {
          return
        }
        if (loaded) {
          setProfile(loaded)
          setExistedAlready(true)
        } else {
          setProfile(createEmptyMappingProfile(program))
          setExistedAlready(false)
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setLoadError(error)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
    // engine is stable for the lifetime of the app (from useDataEngine); only
    // re-run this effect when the selected program actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id])

  const save = async (): Promise<void> => {
    if (!profile) {
      return
    }
    setSaving(true)
    setSaveError(null)
    setSavedRecently(false)
    try {
      await saveMappingProfile(engine, profile, existedAlready)
      setExistedAlready(true)
      setSavedRecently(true)
    } catch (error) {
      setSaveError(error as Error)
    } finally {
      setSaving(false)
    }
  }

  return { profile, setProfile, loading, loadError, saving, saveError, savedRecently, save }
}
