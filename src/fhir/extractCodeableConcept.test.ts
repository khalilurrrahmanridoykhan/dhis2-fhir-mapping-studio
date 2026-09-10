import { extractCodeableConcept, observedConceptKey } from './extractCodeableConcept'

describe('extractCodeableConcept', () => {
  it('recognizes a direct CodeableConcept (e.g. vaccineCode itself)', () => {
    const value = { coding: [{ system: 'sys', code: 'YF', display: 'Yellow fever vaccine' }], text: 'Yellow fever vaccine' }
    expect(extractCodeableConcept(value)).toEqual(value)
  })

  it('recognizes a text-only CodeableConcept (real FHIR servers send vaccineCode this way)', () => {
    expect(extractCodeableConcept({ text: 'Influenza, seasonal' })).toEqual({ text: 'Influenza, seasonal' })
  })

  it('unwraps an extension wrapper around a text-only valueCodeableConcept', () => {
    const wrapper = { url: 'https://example.org/ext', valueCodeableConcept: { text: 'Stamaril' } }
    expect(extractCodeableConcept(wrapper)).toEqual({ text: 'Stamaril' })
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

  it('returns null for a Reference that also carries a display string', () => {
    expect(extractCodeableConcept({ reference: 'Location/1', display: 'Main clinic' })).toBeNull()
  })
})

describe('observedConceptKey', () => {
  it('prefers the first coding\'s code', () => {
    expect(observedConceptKey({ coding: [{ code: 'YF', display: 'Yellow fever' }], text: 'Yellow fever' })).toBe('YF')
  })

  it('falls back to the concept text when there is no coding', () => {
    expect(observedConceptKey({ text: 'Influenza, seasonal' })).toBe('Influenza, seasonal')
  })

  it('is undefined when neither a code nor text is present', () => {
    expect(observedConceptKey({ coding: [{ display: 'no code here' }] })).toBeUndefined()
  })
})
