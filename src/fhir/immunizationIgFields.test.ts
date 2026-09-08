/**
 * Cross-checks immunizationIgFields against the real StructureDefinition
 * JSON saved in __fixtures__ -- the same file fetched directly from the
 * live IG and used to write that module. Point of this test: if the fixture
 * is ever refreshed against a newer IG version and a field's cardinality or
 * slice name silently changed, this fails instead of the drift going
 * unnoticed.
 */
import fixture from './__fixtures__/IMMZ.Immunization.StructureDefinition.json'
import { IMMZ_IMMUNIZATION_PROFILE_URL, immunizationIgFields, requiredImmunizationIgFields } from './immunizationIgFields'

interface DifferentialElement {
  path: string
  sliceName?: string
  min?: number
  max?: string
}

const elements = fixture.differential.element as DifferentialElement[]

describe('immunizationIgFields against the real StructureDefinition', () => {
  it('matches the canonical profile URL', () => {
    expect(fixture.url).toBe(IMMZ_IMMUNIZATION_PROFILE_URL)
    expect(fixture.type).toBe('Immunization')
  })

  it.each(immunizationIgFields.filter((f) => f.origin === 'ig-extension'))(
    'ig-extension field "$path" has a matching slice in the real differential',
    (field) => {
      const match = elements.find((el) => el.sliceName === field.sliceName)
      expect(match).toBeDefined()
    }
  )

  it.each(immunizationIgFields.filter((f) => f.required && f.origin === 'ig-extension'))(
    'required ig-extension field "$path" is min:1 in the real differential',
    (field) => {
      const match = elements.find((el) => el.sliceName === field.sliceName)
      expect(match?.min).toBeGreaterThanOrEqual(1)
    }
  )

  it.each(immunizationIgFields.filter((f) => !f.required && f.origin === 'ig-extension'))(
    'optional ig-extension field "$path" is min:0 in the real differential',
    (field) => {
      const match = elements.find((el) => el.sliceName === field.sliceName)
      expect(match?.min).toBe(0)
    }
  )

  it('does not include isSubpotent -- the field an earlier summarized read incorrectly claimed was part of this profile', () => {
    expect(immunizationIgFields.find((f) => f.path.toLowerCase().includes('subpotent'))).toBeUndefined()
    expect(elements.find((el) => el.path.toLowerCase().includes('subpotent'))).toBeUndefined()
  })

  it('requiredImmunizationIgFields returns exactly the fields marked required', () => {
    const required = requiredImmunizationIgFields()
    expect(required.every((f) => f.required)).toBe(true)
    expect(required.length).toBe(immunizationIgFields.filter((f) => f.required).length)
  })

  it('has no duplicate paths', () => {
    const paths = immunizationIgFields.map((f) => f.path)
    expect(new Set(paths).size).toBe(paths.length)
  })
})
