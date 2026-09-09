import type { DhisDataElement } from '../dhis2/types'
import { extractCodeableConcept } from '../fhir/extractCodeableConcept'
import type { CodeMapping } from '../mapping/MappingProfile'
import { toDhisDataValue } from './toDhisDataValue'

/**
 * The write-time counterpart to buildMappingPreview's codeMapping
 * detection -- resolves a raw FHIR value into what's actually written for
 * one data element, applying the profile's saved code translations for a
 * CodeableConcept-typed field mapped onto an OPTION_SET data element.
 *
 * For that specific combination (OPTION_SET + a real observed code):
 * - a saved translation exists -> writes the real DHIS2 option code, not
 *   display text.
 * - no translation exists yet -> returns null (omit), deliberately NOT
 *   toDhisDataValue's display-text fallback. Writing "Yellow fever
 *   vaccine" into an OPTION_SET data element expecting "YELLOW_FEVER"
 *   would just be rejected by DHIS2 anyway (a normal, visible error via
 *   writeTrackerEvent) -- omitting it here is more honest than sending a
 *   value already known not to match, and avoids depending on DHIS2's own
 *   validation message to explain what's actually wrong.
 *
 * Every other case (non-OPTION_SET data element, or a value that isn't
 * CodeableConcept-shaped) is unchanged from before this file existed --
 * falls straight through to toDhisDataValue.
 */
export function resolveDataValue(dataElement: DhisDataElement, rawValue: unknown, codeMappings: CodeMapping[] | undefined): string | null {
  if (dataElement.optionSet) {
    const codeableConcept = extractCodeableConcept(rawValue)
    const observedCode = codeableConcept?.coding?.[0]?.code
    if (observedCode) {
      return codeMappings?.find((c) => c.fhirCode === observedCode)?.dhisOptionCode ?? null
    }
  }

  return toDhisDataValue(rawValue)
}
