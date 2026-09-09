import { useDataEngine } from '@dhis2/app-runtime'
import { useState } from 'react'
import type { DhisTargetProgram } from '../dhis2/types'
import type { MappingProfile } from '../mapping/MappingProfile'
import { buildTrackerEventPayload } from './buildTrackerEventPayload'
import { writeTrackerEvent, type WriteEventOutcome } from './writeTrackerEvent'

/**
 * The actual write action -- builds a Tracker event payload from exactly
 * the resource already shown in the preview (see useMappingPreview's own
 * `resource`) and submits it. Nothing here re-fetches from the FHIR
 * server; writing always operates on what was already previewed, per this
 * app's core "preview before write" discipline.
 */
export function useWriteMappedEvent(
  program: DhisTargetProgram | null,
  profile: MappingProfile | null,
  resource: Record<string, unknown> | null
) {
  const engine = useDataEngine()
  const [orgUnitId, setOrgUnitId] = useState<string | null>(null)
  const [writing, setWriting] = useState(false)
  const [outcome, setOutcome] = useState<WriteEventOutcome | null>(null)
  const [buildError, setBuildError] = useState<string | null>(null)

  const write = async (): Promise<void> => {
    if (!program || !profile || !resource || !orgUnitId) {
      return
    }
    setWriting(true)
    setOutcome(null)
    setBuildError(null)
    try {
      const payload = buildTrackerEventPayload(program, profile, resource, orgUnitId)
      if (!payload) {
        setBuildError(
          'This resource has no occurrenceDateTime, a required WHO SG IG field -- cannot record when the event happened.'
        )
        return
      }
      const result = await writeTrackerEvent(engine, payload)
      setOutcome(result)
    } finally {
      setWriting(false)
    }
  }

  return {
    orgUnitId,
    setOrgUnitId,
    writing,
    outcome,
    buildError,
    canWrite: Boolean(program && profile && resource && orgUnitId),
    write,
  }
}
