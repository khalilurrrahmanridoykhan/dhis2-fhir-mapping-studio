import { resolveDataValue } from './resolveDataValue'
import type { DhisDataElement, DhisOptionSet } from '../dhis2/types'

const vaccineOptionSet: DhisOptionSet = {
  id: 'os1',
  name: 'Vaccines',
  options: [{ code: 'YELLOW_FEVER', name: 'Yellow fever' }],
}

const optionSetDataElement: DhisDataElement = { id: 'de1', name: 'Vaccine given', valueType: 'OPTION_SET', optionSet: vaccineOptionSet }
const textDataElement: DhisDataElement = { id: 'de2', name: 'Notes', valueType: 'TEXT' }

const vaccineCodeValue = { coding: [{ code: 'YF', display: 'Yellow fever vaccine' }] }

describe('resolveDataValue', () => {
  it('writes the real DHIS2 option code when a translation for the observed code exists', () => {
    const value = resolveDataValue(optionSetDataElement, vaccineCodeValue, [{ fhirCode: 'YF', dhisOptionCode: 'YELLOW_FEVER' }])
    expect(value).toBe('YELLOW_FEVER')
  })

  it('omits the value (null), not display text, when the OPTION_SET field has no translation for this code yet', () => {
    const value = resolveDataValue(optionSetDataElement, vaccineCodeValue, [])
    expect(value).toBeNull()
  })

  it('omits the value when codeMappings is undefined entirely (field never had any code mapped)', () => {
    const value = resolveDataValue(optionSetDataElement, vaccineCodeValue, undefined)
    expect(value).toBeNull()
  })

  it('falls through to toDhisDataValue for a non-OPTION_SET data element, even with a CodeableConcept value', () => {
    const value = resolveDataValue(textDataElement, vaccineCodeValue, undefined)
    expect(value).toBe('Yellow fever vaccine')
  })

  it('falls through to toDhisDataValue for an OPTION_SET data element whose value is not CodeableConcept-shaped', () => {
    const value = resolveDataValue(optionSetDataElement, 'completed', undefined)
    expect(value).toBe('completed')
  })
})
