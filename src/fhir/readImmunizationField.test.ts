import { immunizationIgFields } from './immunizationIgFields'
import { readImmunizationField } from './readImmunizationField'

function fieldByPath(path: string) {
  const field = immunizationIgFields.find((f) => f.path === path)
  if (!field) throw new Error(`no such field: ${path}`)
  return field
}

// A second, independently-built fixture (deliberately not
// sampleImmunizationResource) -- proves this reader is generic over any
// Immunization-shaped resource, e.g. one just fetched live through a
// Route, not hardwired to the one hand-authored sample.
const liveLikeResource = {
  resourceType: 'Immunization',
  id: 'live-01',
  status: 'completed',
  vaccineCode: { coding: [{ system: 'http://smart.who.int/immunizations/CodeSystem/IMMZ.Z.CS', code: 'MEASLES' }] },
  patient: { reference: 'Patient/live-patient-01' },
  occurrenceDateTime: '2026-01-15T08:00:00Z',
  protocolApplied: [
    {
      series: 'Measles',
      doseNumberString: '2',
      extension: [{ url: 'http://smart.who.int/immunizations/StructureDefinition/IMMZDueDateOfNextDose', valueDateTime: '2027-01-15' }],
    },
  ],
  location: {
    extension: [
      { url: 'http://smart.who.int/immunizations/StructureDefinition/IMMZCountryOfVaccination', valueCodeableConcept: { text: 'BGD' } },
    ],
  },
  extension: [{ url: 'http://smart.who.int/immunizations/StructureDefinition/IMMZVaccineBrand', valueCodeableConcept: { text: 'MMR-II' } }],
}

describe('readImmunizationField', () => {
  it('reads simple top-level base fields', () => {
    expect(readImmunizationField(liveLikeResource, fieldByPath('status'))).toBe('completed')
    expect(readImmunizationField(liveLikeResource, fieldByPath('occurrenceDateTime'))).toBe('2026-01-15T08:00:00Z')
    expect(readImmunizationField(liveLikeResource, fieldByPath('vaccineCode'))).toEqual(liveLikeResource.vaccineCode)
    expect(readImmunizationField(liveLikeResource, fieldByPath('patient'))).toEqual({ reference: 'Patient/live-patient-01' })
  })

  it('returns undefined for an absent optional field rather than throwing', () => {
    expect(readImmunizationField(liveLikeResource, fieldByPath('statusReason'))).toBeUndefined()
  })

  it('reads nested protocolApplied fields off the first entry', () => {
    expect(readImmunizationField(liveLikeResource, fieldByPath('protocolApplied.series'))).toBe('Measles')
    expect(readImmunizationField(liveLikeResource, fieldByPath('protocolApplied.doseNumberString'))).toBe('2')
  })

  it('finds a top-level ig-extension by its extensionUrl', () => {
    const value = readImmunizationField(liveLikeResource, fieldByPath('extension:vaccineBrand'))
    expect(value).toEqual({
      url: 'http://smart.who.int/immunizations/StructureDefinition/IMMZVaccineBrand',
      valueCodeableConcept: { text: 'MMR-II' },
    })
  })

  it('finds a location-nested ig-extension', () => {
    const value = readImmunizationField(liveLikeResource, fieldByPath('location.extension:countryOfVaccination'))
    expect(value).toMatchObject({ valueCodeableConcept: { text: 'BGD' } })
  })

  it('finds a protocolApplied-nested ig-extension', () => {
    const value = readImmunizationField(liveLikeResource, fieldByPath('protocolApplied.extension:dueDateOfNextDose'))
    expect(value).toMatchObject({ valueDateTime: '2027-01-15' })
  })

  it('returns undefined for an ig-extension the resource does not carry, rather than throwing', () => {
    const value = readImmunizationField(liveLikeResource, fieldByPath('extension:liveVaccine'))
    expect(value).toBeUndefined()
  })

  it('handles a resource missing the arrays entirely (empty extension/protocolApplied), not just empty ones', () => {
    const bareResource = { resourceType: 'Immunization', id: 'bare-01', status: 'completed' }
    expect(readImmunizationField(bareResource, fieldByPath('extension:vaccineBrand'))).toBeUndefined()
    expect(readImmunizationField(bareResource, fieldByPath('protocolApplied.series'))).toBeUndefined()
    expect(readImmunizationField(bareResource, fieldByPath('location.extension:countryOfVaccination'))).toBeUndefined()
  })
})
