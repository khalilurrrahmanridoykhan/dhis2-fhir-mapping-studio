import i18n from '@dhis2/d2-i18n'
import React, { FC, useState } from 'react'
import { ProgramPicker } from './dhis2/ProgramPicker'
import type { DhisTargetProgram } from './dhis2/types'
import classes from './App.module.css'

// The scaffold-stage /api/me connectivity check has done its job (proved
// the app can reach a connected instance) and is replaced here by the
// actual first real screen: picking a target program. The field-mapping
// table that pairs its data elements against the WHO SG IG's fields comes
// next, as its own commit -- see the design doc:
// AIWORK/plan/Generic FHIR-to-DHIS2 Mapping Tool — Design.md
const App: FC = () => {
    const [selectedProgram, setSelectedProgram] = useState<DhisTargetProgram | null>(null)

    return (
        <div className={classes.container}>
            <h1>{i18n.t('FHIR Mapping Studio')}</h1>
            <h3>{i18n.t('Step 1: pick the DHIS2 program to map onto')}</h3>
            <ProgramPicker selectedProgramId={selectedProgram?.id ?? null} onSelect={setSelectedProgram} />

            {selectedProgram && (
                <p>
                    {i18n.t('Selected: {{name}} -- {{count}} data element(s) in its stage. Field-mapping table comes next.', {
                        name: selectedProgram.name,
                        count: selectedProgram.programStages[0]?.programStageDataElements.length ?? 0,
                    })}
                </p>
            )}
        </div>
    )
}

export default App
