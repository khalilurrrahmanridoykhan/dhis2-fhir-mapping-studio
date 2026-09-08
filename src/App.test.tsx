import { CustomDataProvider } from '@dhis2/app-runtime'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

it('renders without crashing', () => {
    const container = document.createElement('div')

    // App no longer queries 'me' directly -- its child ProgramPicker
    // queries 'programs' (see useTargetPrograms.ts). Mocked here with an
    // empty result; ProgramPicker.test.tsx already covers the populated
    // and error states in detail, this smoke test only needs App itself
    // to mount without crashing.
    const data = {
        programs: { programs: [] },
    }

    const root = createRoot(container)
    root.render(
        <CustomDataProvider data={data}>
            <App />
        </CustomDataProvider>
    )

    root.unmount()
})
