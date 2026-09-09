import { buildTrackerEventPayload } from './buildTrackerEventPayload'
import { setCodeMapping, setFieldMapping, type MappingProfile } from '../mapping/MappingProfile'
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
      ],
    },
  ],
}

const emptyProfile: MappingProfile = { programId: 'prog1', programStageId: 'stage1', fieldMappings: [] }

const conformantResource = {
  resourceType: 'Immunization',
  id: 'r1',
  status: 'completed',
  occurrenceDateTime: '2026-06-30T09:00:00+00:00',
  vaccineCode: { coding: [{ code: 'YF', display: 'Yellow fever vaccine' }] },
}

describe('buildTrackerEventPayload', () => {
  it('builds one event with program/programStage/orgUnit/occurredAt/status, and a dataValue per mapped field', () => {
    let profile = setFieldMapping(emptyProfile, 'de-status', 'status')
    profile = setFieldMapping(profile, 'de-vaccine', 'vaccineCode')

    const payload = buildTrackerEventPayload(program, profile, conformantResource, 'orgUnit1')

    expect(payload).toEqual({
      events: [
        {
          program: 'prog1',
          programStage: 'stage1',
          orgUnit: 'orgUnit1',
          occurredAt: '2026-06-30T09:00:00+00:00',
          status: 'COMPLETED',
          dataValues: [
            { dataElement: 'de-status', value: 'completed' },
            { dataElement: 'de-vaccine', value: 'Yellow fever vaccine' },
          ],
        },
      ],
    })
  })

  it('omits data elements with no mapping at all', () => {
    const profile = setFieldMapping(emptyProfile, 'de-status', 'status')
    const payload = buildTrackerEventPayload(program, profile, conformantResource, 'orgUnit1')
    expect(payload?.events[0].dataValues).toEqual([{ dataElement: 'de-status', value: 'completed' }])
  })

  it('omits a mapped field whose value is absent on this particular resource, rather than an empty string', () => {
    const profile = setFieldMapping(emptyProfile, 'de-status', 'statusReason')
    const payload = buildTrackerEventPayload(program, profile, conformantResource, 'orgUnit1')
    expect(payload?.events[0].dataValues).toEqual([])
  })

  it('returns null, not a payload with a fabricated date, when the resource has no occurrenceDateTime', () => {
    const resourceMissingDate = { resourceType: 'Immunization', id: 'r2', status: 'completed' }
    const payload = buildTrackerEventPayload(program, emptyProfile, resourceMissingDate, 'orgUnit1')
    expect(payload).toBeNull()
  })
})

describe('buildTrackerEventPayload -- code mapping', () => {
  const vaccineOptionSet: DhisOptionSet = { id: 'os1', name: 'Vaccines', options: [{ code: 'YELLOW_FEVER', name: 'Yellow fever' }] }

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

  const optionSetEmptyProfile: MappingProfile = { programId: 'prog1', programStageId: 'stage1', fieldMappings: [] }

  it('writes the real DHIS2 option code, not display text, once a code translation is saved', () => {
    let profile = setFieldMapping(optionSetEmptyProfile, 'de-vaccine', 'vaccineCode')
    profile = setCodeMapping(profile, 'de-vaccine', 'YF', 'YELLOW_FEVER')

    const payload = buildTrackerEventPayload(optionSetProgram, profile, conformantResource, 'orgUnit1')
    expect(payload?.events[0].dataValues).toEqual([{ dataElement: 'de-vaccine', value: 'YELLOW_FEVER' }])
  })

  it('omits the data element entirely (not display text) when no code translation has been saved yet', () => {
    const profile = setFieldMapping(optionSetEmptyProfile, 'de-vaccine', 'vaccineCode')
    const payload = buildTrackerEventPayload(optionSetProgram, profile, conformantResource, 'orgUnit1')
    expect(payload?.events[0].dataValues).toEqual([])
  })
})
