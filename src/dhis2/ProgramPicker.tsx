import { CircularLoader, NoticeBox, SingleSelect, SingleSelectOption } from '@dhis2/ui'
import React, { FC } from 'react'
import { useTargetPrograms } from './useTargetPrograms'
import type { DhisTargetProgram } from './types'

interface ProgramPickerProps {
  selectedProgramId: string | null
  onSelect: (program: DhisTargetProgram) => void
}

/**
 * Lets an admin pick an existing DHIS2 program to map the anchored FHIR
 * resource onto -- browsed live, never created by this app. Restricted to
 * WITHOUT_REGISTRATION programs at the query level (useTargetPrograms),
 * which is also why there's no separate program-stage picker here: that
 * program type is hard-limited to exactly one stage.
 */
export const ProgramPicker: FC<ProgramPickerProps> = ({ selectedProgramId, onSelect }) => {
  const { error, loading, programs } = useTargetPrograms()

  if (loading) {
    return <CircularLoader small />
  }

  if (error) {
    return <NoticeBox error title="Could not load programs">{error.message}</NoticeBox>
  }

  if (programs.length === 0) {
    return (
      <NoticeBox title="No eligible programs found">
        This instance has no WITHOUT_REGISTRATION programs to map onto yet.
      </NoticeBox>
    )
  }

  return (
    <SingleSelect
      selected={selectedProgramId ?? undefined}
      placeholder="Select a target program"
      onChange={({ selected }) => {
        const program = programs.find((p) => p.id === selected)
        if (program) {
          onSelect(program)
        }
      }}
    >
      {programs.map((program) => (
        <SingleSelectOption key={program.id} value={program.id} label={program.name} />
      ))}
    </SingleSelect>
  )
}
