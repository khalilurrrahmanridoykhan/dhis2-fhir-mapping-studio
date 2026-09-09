import { buildMappingPreview } from './buildMappingPreview'
import { setCodeMapping, setFieldMapping, type MappingProfile } from './MappingProfile'
import type { DhisOptionSet, DhisTargetProgram } from '../dhis2/types'

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

  it('every row has codeMapping: null when its data element has no OPTION_SET', () => {
    const rows = buildMappingPreview(program, emptyProfile, fetchedResource)
    expect(rows.every((r) => r.codeMapping === null)).toBe(true)
  })
})

describe('buildMappingPreview -- code mapping', () => {
  const vaccineOptionSet: DhisOptionSet = {
    id: 'os1',
    name: 'Vaccines',
    options: [
      { code: 'YELLOW_FEVER', name: 'Yellow fever' },
      { code: 'MEASLES', name: 'Measles' },
    ],
  }

  const optionSetProgram: DhisTargetProgram = {
    id: 'prog1',
    name: 'Immunization program',
    programStages: [
      {
        id: 'stage1',
        name: 'Immunization stage',
        programStageDataElements: [
          { dataElement: { id: 'de-vaccine', name: 'Vaccine given', valueType: 'OPTION_SET', optionSet: vaccineOptionSet } },
        ],
      },
    ],
  }

  const emptyOptionSetProfile: MappingProfile = { programId: 'prog1', programStageId: 'stage1', fieldMappings: [] }

  it('flags the row as a code-mapping opportunity when the data element has an OPTION_SET and the mapped value is a real observed code', () => {
    const profile = setFieldMapping(emptyOptionSetProfile, 'de-vaccine', 'vaccineCode')
    const rows = buildMappingPreview(optionSetProgram, profile, fetchedResource)

    expect(rows[0].codeMapping).toEqual({
      optionSet: vaccineOptionSet,
      observedCode: 'YF',
      observedDisplay: 'Yellow fever vaccine',
      resolvedOptionCode: null,
    })
  })

  it('reports the already-saved translation as resolvedOptionCode once one exists', () => {
    let profile = setFieldMapping(emptyOptionSetProfile, 'de-vaccine', 'vaccineCode')
    profile = setCodeMapping(profile, 'de-vaccine', 'YF', 'YELLOW_FEVER')

    const rows = buildMappingPreview(optionSetProgram, profile, fetchedResource)
    expect(rows[0].codeMapping?.resolvedOptionCode).toBe('YELLOW_FEVER')
  })

  it('is null when the OPTION_SET data element is mapped to a non-coded field (e.g. status)', () => {
    const profile = setFieldMapping(emptyOptionSetProfile, 'de-vaccine', 'status')
    const rows = buildMappingPreview(optionSetProgram, profile, fetchedResource)
    expect(rows[0].codeMapping).toBeNull()
  })

  it('is null when the field is mapped but the fetched resource has no value for it', () => {
    const profile = setFieldMapping(emptyOptionSetProfile, 'de-vaccine', 'vaccineCode')
    const resourceWithoutVaccineCode = { resourceType: 'Immunization', id: 'r2', status: 'completed' }
    const rows = buildMappingPreview(optionSetProgram, profile, resourceWithoutVaccineCode)
    expect(rows[0].codeMapping).toBeNull()
  })
})
