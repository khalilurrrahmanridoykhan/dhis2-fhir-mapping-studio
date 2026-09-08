import { requiredImmunizationIgFields } from './immunizationIgFields'
import { readSampleField, sampleImmunizationBundle, sampleImmunizationResource } from './sampleImmunizationBundle'

describe('sampleImmunizationBundle', () => {
  it('is a valid searchset Bundle wrapping the sample resource', () => {
    expect(sampleImmunizationBundle.resourceType).toBe('Bundle')
    expect(sampleImmunizationBundle.entry[0].resource).toBe(sampleImmunizationResource)
  })

  it('declares conformance to the real IG profile URL', () => {
    expect(sampleImmunizationResource.meta.profile).toContain(
      'http://smart.who.int/immunizations/StructureDefinition/IMMZ.Immunization'
    )
  })

  // The actual honest claim this fixture makes: every field the IG marks
  // required (min >= 1, verified in immunizationIgFields.test.ts against
  // the real spec) has a real, non-empty value here. Not "this passes a
  // FHIR validator" -- that's explicitly out of scope, see the module's
  // own doc comment.
  it.each(requiredImmunizationIgFields())('required field "$path" has a real value in the sample', (field) => {
    const value = readSampleField(field)
    expect(value).toBeDefined()
  })
})
