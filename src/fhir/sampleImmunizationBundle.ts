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
import { readImmunizationField } from './readImmunizationField'

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
 * Reads a value out of the sample resource for a given IG field's path.
 * A thin wrapper over the generic readImmunizationField() -- which is what
 * the real preview pipeline uses against a live fetched resource -- kept
 * here so existing callers/tests don't need to pass the sample resource
 * in themselves.
 */
export function readSampleField(field: ImmunizationIgField): unknown {
  return readImmunizationField(sampleImmunizationResource as Record<string, unknown>, field)
}
