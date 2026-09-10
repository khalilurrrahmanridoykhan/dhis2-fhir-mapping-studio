import type { DhisOptionSet, DhisTargetProgram } from '../dhis2/types'
import { immunizationIgFields } from '../fhir/immunizationIgFields'
import { extractCodeableConcept, observedConceptKey } from '../fhir/extractCodeableConcept'
import { formatFhirValue } from '../fhir/formatFhirValue'
import { readImmunizationField } from '../fhir/readImmunizationField'
import { dhisOptionCodeFor, fhirFieldMappedTo, type MappingProfile } from './MappingProfile'

export interface MappingPreviewRowCodeMapping {
  optionSet: DhisOptionSet
  observedCode: string
  observedDisplay: string | null
  /** What this profile already translates observedCode to, if anything. */
  resolvedOptionCode: string | null
}

export interface MappingPreviewRow {
  dhisDataElementId: string
  dhisDataElementName: string
  fhirFieldPath: string | null
  fhirFieldLabel: string | null
  displayValue: string
  /**
   * Present only when this row's DHIS2 data element has an OPTION_SET and
   * the mapped field's raw value on this resource is CodeableConcept-shaped
   * with a real code -- the actual code-mapping opportunity for this row,
   * driven by what this specific fetched resource contains (see
   * extractCodeableConcept.ts's own header comment for why).
   */
  codeMapping: MappingPreviewRowCodeMapping | null
  /** DHIS2 rejects an event with no value for a compulsory data element (E1303). */
  compulsory: boolean
  /**
   * Whether this row actually produces a dataValue in the written event --
   * false for an unmapped element, a mapped element the resource has no
   * value for, or an OPTION_SET element whose observed code isn't mapped
   * to an option yet. Mirrors resolveDataValue's own outcome, so a
   * compulsory row with willBeWritten false is a write that WILL be
   * rejected.
   */
  willBeWritten: boolean
}

/**
 * The actual "does this mapping do what I think it does" check -- for
 * every data element on the mapped program's stage, reads the real value a
 * just-fetched FHIR resource carries for whichever IG field it's mapped
 * to, and formats it for display. This is preview only: nothing here
 * writes to DHIS2 or transforms the value into a DHIS2-ready payload
 * shape -- see resolveDataValue.ts in src/write/, which is what actually
 * applies a row's codeMapping at write time.
 *
 * Each row also flags whether it's a real code-mapping opportunity
 * (codeMapping, non-null only for a CodeableConcept-typed field mapped
 * onto an OPTION_SET data element) -- driven by what this specific
 * fetched resource actually contains, not a hardcoded per-field type
 * table (see extractCodeableConcept.ts).
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
  const stageDataElements = program.programStages[0]?.programStageDataElements ?? []

  return stageDataElements.map(({ dataElement, compulsory }) => {
    const fhirFieldPath = fhirFieldMappedTo(profile, dataElement.id)
    if (!fhirFieldPath) {
      return {
        dhisDataElementId: dataElement.id,
        dhisDataElementName: dataElement.name,
        fhirFieldPath: null,
        fhirFieldLabel: null,
        displayValue: 'Not mapped',
        codeMapping: null,
        compulsory: Boolean(compulsory),
        willBeWritten: false,
      }
    }

    const field = immunizationIgFields.find((f) => f.path === fhirFieldPath)
    const rawValue = field ? readImmunizationField(resource, field) : undefined
    const displayValue = formatFhirValue(rawValue)

    let codeMapping: MappingPreviewRowCodeMapping | null = null
    if (dataElement.optionSet) {
      const codeableConcept = extractCodeableConcept(rawValue)
      const observedCode = codeableConcept ? observedConceptKey(codeableConcept) : undefined
      if (observedCode) {
        codeMapping = {
          optionSet: dataElement.optionSet,
          observedCode,
          observedDisplay: codeableConcept?.coding?.[0]?.display ?? codeableConcept?.text ?? null,
          resolvedOptionCode: dhisOptionCodeFor(profile, dataElement.id, observedCode),
        }
      }
    }

    const willBeWritten = codeMapping ? codeMapping.resolvedOptionCode !== null : displayValue !== '(no value)'

    return {
      dhisDataElementId: dataElement.id,
      dhisDataElementName: dataElement.name,
      fhirFieldPath,
      fhirFieldLabel: field?.label ?? fhirFieldPath,
      displayValue,
      codeMapping,
      compulsory: Boolean(compulsory),
      willBeWritten,
    }
  })
}
