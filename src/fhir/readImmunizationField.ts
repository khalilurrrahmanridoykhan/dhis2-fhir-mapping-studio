import type { ImmunizationIgField } from './immunizationIgFields'

/**
 * Reads a value out of ANY FHIR Immunization-shaped resource for a given
 * WHO SG IG field -- the generic version of what sampleImmunizationBundle's
 * readSampleField() used to do only against the one hand-authored sample.
 * This is what the real preview pipeline needs: the same lookup, run
 * against a resource just fetched live through a connected Route.
 *
 * Intentionally simple (no JSONPath library) -- only needs to resolve the
 * finite, fixed set of paths in immunizationIgFields.ts, not arbitrary
 * FHIRPath expressions.
 */
export function readImmunizationField(resource: Record<string, unknown>, field: ImmunizationIgField): unknown {
  switch (field.path) {
    case 'status':
      return resource.status
    case 'vaccineCode':
      return resource.vaccineCode
    case 'patient':
      return resource.patient
    case 'occurrenceDateTime':
      return resource.occurrenceDateTime
    case 'statusReason':
      return resource.statusReason
    case 'protocolApplied':
      return resource.protocolApplied
    case 'protocolApplied.series':
      return (resource.protocolApplied as Array<{ series?: string }> | undefined)?.[0]?.series
    case 'protocolApplied.doseNumberString':
      return (resource.protocolApplied as Array<{ doseNumberString?: string }> | undefined)?.[0]?.doseNumberString
    default:
      if (field.origin === 'ig-extension' && field.extensionUrl) {
        const bag = field.path.startsWith('location.')
          ? ((resource.location as { extension?: Array<{ url: string }> } | undefined)?.extension ?? [])
          : field.path.startsWith('protocolApplied.')
            ? ((resource.protocolApplied as Array<{ extension?: Array<{ url: string }> }> | undefined)?.[0]?.extension ?? [])
            : ((resource.extension as Array<{ url: string }> | undefined) ?? [])
        return bag.find((e) => e.url === field.extensionUrl)
      }
      return undefined
  }
}
