import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import type { DhisTargetProgram } from '../dhis2/types'
import { useMappingProfile } from './useMappingProfile'
import { customDataWrapper as wrapper } from '../test-utils/customDataProvider'

const program: DhisTargetProgram = {
  id: 'prog1',
  name: 'Test program',
  programStages: [{ id: 'stage1', name: 'Test stage', programStageDataElements: [] }],
}

const RESOURCE = 'dataStore/fhirMappingStudio/mappingProfile-prog1'

class MockNotFoundError extends Error {
  details = { httpStatusCode: 404 }
}


describe('useMappingProfile', () => {
  it('starts with a fresh empty profile when nothing has been saved for this program yet', async () => {
    const { result } = renderHook(() => useMappingProfile(program), {
      wrapper: wrapper({
        [RESOURCE]: async () => {
          throw new MockNotFoundError('not found')
        },
      }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toEqual({ programId: 'prog1', programStageId: 'stage1', fieldMappings: [] })
    expect(result.current.loadError).toBeNull()
  })

  it('loads an existing saved profile instead of starting empty', async () => {
    const savedProfile = { programId: 'prog1', programStageId: 'stage1', fieldMappings: [{ dhisDataElementId: 'de1', fhirFieldPath: 'vaccineCode' }] }
    const { result } = renderHook(() => useMappingProfile(program), {
      wrapper: wrapper({ [RESOURCE]: savedProfile }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toEqual(savedProfile)
  })

  it('save() after loading nothing issues a create, and flips existedAlready so the next save would update', async () => {
    const calls: string[] = []
    const { result } = renderHook(() => useMappingProfile(program), {
      wrapper: wrapper({
        [RESOURCE]: async (type: string) => {
          calls.push(type)
          if (calls.length === 1) {
            throw new MockNotFoundError('not found') // the initial load
          }
          return null // the save
        },
      }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.save()
    })

    expect(result.current.savedRecently).toBe(true)
    expect(result.current.saveError).toBeNull()
    expect(calls).toEqual(['read', 'create'])
  })

  it('a failed save sets saveError and leaves savedRecently false, rather than silently swallowing it', async () => {
    const { result } = renderHook(() => useMappingProfile(program), {
      wrapper: wrapper({
        [RESOURCE]: async (type: string) => {
          if (type === 'read') {
            throw new MockNotFoundError('not found')
          }
          throw new Error('save failed')
        },
      }),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.save()
    })

    expect(result.current.savedRecently).toBe(false)
    expect(result.current.saveError?.message).toBe('save failed')
  })

  it('clears the profile back to null when the program selection is cleared', async () => {
    const { result, rerender } = renderHook(({ p }: { p: DhisTargetProgram | null }) => useMappingProfile(p), {
      wrapper: wrapper({
        [RESOURCE]: async () => {
          throw new MockNotFoundError('not found')
        },
      }),
      initialProps: { p: program },
    })

    await waitFor(() => expect(result.current.profile).not.toBeNull())

    rerender({ p: null })
    expect(result.current.profile).toBeNull()
  })
})
