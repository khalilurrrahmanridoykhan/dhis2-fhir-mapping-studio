# Security

## Reporting

Found a security issue? Open a
[GitHub issue](https://github.com/khalilurrrahmanridoykhan/dhis2-fhir-mapping-studio/issues)
or email khalilurrahmanridoykhan@gmail.com. Please don't disclose a serious
vulnerability publicly until it's fixed.

## Design

This app is a static DHIS2 App Platform bundle (JavaScript + CSS) served by the
DHIS2 instance it's installed on. It has no server of its own.

- **FHIR server credentials never reach the browser.** A FHIR server is reached
  only through a DHIS2 [Route](https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/route.html).
  The Route's `auth` block is a write-only property -- DHIS2 never returns it from
  a `GET`, regardless of the caller's permissions. The app sends a credential once, in the `POST /api/routes` body, to
  the instance's own API; from then on the instance makes the outbound call.
- **No third-party network calls.** Every request goes to the same-origin DHIS2
  API (`/api/*`, including `/api/routes/{id}/run/...`). There is no analytics, no
  telemetry, no external script or style.
- **No secrets in the repo.** No `.env`, no keys, no tokens. Credentials typed
  into the "create a Route" form live only in React state for the lifetime of the
  form and are sent only to the DHIS2 API.
- **FHIR data is rendered as React text**, never `dangerouslySetInnerHTML` /
  `innerHTML` / `eval`, so a hostile value in a fetched resource can't inject
  markup or script.
- **No browser storage of anything sensitive.** Mapping profiles and the chosen
  Route id are persisted to the DHIS2 dataStore (namespace `fhirMappingStudio`),
  not `localStorage`.

## Dependency advisories

`npm audit` reports advisories (`styled-jsx`, and build-time `loader-utils`). All
of them are transitive through `@dhis2/ui` and `@dhis2/cli-app-scripts` -- the
DHIS2 App Platform's own dependency tree, shared by every app built on it:

- `styled-jsx@4.0.1` is a dependency of every `@dhis2-ui/*` component and of
  `@dhis2/app-adapter`. It can only be updated upstream in `@dhis2/ui`.
- `loader-utils` comes only from build tooling (`babel-loader`, `file-loader`,
  the react-refresh webpack plugin, the styled-jsx compiler). It is **not** in
  the shipped bundle.

This app pins no vulnerable package directly and adds none of its own.
`npm audit fix` cannot resolve these without overriding DHIS2 platform packages,
which would break the build; the fix has to land in `@dhis2/ui` /
`@dhis2/cli-app-scripts` and be picked up on the next platform bump.
