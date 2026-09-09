export interface FhirCoding {
  system?: string
  code?: string
  display?: string
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[]
  text?: string
}

/**
 * Detects whether a raw value read off a FHIR resource (via
 * readImmunizationField) is CodeableConcept-shaped, and unwraps it to that
 * shape either way -- handling both forms readImmunizationField can
 * return: a direct CodeableConcept (e.g. vaccineCode itself), or an
 * extension wrapper around one (e.g. an ig-extension field's
 * `{url, valueCodeableConcept: {...}}`). Returns null for anything else
 * (a plain string, a Reference, a boolean, ...).
 *
 * This is what makes the code-mapping step possible: it lets the app
 * recognize, from a resource it just actually fetched, which mapped
 * fields carry codes that need translating to a DHIS2 option -- driven by
 * what a real fetched resource contains, not a hardcoded per-field type
 * table.
 */
export function extractCodeableConcept(rawValue: unknown): FhirCodeableConcept | null {
  if (!rawValue || typeof rawValue !== 'object') {
    return null
  }
  const obj = rawValue as Record<string, unknown>

  if (Array.isArray(obj.coding)) {
    return obj as FhirCodeableConcept
  }

  if (typeof obj.url === 'string' && obj.valueCodeableConcept && typeof obj.valueCodeableConcept === 'object') {
    return obj.valueCodeableConcept as FhirCodeableConcept
  }

  return null
}
