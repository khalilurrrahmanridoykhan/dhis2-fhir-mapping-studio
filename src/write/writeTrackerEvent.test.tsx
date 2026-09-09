import { CustomDataProvider, useDataEngine } from '@dhis2/app-runtime'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { writeTrackerEvent } from './writeTrackerEvent'
import type { TrackerEventPayload } from './buildTrackerEventPayload'

const payload: TrackerEventPayload = {
  events: [
    {
      program: 'prog1',
      programStage: 'stage1',
      orgUnit: 'orgUnit1',
      occurredAt: '2026-06-30T09:00:00+00:00',
      status: 'COMPLETED',
      dataValues: [{ dataElement: 'de-status', value: 'completed' }],
    },
  ],
}

function wrapper(data: Record<string, unknown>) {
  return ({ children }: { children: React.ReactNode }) => <CustomDataProvider data={data}>{children}</CustomDataProvider>
}

describe('writeTrackerEvent', () => {
  it('posts to tracker?async=false with the payload and reports success plus the created event id', async () => {
    const calls: { type: string; data: unknown }[] = []
    const { result } = renderHook(() => useDataEngine(), {
      wrapper: wrapper({
        'tracker?async=false': async (type: string, query: { data?: unknown }) => {
          calls.push({ type, data: query?.data })
          return {
            status: 'OK',
            bundleReport: { typeReportMap: { EVENT: { objectReports: [{ uid: 'newEvent1' }] } } },
          }
        },
      }),
    })

    const outcome = await writeTrackerEvent(result.current, payload)

    expect(calls).toEqual([{ type: 'create', data: payload }])
    expect(outcome).toEqual({ success: true, eventId: 'newEvent1', errorMessages: [] })
  })

  it('reports failure and the real validation messages when DHIS2 rejects the event', async () => {
    const { result } = renderHook(() => useDataEngine(), {
      wrapper: wrapper({
        'tracker?async=false': async () => ({
          status: 'ERROR',
          validationReport: { errorReports: [{ message: 'Value "Yellow fever vaccine" is not a valid option.' }] },
        }),
      }),
    })

    const outcome = await writeTrackerEvent(result.current, payload)

    expect(outcome.success).toBe(false)
    expect(outcome.eventId).toBeNull()
    expect(outcome.errorMessages).toEqual(['Value "Yellow fever vaccine" is not a valid option.'])
  })

  it('treats a response with no reported event id as a failure even if status says OK', async () => {
    const { result } = renderHook(() => useDataEngine(), {
      wrapper: wrapper({
        'tracker?async=false': async () => ({ status: 'OK' }),
      }),
    })

    const outcome = await writeTrackerEvent(result.current, payload)
    await waitFor(() => expect(outcome.success).toBe(false))
    expect(outcome.eventId).toBeNull()
  })
})
