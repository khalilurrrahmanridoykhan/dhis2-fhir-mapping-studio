import type { DhisTargetProgram } from '../dhis2/types'
import { immunizationIgFields } from '../fhir/immunizationIgFields'
import { formatFhirValue } from '../fhir/formatFhirValue'
import { readImmunizationField } from '../fhir/readImmunizationField'
import { fhirFieldMappedTo, type MappingProfile } from './MappingProfile'

export interface MappingPreviewRow {
  dhisDataElementId: string
  dhisDataElementName: string
  fhirFieldPath: string | null
  fhirFieldLabel: string | null
  displayValue: string
}

/**
 * The actual "does this mapping do what I think it does" check -- for
 * every data element on the mapped program's stage, reads the real value a
 * just-fetched FHIR resource carries for whichever IG field it's mapped
 * to, and formats it for display. This is preview only: nothing here
 * writes to DHIS2 or transforms the value into a DHIS2-ready payload
 * shape (e.g. a CodeableConcept into an OPTION_SET code) -- that's the
 * still-unbuilt code-mapping step from the design doc.
 *
 * One row per data element, in the order the program defines them --
 * including unmapped ones (fhirFieldPath/fhirFieldLabel null, displayValue
 * "Not mapped"), so the preview table lines up one-to-one with
 * MappingTable's own rows.
 */
export function buildMappingPreview(
  program: DhisTargetProgram,
  profile: MappingProfile,
  resource: Record<string, unknown>
): MappingPreviewRow[] {
  const dataElements = program.programStages[0]?.programStageDataElements.map((d) => d.dataElement) ?? []

  return dataElements.map((dataElement) => {
    const fhirFieldPath = fhirFieldMappedTo(profile, dataElement.id)
    if (!fhirFieldPath) {
      return {
        dhisDataElementId: dataElement.id,
        dhisDataElementName: dataElement.name,
        fhirFieldPath: null,
        fhirFieldLabel: null,
        displayValue: 'Not mapped',
      }
    }

    const field = immunizationIgFields.find((f) => f.path === fhirFieldPath)
    const rawValue = field ? readImmunizationField(resource, field) : undefined

    return {
      dhisDataElementId: dataElement.id,
      dhisDataElementName: dataElement.name,
      fhirFieldPath,
      fhirFieldLabel: field?.label ?? fhirFieldPath,
      displayValue: formatFhirValue(rawValue),
    }
  })
}
