import { Button, CircularLoader, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import React, { FC, useState } from 'react'
import { ProgramPicker } from './dhis2/ProgramPicker'
import type { DhisTargetProgram } from './dhis2/types'
import { isMappingComplete, missingRequiredFieldMappings } from './mapping/MappingProfile'
import { MappingTable } from './mapping/MappingTable'
import { useMappingProfile } from './mapping/useMappingProfile'
import { requiredImmunizationIgFields } from './fhir/immunizationIgFields'
import classes from './App.module.css'

// Persistence lands here: useMappingProfile loads a saved profile (or
// starts empty) when a program is picked, and Save writes it back to
// dataStore. The preview/sync pipeline that actually reads a FHIR
// resource and writes it into DHIS2 using this profile is still a
// separate, later piece -- see the design doc:
// AIWORK/plan/Generic FHIR-to-DHIS2 Mapping Tool — Design.md
const App: FC = () => {
    const [selectedProgram, setSelectedProgram] = useState<DhisTargetProgram | null>(null)
    const { profile, setProfile, loading, loadError, saving, saveError, savedRecently, save } = useMappingProfile(selectedProgram)

    const required = requiredImmunizationIgFields()
    const missing = profile ? missingRequiredFieldMappings(profile, required) : required

    return (
        <div className={classes.container}>
            <h1>{i18n.t('FHIR Mapping Studio')}</h1>
            <h3>{i18n.t('Step 1: pick the DHIS2 program to map onto')}</h3>
            <ProgramPicker selectedProgramId={selectedProgram?.id ?? null} onSelect={setSelectedProgram} />

            {loading && <CircularLoader small />}

            {loadError && (
                <NoticeBox error title={i18n.t('Could not load a saved mapping for this program')}>
                    {loadError.message}
                </NoticeBox>
            )}

            {selectedProgram && profile && !loading && (
                <>
                    <h3>{i18n.t('Step 2: map its data elements to the WHO SG Immunization IG')}</h3>
                    <MappingTable program={selectedProgram} profile={profile} onChange={setProfile} />
                    <p>
                        {isMappingComplete(profile, required)
                            ? i18n.t('Every required IG field is mapped.')
                            : i18n.t('{{count}} required IG field(s) still unmapped: {{fields}}', {
                                  count: missing.length,
                                  fields: missing.map((f) => f.label).join(', '),
                              })}
                    </p>

                    <Button primary loading={saving} onClick={() => save()}>
                        {i18n.t('Save mapping')}
                    </Button>

                    {savedRecently && <NoticeBox title={i18n.t('Saved')}>{i18n.t('This mapping is saved and will load automatically next time.')}</NoticeBox>}
                    {saveError && (
                        <NoticeBox error title={i18n.t('Could not save this mapping')}>
                            {saveError.message}
                        </NoticeBox>
                    )}
                </>
            )}
        </div>
    )
}

export default App
