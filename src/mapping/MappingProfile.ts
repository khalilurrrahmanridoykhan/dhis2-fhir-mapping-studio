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

export interface FieldMapping {
  dhisDataElementId: string
  /** Matches ImmunizationIgField.path exactly -- the join key between the two sides. */
  fhirFieldPath: string
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
