import type { useDataEngine } from '@dhis2/app-runtime'
import type { TrackerEventPayload } from './buildTrackerEventPayload'

/**
 * Submits one already-built event payload to DHIS2's modern Tracker
 * import endpoint. `resource: 'tracker?async=false'` -- same call shape
 * already proven live in the sibling dhis2-fhir-sync-console app,
 * confirmed against play.dhis2.org (stable-2-43-1). `async=false` so the
 * import runs synchronously and this call's own response already carries
 * the real result, rather than needing a second poll for job status.
 */

type DataEngine = ReturnType<typeof useDataEngine>

interface TrackerImportResponse {
  status: 'OK' | 'ERROR' | 'WARNING'
  validationReport?: { errorReports?: { message: string }[] }
  bundleReport?: { typeReportMap?: { EVENT?: { objectReports?: { uid: string }[] } } }
}

export interface WriteEventOutcome {
  success: boolean
  eventId: string | null
  errorMessages: string[]
}

export async function writeTrackerEvent(engine: DataEngine, payload: TrackerEventPayload): Promise<WriteEventOutcome> {
  const response = (await engine.mutate({
    resource: 'tracker?async=false',
    type: 'create',
    data: payload as unknown as Record<string, unknown>,
  })) as unknown as TrackerImportResponse

  const eventId = response.bundleReport?.typeReportMap?.EVENT?.objectReports?.[0]?.uid ?? null
  const errorMessages = (response.validationReport?.errorReports ?? []).map((r) => r.message)

  return {
    success: response.status === 'OK' && eventId !== null,
    eventId,
    errorMessages,
  }
}
