import { useDataQuery } from '@dhis2/app-runtime'
import { CircularLoader, NoticeBox, OrganisationUnitTree } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import React, { FC, useState } from 'react'

interface OrgUnitRootsResponse {
  roots: { organisationUnits: { id: string }[] }
}

const orgUnitRootsQuery = {
  roots: { resource: 'organisationUnits', params: { filter: 'level:eq:1', fields: 'id', paging: 'false' } },
}

interface OrgUnitPickerProps {
  onSelect: (orgUnitId: string) => void
}

/**
 * Picks the DHIS2 organisation unit a written Tracker event gets recorded
 * against -- required by the Tracker events API, and not something a
 * previewed FHIR resource's own IG fields resolve to a real DHIS2 org
 * unit for (the IG's location extensions carry a country/administrative
 * area code, not an org unit reference), so this has to be a real
 * per-write human choice, same as picking the target program.
 *
 * Level-1 roots only -- same pattern as the sibling dhis2-fhir-sync-console
 * app's SettingsForm.
 */
export const OrgUnitPicker: FC<OrgUnitPickerProps> = ({ onSelect }) => {
  const { error, loading, data } = useDataQuery<OrgUnitRootsResponse>(orgUnitRootsQuery)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  if (loading) {
    return <CircularLoader small />
  }

  if (error) {
    return (
      <NoticeBox error title={i18n.t('Could not load organisation units')}>
        {error.message}
      </NoticeBox>
    )
  }

  const roots = data?.roots.organisationUnits.map((ou) => ou.id) ?? []

  if (roots.length === 0) {
    return (
      <NoticeBox title={i18n.t('No organisation units found')}>
        {i18n.t('This instance has no organisation units to select.')}
      </NoticeBox>
    )
  }

  return (
    <OrganisationUnitTree
      roots={roots}
      singleSelection
      selected={selectedPath ? [selectedPath] : []}
      onChange={(payload: { id: string; path: string }) => {
        setSelectedPath(payload.path)
        onSelect(payload.id)
      }}
    />
  )
}
