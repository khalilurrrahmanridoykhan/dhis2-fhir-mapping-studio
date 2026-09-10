import { Button, Card, CircularLoader, NoticeBox, Tag } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import React, { FC, useState } from 'react'
import { ProgramPicker } from './dhis2/ProgramPicker'
import type { DhisTargetProgram } from './dhis2/types'
import { isMappingComplete, missingRequiredFieldMappings, setCodeMapping } from './mapping/MappingProfile'
import { MappingPreview } from './mapping/MappingPreview'
import { MappingTable } from './mapping/MappingTable'
import { useMappingPreview } from './mapping/useMappingPreview'
import { useMappingProfile } from './mapping/useMappingProfile'
import { requiredImmunizationIgFields } from './fhir/immunizationIgFields'
import { RoutePicker } from './fhirConnection/RoutePicker'
import { useCurrentUserAuthorities } from './fhirConnection/useCurrentUserAuthorities'
import { useFhirConnection } from './fhirConnection/useFhirConnection'
import { useFhirRoute } from './fhirConnection/useFhirRoute'
import { WriteToTracker } from './write/WriteToTracker'
import { useWriteMappedEvent } from './write/useWriteMappedEvent'
import classes from './App.module.css'

// Five steps: connect (Step 1), pick a program (Step 2), map its fields
// (Step 3, persisted via useMappingProfile), preview against one real
// fetched resource (Step 4) -- including, inline, mapping any observed
// FHIR code to a DHIS2 option code for OPTION_SET fields -- then write
// that same previewed resource as one Tracker event (Step 5), applying
// those code translations, via resolveDataValue. Never blind: Step 5
// always writes exactly what Step 4 already showed. Full design and
// rationale: AIWORK/plan/Generic FHIR-to-DHIS2 Mapping Tool — Design.md
//
// Still unbuilt: multi-resource batch sync -- Step 4/5 only ever handle
// one resource at a time.
const App: FC = () => {
    const [selectedProgram, setSelectedProgram] = useState<DhisTargetProgram | null>(null)
    const { profile, setProfile, loading, loadError, saving, saveError, savedRecently, save } = useMappingProfile(selectedProgram)

    const authorities = useCurrentUserAuthorities()
    const fhirRoute = useFhirRoute()
    const connection = useFhirConnection()
    const preview = useMappingPreview(connection.routeId, selectedProgram, profile)
    const write = useWriteMappedEvent(selectedProgram, profile, preview.resource)

    const required = requiredImmunizationIgFields()
    const missing = profile ? missingRequiredFieldMappings(profile, required) : required
    const selectedRoute = fhirRoute.wildcardRoutes.find((r) => r.id === connection.routeId) ?? null

    return (
        <div className={classes.page}>
            <p className={classes.intro}>
                {i18n.t(
                    'Map a FHIR Immunization resource -- against the WHO SMART Guidelines Immunization IG -- onto this instance\'s own programme, fetch a real resource through a DHIS2 Route, preview exactly what the mapping produces, and write it into Tracker.'
                )}
            </p>

            <Card className={classes.card}>
                <h2 className={classes.stepHeading}>{i18n.t('Step 1: connect to a FHIR server')}</h2>
                {connection.loading ? (
                    <CircularLoader small />
                ) : (
                    <RoutePicker
                        fhirRoute={fhirRoute}
                        authorities={authorities}
                        selectedRouteId={connection.routeId}
                        onSelect={connection.setRouteId}
                    />
                )}
                {selectedRoute && (
                    <p className={classes.hint}>
                        {i18n.t('Selected route target:')} <code>{selectedRoute.url}</code>
                    </p>
                )}
                {connection.loadError && (
                    <NoticeBox error title={i18n.t('Could not load the saved connection')}>
                        {connection.loadError.message}
                    </NoticeBox>
                )}
                {connection.saveError && (
                    <NoticeBox error title={i18n.t('Could not save this connection')}>
                        {connection.saveError.message}
                    </NoticeBox>
                )}
            </Card>

            <Card className={classes.card}>
                <h2 className={classes.stepHeading}>{i18n.t('Step 2: pick the DHIS2 program to map onto')}</h2>
                <ProgramPicker selectedProgramId={selectedProgram?.id ?? null} onSelect={setSelectedProgram} />
                {loading && <CircularLoader small />}
                {loadError && (
                    <NoticeBox error title={i18n.t('Could not load a saved mapping for this program')}>
                        {loadError.message}
                    </NoticeBox>
                )}
            </Card>

            {selectedProgram && profile && !loading && (
                <>
                    <Card className={classes.card}>
                        <h2 className={classes.stepHeading}>
                            {i18n.t('Step 3: map its data elements to the WHO SG Immunization IG')}
                        </h2>
                        <MappingTable program={selectedProgram} profile={profile} onChange={setProfile} />

                        {isMappingComplete(profile, required) ? (
                            <Tag positive>{i18n.t('Every required IG field is mapped')}</Tag>
                        ) : (
                            <div className={classes.missingBlock}>
                                <p className={classes.hint}>
                                    {i18n.t('{{count}} required IG field(s) still unmapped', { count: missing.length })}
                                </p>
                                <div className={classes.missingFields}>
                                    {missing.map((field) => (
                                        <Tag key={field.path}>{field.label}</Tag>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <Button primary loading={saving} onClick={() => save()}>
                                {i18n.t('Save mapping')}
                            </Button>
                        </div>

                        {savedRecently && (
                            <NoticeBox valid title={i18n.t('Saved')}>
                                {i18n.t('This mapping is saved and will load automatically next time.')}
                            </NoticeBox>
                        )}
                        {saveError && (
                            <NoticeBox error title={i18n.t('Could not save this mapping')}>
                                {saveError.message}
                            </NoticeBox>
                        )}
                    </Card>

                    <Card className={classes.card}>
                        <h2 className={classes.stepHeading}>{i18n.t('Step 4: preview against a real fetched resource')}</h2>
                        {connection.routeId ? (
                            <MappingPreview
                                preview={preview}
                                onCodeMappingChange={(dhisDataElementId, fhirCode, dhisOptionCode) =>
                                    setProfile(setCodeMapping(profile, dhisDataElementId, fhirCode, dhisOptionCode))
                                }
                            />
                        ) : (
                            <NoticeBox title={i18n.t('Connect a FHIR server in Step 1 to preview this mapping')}>
                                {i18n.t('Previewing needs a real resource fetched through a connected Route.')}
                            </NoticeBox>
                        )}
                    </Card>

                    {preview.resource && (
                        <Card className={classes.card}>
                            <h2 className={classes.stepHeading}>{i18n.t('Step 5: write this event to DHIS2')}</h2>
                            <WriteToTracker write={write} />
                        </Card>
                    )}
                </>
            )}
        </div>
    )
}

export default App
