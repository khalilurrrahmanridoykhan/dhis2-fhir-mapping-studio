/**
 * The Mapping Profile itself -- what an admin actually authors: which of
 * this DHIS2 instance's own data elements (on the program they picked)
 * corresponds to which fixed field from the WHO SG Immunization IG.
 *
 * Deliberately a pure data module, no React, no DHIS2 API calls -- same
 * "stay pure and trivially unit-testable" discipline as every other app in
 * this family's own compliance/summary logic. Persistence (dataStore save)
 * and the actual sync/preview pipeline are later pieces built on top of
 * this shape, not part of it.
 */
import type { ImmunizationIgField } from '../fhir/immunizationIgFields'
import type { DhisTargetProgram } from '../dhis2/types'

export interface CodeMapping {
  /** The FHIR code observed on a real fetched resource (e.g. "YF"). */
  fhirCode: string
  /** The DHIS2 option set's own code it corresponds to. */
  dhisOptionCode: string
}

export interface FieldMapping {
  dhisDataElementId: string
  /** Matches ImmunizationIgField.path exactly -- the join key between the two sides. */
  fhirFieldPath: string
  /**
   * Per-code translations for a CodeableConcept-typed field mapped onto an
   * OPTION_SET data element -- e.g. FHIR code "YF" maps to this instance's
   * own option code "YELLOW_FEVER". Absent (or missing an entry for a
   * given FHIR code) until an admin actually maps that code, since there's
   * no way to infer it automatically: the DHIS2 side's option codes are
   * exactly the per-deployment-variable half Johan's own framing said
   * defeats generic automatic mapping. Keyed by fhirCode alone, not
   * (system, code) -- a deliberate scope simplification, since every IG
   * field this app maps binds to a single canonical code system.
   */
  codeMappings?: CodeMapping[]
}

export interface MappingProfile {
  programId: string
  programStageId: string
  fieldMappings: FieldMapping[]
}

/** A program with no mappings authored yet -- the state right after picking a target program. */
export function createEmptyMappingProfile(program: DhisTargetProgram): MappingProfile {
  const stage = program.programStages[0]
  return {
    programId: program.id,
    programStageId: stage?.id ?? '',
    fieldMappings: [],
  }
}

export function setFieldMapping(profile: MappingProfile, dhisDataElementId: string, fhirFieldPath: string): MappingProfile {
  const withoutExisting = profile.fieldMappings.filter((m) => m.dhisDataElementId !== dhisDataElementId)
  return {
    ...profile,
    fieldMappings: [...withoutExisting, { dhisDataElementId, fhirFieldPath }],
  }
}

export function clearFieldMapping(profile: MappingProfile, dhisDataElementId: string): MappingProfile {
  return {
    ...profile,
    fieldMappings: profile.fieldMappings.filter((m) => m.dhisDataElementId !== dhisDataElementId),
  }
}

export function fhirFieldMappedTo(profile: MappingProfile, dhisDataElementId: string): string | null {
  return profile.fieldMappings.find((m) => m.dhisDataElementId === dhisDataElementId)?.fhirFieldPath ?? null
}

/**
 * Records (or replaces) how one observed FHIR code translates to a DHIS2
 * option code, for the field already mapped to this data element. A no-op
 * if that data element has no field mapping yet -- there's nothing to
 * attach a code translation to.
 */
export function setCodeMapping(
  profile: MappingProfile,
  dhisDataElementId: string,
  fhirCode: string,
  dhisOptionCode: string
): MappingProfile {
  const index = profile.fieldMappings.findIndex((m) => m.dhisDataElementId === dhisDataElementId)
  if (index === -1) {
    return profile
  }
  const existing = profile.fieldMappings[index]
  const withoutThisCode = (existing.codeMappings ?? []).filter((c) => c.fhirCode !== fhirCode)
  const updated: FieldMapping = {
    ...existing,
    codeMappings: [...withoutThisCode, { fhirCode, dhisOptionCode }],
  }
  const fieldMappings = [...profile.fieldMappings]
  fieldMappings[index] = updated
  return { ...profile, fieldMappings }
}

/** The DHIS2 option code a given data element's mapping translates one observed FHIR code to, if any. */
export function dhisOptionCodeFor(profile: MappingProfile, dhisDataElementId: string, fhirCode: string): string | null {
  const mapping = profile.fieldMappings.find((m) => m.dhisDataElementId === dhisDataElementId)
  return mapping?.codeMappings?.find((c) => c.fhirCode === fhirCode)?.dhisOptionCode ?? null
}

/**
 * Every IG field marked required (per immunizationIgFields.ts, itself
 * verified against the real spec) needs to be mapped from *some* DHIS2
 * data element before this profile is usable -- not every DHIS2 data
 * element needs a mapping, since an instance's program may legitimately
 * hold fields this IG doesn't care about.
 */
export function missingRequiredFieldMappings(
  profile: MappingProfile,
  requiredFields: ImmunizationIgField[]
): ImmunizationIgField[] {
  const mappedPaths = new Set(profile.fieldMappings.map((m) => m.fhirFieldPath))
  return requiredFields.filter((field) => !mappedPaths.has(field.path))
}

export function isMappingComplete(profile: MappingProfile, requiredFields: ImmunizationIgField[]): boolean {
  return missingRequiredFieldMappings(profile, requiredFields).length === 0
}
