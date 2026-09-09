import { Button, CircularLoader, NoticeBox, Table, TableBody, TableCell, TableCellHead, TableHead, TableRow, TableRowHead } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import React, { FC } from 'react'
import type { useMappingPreview } from './useMappingPreview'

interface MappingPreviewProps {
  preview: ReturnType<typeof useMappingPreview>
}

/**
 * Renders the result of useMappingPreview -- the actual "does this mapping
 * do what I think it does" check, run against one real resource fetched
 * live through the connected Route. Preview only: nothing here writes to
 * DHIS2 (see buildMappingPreview.ts's own header comment).
 */
export const MappingPreview: FC<MappingPreviewProps> = ({ preview }) => {
  return (
    <div>
      <Button small loading={preview.loading} onClick={() => preview.fetchPreview()}>
        {i18n.t('Fetch a resource and preview the mapping')}
      </Button>

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

      {preview.rows && preview.rows.length > 0 && (
        <Table>
          <TableHead>
            <TableRowHead>
              <TableCellHead>{i18n.t('DHIS2 data element')}</TableCellHead>
              <TableCellHead>{i18n.t('Mapped WHO SG IG field')}</TableCellHead>
              <TableCellHead>{i18n.t('Value from the fetched resource')}</TableCellHead>
            </TableRowHead>
          </TableHead>
          <TableBody>
            {preview.rows.map((row) => (
              <TableRow key={row.dhisDataElementId}>
                <TableCell>{row.dhisDataElementName}</TableCell>
                <TableCell>{row.fhirFieldLabel ?? i18n.t('Not mapped')}</TableCell>
                <TableCell>{row.displayValue}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
