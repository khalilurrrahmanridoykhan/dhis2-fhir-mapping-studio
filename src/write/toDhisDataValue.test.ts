import { toDhisDataValue } from './toDhisDataValue'

describe('toDhisDataValue', () => {
  it('passes primitives through as strings', () => {
    expect(toDhisDataValue('completed')).toBe('completed')
    expect(toDhisDataValue(true)).toBe('true')
    expect(toDhisDataValue(2)).toBe('2')
  })

  it('returns null (not the string "(no value)") for an absent value, so it can be omitted', () => {
    expect(toDhisDataValue(undefined)).toBeNull()
    expect(toDhisDataValue(null)).toBeNull()
  })

  it('formats a CodeableConcept via its display/code/text, same as formatFhirValue', () => {
    expect(toDhisDataValue({ coding: [{ code: 'YF', display: 'Yellow fever vaccine' }] })).toBe('Yellow fever vaccine')
  })

  it('formats a Reference via its reference string', () => {
    expect(toDhisDataValue({ reference: 'Patient/abc123' })).toBe('Patient/abc123')
  })
})
