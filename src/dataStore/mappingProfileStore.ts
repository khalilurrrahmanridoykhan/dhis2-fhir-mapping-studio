import type { useDataEngine } from '@dhis2/app-runtime'
import type { MappingProfile } from '../mapping/MappingProfile'

/**
 * Persists one Mapping Profile per DHIS2 program, under its own dataStore
 * key -- not one giant settings blob for the whole app, since the number
 * of mapped programs on a real instance could grow and there's no reason
 * to make every save rewrite every other program's profile too.
 *
 * Uses engine.query()/mutate() with the full dataStore path as a single
 * `resource` string -- not the raw engine.get()/post()/put(path) helpers,
 * which was the first version of this file. Switched after reading
 * @dhis2/data-engine's actual DataEngine.fetch() source: those helpers
 * regex-parse the path into {resource, id} in a way that splits
 * 'dataStore/ns/key' into resource='dataStore', id='ns/key' -- works
 * against a real server (confirmed live against play.im.dhis2.org before
 * writing the first version), but isn't reliably mockable with
 * CustomDataProvider for tests, and is a more fragile path than it needs
 * to be. The resource-based form matches how useTargetPrograms.ts already
 * queries elsewhere in this app, and RestAPILink.queryToResourcePath's own
 * joinPath() (also read directly, not assumed) confirms a full path as
 * one `resource` string with no `id` produces exactly the right URL.
 *
 * GET/POST/PUT semantics -- 404 on a key that doesn't exist yet, 201 to
 * create, 200 to update an existing key -- verified live against a fresh
 * namespace on play.im.dhis2.org/stable-2-43-1 before any of this was
 * written, same "POST on first-ever save, PUT thereafter" pattern every
 * sibling app in this family already uses.
 */
const NAMESPACE = 'fhirMappingStudio'

type DataEngine = ReturnType<typeof useDataEngine>

function pathFor(programId: string): string {
  return `dataStore/${NAMESPACE}/mappingProfile-${programId}`
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'details' in error &&
    (error as { details?: { httpStatusCode?: number } }).details?.httpStatusCode === 404
  )
}

/** Returns null (not an error) when this program has no saved profile yet. */
export async function loadMappingProfile(engine: DataEngine, programId: string): Promise<MappingProfile | null> {
  try {
    const result = await engine.query({ profile: { resource: pathFor(programId) } })
    return result.profile as MappingProfile
  } catch (error) {
    if (isNotFound(error)) {
      return null
    }
    throw error
  }
}

/**
 * `existedAlready` has to be passed in rather than re-derived here -- the
 * caller already knows it from the loadMappingProfile() call that ran when
 * the program was selected, and re-checking with another read here would
 * just be a redundant round trip for information already known.
 */
export async function saveMappingProfile(engine: DataEngine, profile: MappingProfile, existedAlready: boolean): Promise<void> {
  const resource = pathFor(profile.programId)
  if (existedAlready) {
    // type: 'update' requires an `id` field per the Mutation type, but the
    // full path is already in `resource` -- id: '' is filtered out by
    // joinPath() (confirmed in its own source: falsy parts are dropped),
    // so this produces the correct URL without a real id to supply.
    await engine.mutate({ resource, type: 'update', id: '', data: profile as unknown as Record<string, unknown> })
  } else {
    await engine.mutate({ resource, type: 'create', data: profile as unknown as Record<string, unknown> })
  }
}
