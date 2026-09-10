import { Button, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import React, { FC } from 'react'
import { OrgUnitPicker } from '../dhis2/OrgUnitPicker'
import type { useWriteMappedEvent } from './useWriteMappedEvent'
import classes from './WriteToTracker.module.css'

interface WriteToTrackerProps {
  write: ReturnType<typeof useWriteMappedEvent>
}

/**
 * The write step -- pick an org unit, then write exactly the resource
 * already shown in the preview. Deliberately never offered before a
 * preview exists (see App.tsx's own gating): this app's whole premise,
 * inherited from why FHIR Sync Console was well-received, is preview
 * before write, never write blind.
 */
export const WriteToTracker: FC<WriteToTrackerProps> = ({ write }) => {
  return (
    <div className={classes.stack}>
      <OrgUnitPicker onSelect={write.setOrgUnitId} />

      <div>
        <Button primary disabled={!write.canWrite} loading={write.writing} onClick={() => write.write()}>
          {i18n.t('Write this event to DHIS2')}
        </Button>
      </div>

      {write.buildError && (
        <NoticeBox error title={i18n.t('Could not build this event')}>
          {write.buildError}
        </NoticeBox>
      )}

      {write.outcome?.success && (
        <NoticeBox valid title={i18n.t('Event written')}>
          {i18n.t('Created event {{eventId}} in DHIS2.', { eventId: write.outcome.eventId })}
        </NoticeBox>
      )}

      {write.outcome && !write.outcome.success && (
        <NoticeBox error title={i18n.t('DHIS2 rejected this event')}>
          {write.outcome.errorMessages.length > 0
            ? write.outcome.errorMessages.join(' ')
            : i18n.t('No further detail was reported.')}
        </NoticeBox>
      )}
    </div>
  )
}
