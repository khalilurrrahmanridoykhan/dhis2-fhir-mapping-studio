import { buildMappingPreview } from './buildMappingPreview'
import { setFieldMapping, type MappingProfile } from './MappingProfile'
import type { DhisTargetProgram } from '../dhis2/types'

const program: DhisTargetProgram = {
  id: 'prog1',
  name: 'Immunization program',
  programStages: [
    {
      id: 'stage1',
      name: 'Immunization stage',
      programStageDataElements: [
        { dataElement: { id: 'de-status', name: 'Vaccination status', valueType: 'TEXT' } },
        { dataElement: { id: 'de-vaccine', name: 'Vaccine given', valueType: 'TEXT' } },
        { dataElement: { id: 'de-unmapped', name: 'Unrelated field', valueType: 'TEXT' } },
      ],
    },
  ],
}

const emptyProfile: MappingProfile = { programId: 'prog1', programStageId: 'stage1', fieldMappings: [] }

const fetchedResource = {
  resourceType: 'Immunization',
  id: 'fetched-01',
  status: 'completed',
  vaccineCode: { coding: [{ code: 'YF', display: 'Yellow fever vaccine' }] },
}

describe('buildMappingPreview', () => {
  it('marks every data element "Not mapped" when the profile has no mappings yet', () => {
    const rows = buildMappingPreview(program, emptyProfile, fetchedResource)
    expect(rows).toHaveLength(3)
    expect(rows.every((r) => r.displayValue === 'Not mapped' && r.fhirFieldPath === null)).toBe(true)
  })

  it('reads and formats the real value from the fetched resource for a mapped field', () => {
    let profile = setFieldMapping(emptyProfile, 'de-status', 'status')
    profile = setFieldMapping(profile, 'de-vaccine', 'vaccineCode')

    const rows = buildMappingPreview(program, profile, fetchedResource)

    const statusRow = rows.find((r) => r.dhisDataElementId === 'de-status')
    expect(statusRow).toMatchObject({ fhirFieldPath: 'status', fhirFieldLabel: 'Status', displayValue: 'completed' })

    const vaccineRow = rows.find((r) => r.dhisDataElementId === 'de-vaccine')
    expect(vaccineRow).toMatchObject({ fhirFieldPath: 'vaccineCode', displayValue: 'Yellow fever vaccine' })

    const unmappedRow = rows.find((r) => r.dhisDataElementId === 'de-unmapped')
    expect(unmappedRow).toMatchObject({ fhirFieldPath: null, displayValue: 'Not mapped' })
  })

  it('shows "(no value)" (not "Not mapped") when a field is mapped but the fetched resource lacks it', () => {
    const profile = setFieldMapping(emptyProfile, 'de-status', 'statusReason')
    const rows = buildMappingPreview(program, profile, fetchedResource)
    const row = rows.find((r) => r.dhisDataElementId === 'de-status')
    expect(row).toMatchObject({ fhirFieldPath: 'statusReason', displayValue: '(no value)' })
  })

  it('produces one row per data element, in the program stage\'s own order', () => {
    const rows = buildMappingPreview(program, emptyProfile, fetchedResource)
    expect(rows.map((r) => r.dhisDataElementId)).toEqual(['de-status', 'de-vaccine', 'de-unmapped'])
  })
})
