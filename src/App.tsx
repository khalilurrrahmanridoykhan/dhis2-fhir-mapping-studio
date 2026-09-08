import { useDataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import React, { FC } from 'react'
import classes from './App.module.css'

// Scaffold-stage connectivity check only -- confirms the app can reach the
// connected DHIS2 instance's API before any real feature work starts, same
// "verify before building" discipline as every other app in this family.
// Replaced once the actual Mapping Profile / mapping-authoring UI lands --
// see the design doc for the full plan this app implements:
// AIWORK/plan/Generic FHIR-to-DHIS2 Mapping Tool — Design.md
interface QueryResults {
    me: {
        name: string
    }
}

const query = {
    me: {
        resource: 'me',
    },
}

const App: FC = () => {
    const { error, loading, data } = useDataQuery<QueryResults>(query)

    if (error) {
        return <span>{i18n.t('ERROR')}</span>
    }

    if (loading) {
        return <span>{i18n.t('Loading...')}</span>
    }

    return (
        <div className={classes.container}>
            <h1>{i18n.t('FHIR Mapping Studio')}</h1>
            <h3>{i18n.t('Connected as {{name}}. Scaffold stage -- no mapping features yet.', { name: data?.me?.name })}</h3>
        </div>
    )
}

export default App
