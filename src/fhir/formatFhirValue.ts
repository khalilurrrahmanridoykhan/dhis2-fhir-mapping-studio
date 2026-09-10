/**
 * Turns a raw value read off a FHIR resource (a CodeableConcept, a
 * Reference, an extension wrapper, a plain primitive, ...) into a short
 * human-readable string for the mapping preview table. This is display
 * formatting only -- what actually gets written to DHIS2 goes through
 * resolveDataValue (src/write/), which applies a saved code translation
 * for OPTION_SET fields rather than this function's display text.
 */
export function formatFhirValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '(no value)'
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? '(no value)' : value.map(formatFhirValue).join(', ')
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>

    // An extension wrapper -- format whichever value[x] it actually carries.
    if (typeof obj.url === 'string') {
      const valueKey = Object.keys(obj).find((key) => key.startsWith('value'))
      if (valueKey) {
        return formatFhirValue(obj[valueKey])
      }
    }

    // CodeableConcept: prefer a coding's display, then its code, then the
    // concept's own free-text, in that order -- display is the most
    // human-readable when present, code is still meaningful when it isn't.
    if (Array.isArray(obj.coding)) {
      const coding = (obj.coding as Array<{ display?: string; code?: string }>)[0]
      if (coding?.display) return coding.display
      if (coding?.code) return coding.code
    }
    if (typeof obj.text === 'string') {
      return obj.text
    }

    // Reference
    if (typeof obj.reference === 'string') {
      return obj.reference
    }

    return JSON.stringify(value)
  }

  return String(value)
}
