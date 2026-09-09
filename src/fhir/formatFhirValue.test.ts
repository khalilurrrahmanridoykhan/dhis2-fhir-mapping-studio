import { formatFhirValue } from './formatFhirValue'

describe('formatFhirValue', () => {
  it('formats primitives as-is', () => {
    expect(formatFhirValue('completed')).toBe('completed')
    expect(formatFhirValue(true)).toBe('true')
    expect(formatFhirValue(2)).toBe('2')
  })

  it('formats undefined/null as "(no value)"', () => {
    expect(formatFhirValue(undefined)).toBe('(no value)')
    expect(formatFhirValue(null)).toBe('(no value)')
  })

  it('prefers a CodeableConcept coding\'s display, then code, then text', () => {
    expect(formatFhirValue({ coding: [{ code: 'YF', display: 'Yellow fever vaccine' }] })).toBe('Yellow fever vaccine')
    expect(formatFhirValue({ coding: [{ code: 'YF' }] })).toBe('YF')
    expect(formatFhirValue({ coding: [{}], text: 'Yellow fever vaccine' })).toBe('Yellow fever vaccine')
  })

  it('formats a Reference by its reference string', () => {
    expect(formatFhirValue({ reference: 'Patient/abc123' })).toBe('Patient/abc123')
  })

  it('formats an extension wrapper by its value[x], regardless of which value[x] it is', () => {
    expect(formatFhirValue({ url: 'https://example.org/ext', valueDateTime: '2027-01-15' })).toBe('2027-01-15')
    expect(formatFhirValue({ url: 'https://example.org/ext', valueBoolean: true })).toBe('true')
    expect(formatFhirValue({ url: 'https://example.org/ext', valueCodeableConcept: { text: 'Bangladesh' } })).toBe('Bangladesh')
  })

  it('joins array values with a comma', () => {
    expect(formatFhirValue(['a', 'b'])).toBe('a, b')
    expect(formatFhirValue([])).toBe('(no value)')
  })

  it('falls back to JSON for a shape it does not recognize', () => {
    expect(formatFhirValue({ foo: 'bar' })).toBe('{"foo":"bar"}')
  })
})
