import {
  Button,
  CircularLoader,
  Help,
  NoticeBox,
  SingleSelect,
  SingleSelectOption,
  Table,
  TableBody,
  TableCell,
  TableCellHead,
  TableHead,
  TableRow,
  TableRowHead,
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import React, { FC } from 'react'
import type { useMappingPreview } from './useMappingPreview'
import classes from './MappingPreview.module.css'

interface MappingPreviewProps {
  preview: ReturnType<typeof useMappingPreview>
  /**
   * Called when an admin picks which DHIS2 option one observed FHIR code
   * corresponds to. Threaded through rather than handled locally, since
   * the translation lives in the saved MappingProfile (App.tsx owns that
   * state via setProfile), not in this component.
   */
  onCodeMappingChange: (dhisDataElementId: string, fhirCode: string, dhisOptionCode: string) => void
}

/**
 * Renders the result of useMappingPreview -- the actual "does this mapping
 * do what I think it does" check, run against one real resource fetched
 * live through the connected Route. Preview only: nothing here writes to
 * DHIS2 (see buildMappingPreview.ts's own header comment) -- including the
 * code-mapping picker below, which only records a translation into the
 * profile; resolveDataValue.ts is what actually applies it at write time.
 */
export const MappingPreview: FC<MappingPreviewProps> = ({ preview, onCodeMappingChange }) => {
  const compulsoryGaps = (preview.rows ?? []).filter((row) => row.compulsory && !row.willBeWritten)

  return (
    <div className={classes.stack}>
      <div>
        <Button loading={preview.loading} onClick={() => preview.fetchPreview()}>
          {i18n.t('Fetch a resource and preview the mapping')}
        </Button>
      </div>

      {preview.loading && <CircularLoader small />}

      {preview.error && (
        <NoticeBox error title={i18n.t('Could not fetch a preview')}>
          {preview.error.message}
        </NoticeBox>
      )}

      {preview.rows && preview.resourceCount === 0 && (
        <NoticeBox title={i18n.t('No resources found')}>
          {i18n.t('The connected FHIR server returned no Immunization resources to preview.')}
        </NoticeBox>
      )}

      {compulsoryGaps.length > 0 && (
        <NoticeBox warning title={i18n.t('DHIS2 will reject this write -- compulsory data elements have no value')}>
          {i18n.t(
            'This program stage requires a value for: {{names}}. Map each to an IG field the fetched resource actually provides (and, for coded fields, map its code), or the write fails.',
            { names: compulsoryGaps.map((row) => row.dhisDataElementName).join(', ') }
          )}
        </NoticeBox>
      )}

      {preview.rows && preview.rows.length > 0 && (
        <div className={classes.tableScroll}>
        <Table>
          <TableHead>
            <TableRowHead>
              <TableCellHead>{i18n.t('DHIS2 data element')}</TableCellHead>
              <TableCellHead>{i18n.t('Mapped WHO SG IG field')}</TableCellHead>
              <TableCellHead>{i18n.t('Value from the fetched resource')}</TableCellHead>
              <TableCellHead>{i18n.t('Code mapping')}</TableCellHead>
            </TableRowHead>
          </TableHead>
          <TableBody>
            {preview.rows.map((row) => (
              <TableRow key={row.dhisDataElementId}>
                <TableCell>{row.dhisDataElementName}</TableCell>
                <TableCell>{row.fhirFieldLabel ?? i18n.t('Not mapped')}</TableCell>
                <TableCell>{row.displayValue}</TableCell>
                <TableCell>
                  {row.codeMapping ? (
                    <>
                      <SingleSelect
                        selected={row.codeMapping.resolvedOptionCode ?? undefined}
                        placeholder={i18n.t('Map code "{{code}}" to...', { code: row.codeMapping.observedCode })}
                        onChange={({ selected }) => onCodeMappingChange(row.dhisDataElementId, row.codeMapping!.observedCode, selected)}
                      >
                        {row.codeMapping.optionSet.options.map((option) => (
                          <SingleSelectOption key={option.code} value={option.code} label={option.name} />
                        ))}
                      </SingleSelect>
                      {!row.codeMapping.resolvedOptionCode && (
                        <Help warning>{i18n.t('Not yet mapped -- omitted from what gets written')}</Help>
                      )}
                    </>
                  ) : (
                    '--'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  )
}
