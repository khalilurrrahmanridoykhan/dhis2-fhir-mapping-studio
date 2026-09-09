import { requiredImmunizationIgFields } from '../fhir/immunizationIgFields'
import type { DhisTargetProgram } from '../dhis2/types'
import {
  clearFieldMapping,
  createEmptyMappingProfile,
  dhisOptionCodeFor,
  fhirFieldMappedTo,
  isMappingComplete,
  missingRequiredFieldMappings,
  setCodeMapping,
  setFieldMapping,
} from './MappingProfile'

const program: DhisTargetProgram = {
  id: 'prog1',
  name: 'Test Immunization Program',
  programStages: [
    {
      id: 'stage1',
      name: 'Test stage',
      programStageDataElements: [
        { dataElement: { id: 'de1', name: 'Vaccine given', valueType: 'TEXT' } },
        { dataElement: { id: 'de2', name: 'Batch number', valueType: 'TEXT' } },
      ],
    },
  ],
}

describe('createEmptyMappingProfile', () => {
  it('takes programId/programStageId from the program, starts with no mappings', () => {
    const profile = createEmptyMappingProfile(program)
    expect(profile.programId).toBe('prog1')
    expect(profile.programStageId).toBe('stage1')
    expect(profile.fieldMappings).toEqual([])
  })

  it('falls back to an empty stage id rather than throwing on a program with no stages -- an edge case worth handling explicitly, not assumed away', () => {
    const noStageProgram: DhisTargetProgram = { id: 'p2', name: 'No stages', programStages: [] }
    expect(createEmptyMappingProfile(noStageProgram).programStageId).toBe('')
  })
})

describe('setFieldMapping / clearFieldMapping / fhirFieldMappedTo', () => {
  it('sets a mapping and reads it back', () => {
    let profile = createEmptyMappingProfile(program)
    profile = setFieldMapping(profile, 'de1', 'vaccineCode')
    expect(fhirFieldMappedTo(profile, 'de1')).toBe('vaccineCode')
  })

  it('re-mapping the same data element replaces, not duplicates, its entry', () => {
    let profile = createEmptyMappingProfile(program)
    profile = setFieldMapping(profile, 'de1', 'vaccineCode')
    profile = setFieldMapping(profile, 'de1', 'status')
    expect(profile.fieldMappings).toHaveLength(1)
    expect(fhirFieldMappedTo(profile, 'de1')).toBe('status')
  })

  it('clearing a mapping removes it and leaves others untouched', () => {
    let profile = createEmptyMappingProfile(program)
    profile = setFieldMapping(profile, 'de1', 'vaccineCode')
    profile = setFieldMapping(profile, 'de2', 'status')
    profile = clearFieldMapping(profile, 'de1')
    expect(fhirFieldMappedTo(profile, 'de1')).toBeNull()
    expect(fhirFieldMappedTo(profile, 'de2')).toBe('status')
  })

  it('reading an unmapped data element returns null, not undefined or a throw', () => {
    const profile = createEmptyMappingProfile(program)
    expect(fhirFieldMappedTo(profile, 'de1')).toBeNull()
  })
})

describe('missingRequiredFieldMappings / isMappingComplete', () => {
  const required = requiredImmunizationIgFields()

  it('an empty profile is missing every required field', () => {
    const profile = createEmptyMappingProfile(program)
    expect(missingRequiredFieldMappings(profile, required)).toHaveLength(required.length)
    expect(isMappingComplete(profile, required)).toBe(false)
  })

  it('mapping every required field (even with made-up DHIS2 data element ids) makes the profile complete', () => {
    let profile = createEmptyMappingProfile(program)
    for (const field of required) {
      profile = setFieldMapping(profile, `de-for-${field.path}`, field.path)
    }
    expect(missingRequiredFieldMappings(profile, required)).toEqual([])
    expect(isMappingComplete(profile, required)).toBe(true)
  })

  it('mapping a DHIS2 field the IG does not require is allowed and does not by itself complete the profile', () => {
    let profile = createEmptyMappingProfile(program)
    profile = setFieldMapping(profile, 'de1', 'statusReason') // statusReason is 0..1, not required
    expect(isMappingComplete(profile, required)).toBe(false)
  })
})

describe('setCodeMapping / dhisOptionCodeFor', () => {
  it('records a code translation and reads it back', () => {
    let profile = createEmptyMappingProfile(program)
    profile = setFieldMapping(profile, 'de1', 'vaccineCode')
    profile = setCodeMapping(profile, 'de1', 'YF', 'YELLOW_FEVER')
    expect(dhisOptionCodeFor(profile, 'de1', 'YF')).toBe('YELLOW_FEVER')
  })

  it('re-mapping the same FHIR code replaces, not duplicates, its translation', () => {
    let profile = createEmptyMappingProfile(program)
    profile = setFieldMapping(profile, 'de1', 'vaccineCode')
    profile = setCodeMapping(profile, 'de1', 'YF', 'YELLOW_FEVER')
    profile = setCodeMapping(profile, 'de1', 'YF', 'CORRECTED_CODE')
    expect(profile.fieldMappings[0].codeMappings).toHaveLength(1)
    expect(dhisOptionCodeFor(profile, 'de1', 'YF')).toBe('CORRECTED_CODE')
  })

  it('different FHIR codes on the same field each keep their own translation', () => {
    let profile = createEmptyMappingProfile(program)
    profile = setFieldMapping(profile, 'de1', 'vaccineCode')
    profile = setCodeMapping(profile, 'de1', 'YF', 'YELLOW_FEVER')
    profile = setCodeMapping(profile, 'de1', 'MEASLES', 'MEASLES_VACCINE')
    expect(dhisOptionCodeFor(profile, 'de1', 'YF')).toBe('YELLOW_FEVER')
    expect(dhisOptionCodeFor(profile, 'de1', 'MEASLES')).toBe('MEASLES_VACCINE')
  })

  it('is a no-op when the data element has no field mapping to attach a code translation to', () => {
    const profile = createEmptyMappingProfile(program)
    const unchanged = setCodeMapping(profile, 'de1', 'YF', 'YELLOW_FEVER')
    expect(unchanged).toBe(profile)
  })

  it('reading an unmapped code returns null, not undefined or a throw', () => {
    let profile = createEmptyMappingProfile(program)
    profile = setFieldMapping(profile, 'de1', 'vaccineCode')
    expect(dhisOptionCodeFor(profile, 'de1', 'YF')).toBeNull()
  })
})
