import type { DhisTargetProgram } from '../dhis2/types'
import { immunizationIgFields } from '../fhir/immunizationIgFields'
import { readImmunizationField } from '../fhir/readImmunizationField'
import type { MappingProfile } from '../mapping/MappingProfile'
import { resolveDataValue } from './resolveDataValue'

export interface TrackerEventPayload {
  events: {
    program: string
    programStage: string
    orgUnit: string
    occurredAt: string
    status: 'COMPLETED'
    dataValues: { dataElement: string; value: string }[]
  }[]
}

const OCCURRENCE_DATE_TIME_FIELD = immunizationIgFields.find((f) => f.path === 'occurrenceDateTime')!

/**
 * Builds the payload DHIS2's /api/tracker endpoint expects, from the
 * program/profile/resource this app already has plus an org unit the
 * admin just picked. Payload shape (program, programStage, orgUnit,
 * occurredAt, status, dataValues) is the same one already proven live in
 * the sibling dhis2-fhir-sync-console app -- confirmed against
 * play.dhis2.org (stable-2-43-1), not guessed here.
 *
 * The event's occurredAt comes from the resource's own occurrenceDateTime
 * -- a required WHO SG IG field -- read directly, independent of whether
 * it happens to also be mapped to a DHIS2 data element. Returns null
 * (rather than silently defaulting to "now") when the fetched resource
 * doesn't actually carry it: a real IG-conformant resource always will,
 * so a missing value here is itself a signal worth surfacing as an error,
 * not papering over.
 *
 * Only mapped fields produce a dataValue; unmapped data elements are
 * simply absent from the payload, and a mapped field with no resolvable
 * value on this particular resource (resolveDataValue returns null) is
 * likewise omitted rather than sent as an empty string -- including a
 * coded field mapped onto an OPTION_SET data element that has no saved
 * code translation yet (see resolveDataValue.ts's own header comment for
 * why that's omitted rather than sent as unusable display text).
 */
export function buildTrackerEventPayload(
  program: DhisTargetProgram,
  profile: MappingProfile,
  resource: Record<string, unknown>,
  orgUnitId: string
): TrackerEventPayload | null {
  const occurredAtRaw = readImmunizationField(resource, OCCURRENCE_DATE_TIME_FIELD)
  if (typeof occurredAtRaw !== 'string' || occurredAtRaw.length === 0) {
    return null
  }

  const dataElementsById = new Map(
    (program.programStages[0]?.programStageDataElements ?? []).map((d) => [d.dataElement.id, d.dataElement])
  )

  const dataValues: { dataElement: string; value: string }[] = []
  for (const mapping of profile.fieldMappings) {
    const field = immunizationIgFields.find((f) => f.path === mapping.fhirFieldPath)
    const dataElement = dataElementsById.get(mapping.dhisDataElementId)
    if (!field || !dataElement) continue
    const value = resolveDataValue(dataElement, readImmunizationField(resource, field), mapping.codeMappings)
    if (value !== null) {
      dataValues.push({ dataElement: mapping.dhisDataElementId, value })
    }
  }

  return {
    events: [
      {
        program: program.id,
        programStage: program.programStages[0]?.id ?? '',
        orgUnit: orgUnitId,
        occurredAt: occurredAtRaw,
        status: 'COMPLETED',
        dataValues,
      },
    ],
  }
}
