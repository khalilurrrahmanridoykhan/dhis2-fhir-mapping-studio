import type { useDataEngine } from '@dhis2/app-runtime'

/**
 * Persists which FHIR Route this instance is connected to -- a single
 * global setting, not per-program, since one DHIS2 instance ordinarily
 * talks to one FHIR source system regardless of how many programs get
 * mapped onto it. Same engine.query()/mutate() resource-as-full-path
 * approach as mappingProfileStore.ts, for the same reason (see that
 * file's own header comment on why the raw get/post/put helpers were
 * rejected) -- kept consistent rather than introducing a second pattern
 * for what is otherwise the same kind of read/write.
 */
const NAMESPACE = 'fhirMappingStudio'
const PATH = `dataStore/${NAMESPACE}/connection`

export interface ConnectionSettings {
  routeId: string | null
}

type DataEngine = ReturnType<typeof useDataEngine>

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'details' in error &&
    (error as { details?: { httpStatusCode?: number } }).details?.httpStatusCode === 404
  )
}

/** Returns null (not an error) when no connection has been configured yet. */
export async function loadConnectionSettings(engine: DataEngine): Promise<ConnectionSettings | null> {
  try {
    const result = await engine.query({ connection: { resource: PATH } })
    return result.connection as ConnectionSettings
  } catch (error) {
    if (isNotFound(error)) {
      return null
    }
    throw error
  }
}

export async function saveConnectionSettings(
  engine: DataEngine,
  settings: ConnectionSettings,
  existedAlready: boolean
): Promise<void> {
  if (existedAlready) {
    // id: '' satisfies the UpdateMutation type without affecting the URL
    // -- see mappingProfileStore.ts's saveMappingProfile for why.
    await engine.mutate({ resource: PATH, type: 'update', id: '', data: settings as unknown as Record<string, unknown> })
  } else {
    await engine.mutate({ resource: PATH, type: 'create', data: settings as unknown as Record<string, unknown> })
  }
}
