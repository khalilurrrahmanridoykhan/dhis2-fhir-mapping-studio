import i18n from '@dhis2/d2-i18n'
import React, { FC, useState } from 'react'
import { ProgramPicker } from './dhis2/ProgramPicker'
import type { DhisTargetProgram } from './dhis2/types'
import { createEmptyMappingProfile, isMappingComplete, missingRequiredFieldMappings, type MappingProfile } from './mapping/MappingProfile'
import { MappingTable } from './mapping/MappingTable'
import { requiredImmunizationIgFields } from './fhir/immunizationIgFields'
import classes from './App.module.css'

// Step 2 lands here: the field-mapping table. Persistence (saving this
// profile to dataStore) and the actual preview/sync pipeline are still
// separate, later pieces -- see the design doc:
// AIWORK/plan/Generic FHIR-to-DHIS2 Mapping Tool — Design.md
const App: FC = () => {
    const [selectedProgram, setSelectedProgram] = useState<DhisTargetProgram | null>(null)
    const [profile, setProfile] = useState<MappingProfile | null>(null)

    const handleSelectProgram = (program: DhisTargetProgram) => {
        setSelectedProgram(program)
        setProfile(createEmptyMappingProfile(program))
    }

    const required = requiredImmunizationIgFields()
    const missing = profile ? missingRequiredFieldMappings(profile, required) : required

    return (
        <div className={classes.container}>
            <h1>{i18n.t('FHIR Mapping Studio')}</h1>
            <h3>{i18n.t('Step 1: pick the DHIS2 program to map onto')}</h3>
            <ProgramPicker selectedProgramId={selectedProgram?.id ?? null} onSelect={handleSelectProgram} />

            {selectedProgram && profile && (
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
                </>
            )}
        </div>
    )
}

export default App
