export interface FhirCoding {
  system?: string
  code?: string
  display?: string
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[]
  text?: string
}

function asCodeableConcept(obj: Record<string, unknown>): FhirCodeableConcept | null {
  // A Reference, not a concept -- even if it happens to also carry a display.
  if (typeof obj.reference === 'string') {
    return null
  }
  if (Array.isArray(obj.coding) && obj.coding.length > 0) {
    return obj as FhirCodeableConcept
  }
  // A text-only CodeableConcept (no coding array) is still a concept -- a
  // live smoke test found real FHIR servers routinely send vaccineCode as
  // just `{"text": "Influenza, seasonal"}`. An IG-conformant resource
  // shouldn't, but the app shouldn't fall over (or silently write raw
  // text into an OPTION_SET) when a source isn't fully conformant.
  if (typeof obj.text === 'string' && obj.text.length > 0) {
    return obj as FhirCodeableConcept
  }
  return null
}

/**
 * Detects whether a raw value read off a FHIR resource (via
 * readImmunizationField) is CodeableConcept-shaped, and unwraps it to that
 * shape -- handling both forms readImmunizationField can return: a direct
 * CodeableConcept (e.g. vaccineCode itself), or an extension wrapper
 * around one (e.g. an ig-extension field's
 * `{url, valueCodeableConcept: {...}}`). Returns null for anything else
 * (a plain string, a Reference, a boolean, ...).
 *
 * This is what makes the code-mapping step possible: it lets the app
 * recognize, from a resource it just actually fetched, which mapped
 * fields carry codes (or a text label) that need translating to a DHIS2
 * option -- driven by what a real fetched resource contains, not a
 * hardcoded per-field type table.
 */
export function extractCodeableConcept(rawValue: unknown): FhirCodeableConcept | null {
  if (!rawValue || typeof rawValue !== 'object') {
    return null
  }
  const obj = rawValue as Record<string, unknown>

  if (typeof obj.url === 'string' && obj.valueCodeableConcept && typeof obj.valueCodeableConcept === 'object') {
    return asCodeableConcept(obj.valueCodeableConcept as Record<string, unknown>)
  }

  return asCodeableConcept(obj)
}

/**
 * The single value that identifies which option an observed concept maps
 * to -- the first coding's code when there is one, else the concept's own
 * free text. Callers use this as the key for a saved code translation, so
 * detection (buildMappingPreview) and application (resolveDataValue) agree
 * on it.
 */
export function observedConceptKey(concept: FhirCodeableConcept): string | undefined {
  return concept.coding?.[0]?.code ?? (concept.text || undefined)
}
