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
 * Known, deliberate limitation: for a CodeableConcept mapped onto an
 * OPTION_SET-typed data element, this writes the coding's display text
 * (or code, or free text) as-is -- it does NOT translate that into one of
 * the data element's own option codes. That translation is the
 * CodeableConcept-to-OPTION_SET code-mapping step from the design doc,
 * still unbuilt; until it exists, writing a coded field onto an
 * OPTION_SET data element may fail DHIS2's own validation, and that
 * failure is surfaced as a normal per-event error (see writeTrackerEvent.ts),
 * not silently swallowed.
 */
export function toDhisDataValue(rawValue: unknown): string | null {
  const formatted = formatFhirValue(rawValue)
  return formatted === '(no value)' ? null : formatted
}
