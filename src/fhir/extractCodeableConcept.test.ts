import { extractCodeableConcept } from './extractCodeableConcept'

describe('extractCodeableConcept', () => {
  it('recognizes a direct CodeableConcept (e.g. vaccineCode itself)', () => {
    const value = { coding: [{ system: 'sys', code: 'YF', display: 'Yellow fever vaccine' }], text: 'Yellow fever vaccine' }
    expect(extractCodeableConcept(value)).toEqual(value)
  })

  it('unwraps an extension wrapper around a valueCodeableConcept (e.g. an ig-extension field)', () => {
    const wrapper = {
      url: 'http://smart.who.int/immunizations/StructureDefinition/IMMZVaccineBrand',
      valueCodeableConcept: { coding: [{ code: 'STAMARIL' }], text: 'Stamaril' },
    }
    expect(extractCodeableConcept(wrapper)).toEqual({ coding: [{ code: 'STAMARIL' }], text: 'Stamaril' })
  })

  it('returns null for a plain string', () => {
    expect(extractCodeableConcept('completed')).toBeNull()
  })

  it('returns null for a Reference (no coding, no valueCodeableConcept)', () => {
    expect(extractCodeableConcept({ reference: 'Patient/abc123' })).toBeNull()
  })

  it('returns null for an extension wrapper carrying a different value[x] (e.g. valueDateTime)', () => {
    expect(extractCodeableConcept({ url: 'https://example.org/ext', valueDateTime: '2027-01-15' })).toBeNull()
  })

  it('returns null for undefined/null', () => {
    expect(extractCodeableConcept(undefined)).toBeNull()
    expect(extractCodeableConcept(null)).toBeNull()
  })
})
