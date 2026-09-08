/**
 * A hand-authored sample Immunization resource intended to satisfy the WHO
 * SG Immunization IG's IMMZ.Immunization profile -- used to develop and
 * test the DHIS2-side mapping-authoring UI without depending on a live FHIR
 * source, since the live source already checked this session (OpenMRS,
 * dev3.openmrs.org) is confirmed NOT yet conformant to this profile (see
 * the design doc's live-verification section: missing vaccineBrand,
 * marketAuthorizationHolder, and countryOfVaccination entirely).
 *
 * Honesty about what this is and isn't: every field below fills a real slot
 * from immunizationIgFields.ts, and the three IG-specific CodeableConcept
 * extensions (vaccineBrand, marketAuthorizationHolder, countryOfVaccination)
 * use their real, individually-confirmed value type and binding strength --
 * fetched directly from each extension's own StructureDefinition, not
 * guessed. What this has NOT been checked against: a real FHIR $validate
 * operation. Treat this as "structurally complete for UI development,"
 * not "proven IG-conformant" -- that would need running it through an
 * actual validator (e.g. a Matchbox instance, or the IG's own CI) before
 * relying on it for anything beyond building/testing this app's own UI.
 */
import type { ImmunizationIgField } from './immunizationIgFields'

export const sampleImmunizationResource = {
  resourceType: 'Immunization',
  id: 'sample-immz-conformant-01',
  meta: {
    profile: ['http://smart.who.int/immunizations/StructureDefinition/IMMZ.Immunization'],
  },
  status: 'completed',
  vaccineCode: {
    coding: [{ system: 'http://smart.who.int/immunizations/CodeSystem/IMMZ.Z.CS', code: 'YF', display: 'Yellow fever vaccine' }],
    text: 'Yellow fever vaccine',
  },
  patient: { reference: 'Patient/sample-patient-01' },
  occurrenceDateTime: '2026-06-30T09:00:00+00:00',
  protocolApplied: [
    {
      series: 'Yellow fever',
      doseNumberString: '1',
      extension: [
        {
          url: 'http://smart.who.int/immunizations/StructureDefinition/IMMZDueDateOfNextDose',
          valueDateTime: '2036-06-30',
        },
      ],
    },
  ],
  location: {
    extension: [
      {
        url: 'http://smart.who.int/immunizations/StructureDefinition/IMMZCountryOfVaccination',
        // ISO 3166-1 alpha-3, required-strength binding confirmed directly
        // against IMMZCountryOfVaccination's own StructureDefinition.
        valueCodeableConcept: { coding: [{ system: 'urn:iso:std:iso:3166', code: 'BGD', display: 'Bangladesh' }] },
      },
    ],
  },
  extension: [
    {
      url: 'http://smart.who.int/immunizations/StructureDefinition/IMMZVaccineBrand',
      valueCodeableConcept: { text: 'Stamaril' },
    },
    {
      url: 'http://smart.who.int/immunizations/StructureDefinition/IMMZMarketAuthorization',
      valueCodeableConcept: { text: 'Sanofi Pasteur' },
    },
  ],
}

export const sampleImmunizationBundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 1,
  entry: [{ fullUrl: 'urn:uuid:sample-immz-conformant-01', resource: sampleImmunizationResource }],
}

/**
 * Reads a value out of the sample resource for a given IG field's path --
 * the same lookup shape the real mapping-preview UI will need against a
 * live fetched resource later. Intentionally simple (no JSONPath library);
 * only needs to resolve the finite set of paths in immunizationIgFields.ts.
 */
export function readSampleField(field: ImmunizationIgField): unknown {
  const r = sampleImmunizationResource as Record<string, unknown>
  switch (field.path) {
    case 'status':
      return r.status
    case 'vaccineCode':
      return r.vaccineCode
    case 'patient':
      return r.patient
    case 'occurrenceDateTime':
      return r.occurrenceDateTime
    case 'statusReason':
      return undefined // not present in this sample -- optional field
    case 'protocolApplied':
      return r.protocolApplied
    case 'protocolApplied.series':
      return (r.protocolApplied as Array<{ series?: string }>)?.[0]?.series
    case 'protocolApplied.doseNumberString':
      return (r.protocolApplied as Array<{ doseNumberString?: string }>)?.[0]?.doseNumberString
    default:
      if (field.origin === 'ig-extension' && field.extensionUrl) {
        const bag =
          field.path.startsWith('location.')
            ? ((r.location as { extension?: Array<{ url: string }> })?.extension ?? [])
            : field.path.startsWith('protocolApplied.')
            ? ((r.protocolApplied as Array<{ extension?: Array<{ url: string }> }>)?.[0]?.extension ?? [])
            : ((r.extension as Array<{ url: string }>) ?? [])
        return bag.find((e) => e.url === field.extensionUrl)
      }
      return undefined
  }
}
