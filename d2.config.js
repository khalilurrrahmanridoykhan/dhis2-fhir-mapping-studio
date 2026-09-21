/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    type: 'app',
    name: 'fhir-mapping-studio',
    title: 'FHIR Mapping Studio',
    description:
        'Map FHIR Immunization data (WHO SMART Guidelines IG) onto your own DHIS2 programme, preview what a real resource produces, and write it to Tracker. The FHIR server is reached only through a DHIS2 Route, so no separate backend is needed.',

    // Tracker API + Routes have been stable well before this floor; matches
    // the same minDHIS2Version discipline every sibling app in this family
    // declares rather than leaving compatibility unstated.
    minDHIS2Version: '2.40',

    entryPoints: {
        app: './src/App.tsx',
    },

    // The one namespace this app reads and writes (mapping profiles, one
    // per programme, and the saved FHIR connection). Declared so the
    // platform can authorise it rather than the app relying on the user
    // already having broad dataStore rights.
    dataStoreNamespace: 'fhirMappingStudio',

    direction: 'auto',

    // Splits third-party deps (mainly @dhis2/ui) into their own chunk,
    // separate from this app's own code -- build-output cleanliness only
    // (silences the "chunk larger than 500kB" warning), no functional
    // change. Same fix the sibling dhis2-fhir-sync-console app uses; see
    // https://developers.dhis2.org/docs/app-platform/config/d2-config-js-reference#viteconfigextensions
    viteConfigExtensions: {
        build: {
            // The vendor chunk is still >500kB after the split -- that's
            // @dhis2/ui + React + app-runtime themselves, not this app's
            // own code. Raising the limit reflects that rather than
            // leaving a warning nothing can act on.
            chunkSizeWarningLimit: 800,
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('node_modules')) return 'vendor'
                    },
                },
            },
        },
    },
}

module.exports = config
