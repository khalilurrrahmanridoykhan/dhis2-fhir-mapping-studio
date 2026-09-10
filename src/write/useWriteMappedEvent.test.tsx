import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { useWriteMappedEvent } from './useWriteMappedEvent'
import { setFieldMapping, type MappingProfile } from '../mapping/MappingProfile'
import type { DhisTargetProgram } from '../dhis2/types'
import { customDataWrapper as wrapper } from '../test-utils/customDataProvider'

const program: DhisTargetProgram = {
  id: 'prog1',
  name: 'Immunization program',
  programStages: [
    { id: 'stage1', name: 'Immunization stage', programStageDataElements: [{ compulsory: false, dataElement: { id: 'de-status', name: 'Status', valueType: 'TEXT' } }] },
  ],
}

const mappedProfile: MappingProfile = setFieldMapping(
  { programId: 'prog1', programStageId: 'stage1', fieldMappings: [] },
  'de-status',
  'status'
)

const conformantResource = { resourceType: 'Immunization', id: 'r1', status: 'completed', occurrenceDateTime: '2026-06-30T09:00:00+00:00' }

describe('useWriteMappedEvent', () => {
  it('does nothing when no org unit has been picked yet', async () => {
    const calls: unknown[] = []
    const { result } = renderHook(() => useWriteMappedEvent(program, mappedProfile, conformantResource), {
      wrapper: wrapper({ 'tracker?async=false': async () => { calls.push(1); return { status: 'OK' } } }),
    })

    expect(result.current.canWrite).toBe(false)
    await act(async () => {
      await result.current.write()
    })
    expect(calls).toHaveLength(0)
  })

  it('writes once program, profile, resource, and org unit are all present, and reports the real outcome', async () => {
    const { result } = renderHook(() => useWriteMappedEvent(program, mappedProfile, conformantResource), {
      wrapper: wrapper({
        'tracker?async=false': async () => ({
          status: 'OK',
          bundleReport: { typeReportMap: { EVENT: { objectReports: [{ uid: 'newEvent1' }] } } },
        }),
      }),
    })

    act(() => result.current.setOrgUnitId('orgUnit1'))
    await waitFor(() => expect(result.current.canWrite).toBe(true))

    await act(async () => {
      await result.current.write()
    })

    expect(result.current.outcome).toEqual({ success: true, eventId: 'newEvent1', errorMessages: [] })
    expect(result.current.buildError).toBeNull()
  })

  it('surfaces a build error (missing occurrenceDateTime) without ever calling the write endpoint', async () => {
    const calls: unknown[] = []
    const resourceMissingDate = { resourceType: 'Immunization', id: 'r2', status: 'completed' }
    const { result } = renderHook(() => useWriteMappedEvent(program, mappedProfile, resourceMissingDate), {
      wrapper: wrapper({ 'tracker?async=false': async () => { calls.push(1); return { status: 'OK' } } }),
    })

    act(() => result.current.setOrgUnitId('orgUnit1'))
    await waitFor(() => expect(result.current.canWrite).toBe(true))

    await act(async () => {
      await result.current.write()
    })

    expect(calls).toHaveLength(0)
    expect(result.current.buildError).toMatch(/occurrenceDateTime/)
    expect(result.current.outcome).toBeNull()
  })

  it('surfaces DHIS2 validation errors from a rejected write', async () => {
    const { result } = renderHook(() => useWriteMappedEvent(program, mappedProfile, conformantResource), {
      wrapper: wrapper({
        'tracker?async=false': async () => ({
          status: 'ERROR',
          validationReport: { errorReports: [{ message: 'Value is not a valid option.' }] },
        }),
      }),
    })

    act(() => result.current.setOrgUnitId('orgUnit1'))
    await waitFor(() => expect(result.current.canWrite).toBe(true))

    await act(async () => {
      await result.current.write()
    })

    expect(result.current.outcome?.success).toBe(false)
    expect(result.current.outcome?.errorMessages).toEqual(['Value is not a valid option.'])
  })
})
