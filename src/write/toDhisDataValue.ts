import { formatFhirValue } from '../fhir/formatFhirValue'

/**
 * Turns a raw value read off a FHIR resource into the plain string a
 * DHIS2 Tracker dataValue expects -- reusing formatFhirValue's own
 * CodeableConcept/Reference/extension handling rather than a second
 * implementation, with one difference that matters for writing (as
 * opposed to display): an absent value becomes null here, not the text
 * "(no value)", so callers can omit the dataValue entirely rather than
 * writing that string into DHIS2.
 *
 * This function only ever sees the OPTION_SET-to-code translation problem
 * secondhand: buildTrackerEventPayload calls resolveDataValue first,
 * which handles a CodeableConcept mapped onto an OPTION_SET data element
 * itself (writing the admin's saved translation, or omitting the value if
 * none exists yet -- see resolveDataValue.ts) and only falls through to
 * this function for every other case: a non-OPTION_SET data element, or a
 * value that isn't CodeableConcept-shaped at all.
 */
export function toDhisDataValue(rawValue: unknown): string | null {
  const formatted = formatFhirValue(rawValue)
  return formatted === '(no value)' ? null : formatted
}
