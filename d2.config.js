/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    type: 'app',

    entryPoints: {
        app: './src/App.tsx',
    },

    direction: 'auto',

    // Tracker API + Routes have been stable well before this floor; matches
    // the same minDHIS2Version discipline every sibling app in this family
    // declares rather than leaving compatibility unstated.
    minDHIS2Version: '2.40',
}

module.exports = config
