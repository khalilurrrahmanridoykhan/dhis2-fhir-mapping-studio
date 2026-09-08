import { SingleSelect, SingleSelectOption, Table, TableBody, TableCell, TableCellHead, TableHead, TableRow, TableRowHead, Tag } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import React, { FC } from 'react'
import { immunizationIgFields } from '../fhir/immunizationIgFields'
import type { DhisTargetProgram } from '../dhis2/types'
import { fhirFieldMappedTo, setFieldMapping, type MappingProfile } from './MappingProfile'

interface MappingTableProps {
  program: DhisTargetProgram
  profile: MappingProfile
  onChange: (profile: MappingProfile) => void
}

/**
 * One row per DHIS2 data element on the selected program's stage; a picker
 * per row for which of the 22 real WHO SG Immunization IG fields it
 * corresponds to. This is the actual human-authored, per-deployment
 * decision Johan's own framing said can never be automatic -- the picker
 * offers every IG field on every row deliberately (not filtered by DHIS2
 * valueType compatibility yet), since narrowing that guess is a future
 * refinement, not something to silently assume correct now.
 */
export const MappingTable: FC<MappingTableProps> = ({ program, profile, onChange }) => {
  const dataElements = program.programStages[0]?.programStageDataElements.map((d) => d.dataElement) ?? []

  return (
    <Table>
      <TableHead>
        <TableRowHead>
          <TableCellHead>{i18n.t('DHIS2 data element')}</TableCellHead>
          <TableCellHead>{i18n.t('Value type')}</TableCellHead>
          <TableCellHead>{i18n.t('WHO SG Immunization IG field')}</TableCellHead>
        </TableRowHead>
      </TableHead>
      <TableBody>
        {dataElements.map((dataElement) => {
          const mappedPath = fhirFieldMappedTo(profile, dataElement.id)
          return (
            <TableRow key={dataElement.id}>
              <TableCell>{dataElement.name}</TableCell>
              <TableCell>{dataElement.valueType}</TableCell>
              <TableCell>
                <SingleSelect
                  selected={mappedPath ?? undefined}
                  clearable
                  clearText={i18n.t('Not mapped')}
                  placeholder={i18n.t('Not mapped')}
                  onChange={({ selected }) => {
                    onChange(setFieldMapping(profile, dataElement.id, selected))
                  }}
                >
                  {immunizationIgFields.map((field) => (
                    <SingleSelectOption
                      key={field.path}
                      value={field.path}
                      label={field.required ? `${field.label} *` : field.label}
                    />
                  ))}
                </SingleSelect>
                {mappedPath && immunizationIgFields.find((f) => f.path === mappedPath)?.required && (
                  <Tag positive>{i18n.t('required')}</Tag>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
