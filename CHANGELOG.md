# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [1.0.0] - 2026-09-11

### Added

- WHO SMART Guidelines Immunization IG field reference (22 fields, verified
  against the real published `StructureDefinition`), plus a hand-crafted
  IG-conformant sample Immunization resource for development.
- Browse an instance's own `WITHOUT_REGISTRATION` programs and pick one to
  map onto (`ProgramPicker`).
- Author a Mapping Profile: a table pairing each of the picked program's
  data elements with a WHO SG IG field (`MappingTable`), with a live count
  of required IG fields still unmapped.
- Persist one Mapping Profile per program to `dataStore`, loaded
  automatically the next time that program is picked.
- Connect to a FHIR server: list and select an existing DHIS2 Route, or
  create one (with basic auth, bearer token, or API token). Every call to
  the FHIR server runs through the Route -- never straight from the
  browser -- so credentials never touch the client. The chosen connection
  persists to `dataStore` and auto-loads on reopen.

- Preview a mapping against a real fetched resource (Step 4): fetch one
  Immunization resource through the connected Route and see, for every
  DHIS2 data element, exactly what value its mapped WHO SG IG field reads
  from that resource -- before anything is ever written to DHIS2.

- Write the previewed resource to DHIS2 Tracker (Step 5): pick a target
  organisation unit, then write exactly the resource Step 4 already
  fetched and showed -- never a second, independent fetch -- as one real
  Tracker event, via `/api/tracker`. Shows the created event's real id on
  success, or DHIS2's own rejection message on failure.

- Code mapping for coded fields (in Step 4): when a CodeableConcept-typed
  IG field is mapped onto an OPTION_SET data element, the preview now
  shows the real code (or text label) observed on the fetched resource
  and lets an admin pick which of the data element's own options it
  corresponds to, inline. Step 5 writes that saved translation -- the
  real DHIS2 option code, not display text -- and cleanly omits the field
  (rather than sending text DHIS2 would reject) when no translation has
  been picked yet.

### App Hub readiness

- App laid out as `@dhis2/ui` cards with consistent spacing; a one-line
  description, a custom app icon, and manifest metadata (title,
  description, author, `dataStoreNamespace`).
- Wrapped in an `ErrorBoundary` -- a render error shows a `NoticeBox`, not
  a blank screen.
- `SECURITY.md`: the app's own code is clean; all `npm audit` advisories
  are transitive through `@dhis2/ui` / `@dhis2/cli-app-scripts`.
- `i18n`: every string uses `i18n.t()` with no colons (they broke the
  extractor's key parsing); `en.pot` regenerates clean and matches the
  source.
- CI now also runs `tsc --noEmit`; build tooling pinned to a stable
  release.
- Checked against the DHIS2 App Hub's own published submission
  guidelines: fixed `window.open(..., '_blank')` (Route Manager link) to
  pass `noopener,noreferrer`, matching the guideline's `rel="noreferrer"`
  requirement for external `target="_blank"` links. Everything else in
  the guidelines (routes for external calls, cookie-session auth, no
  external scripts/stylesheets, no hardcoded credentials, unique
  dataStore namespace, React's default XSS protection) was already true
  of this app, not newly added.
- First submittable release: version bumped to `1.0.0`.

### Verified against a real DHIS2 instance

Every HTTP contract this app depends on has been exercised against a real
DHIS2 instance (2.42.5) with a real Route to a real FHIR server, not just
mocks:

- **Route creation** (`POST /api/routes` with this app's exact payload)
  and **route sharing** (`POST /api/sharing?type=route&id=…` granting
  `r-------`) both succeed; the route's `auth` config is write-only
  (never returned from a GET), confirming credentials stay server-side.
- **Fetch through the route** (`GET /api/routes/{id}/run/Immunization`)
  returns a real FHIR `Bundle` with `Content-Type: application/fhir+json`
  -- the exact case this app handles with a raw `fetch()` because
  `@dhis2/data-engine` would not parse it.
- **The full write path** -- a resource fetched through the route, mapped,
  and written as one Tracker event -- lands correctly, with every mapped
  `dataValue` stored as expected and the real event id returned.
- **The coded-field path**, against a purpose-built event program with an
  option-set data element: with no code translation the value is omitted
  and the event still writes; sending the raw FHIR text instead is
  rejected by DHIS2 (`"… is not a valid option code in OptionSet …"`) --
  which is exactly why the translation step exists; with the translation
  applied, the real option code is accepted and stored. (Test metadata
  and events were removed afterward.)

An earlier smoke test against `play.im.dhis2.org` drove three fixes:

- Step 4 now warns, naming them, when a **compulsory** data element will
  have no value -- rather than letting the write fail with a raw `E1303`.
- Text-only `CodeableConcept` values (which real FHIR servers send for
  `vaccineCode`) are now mappable, not silently written as raw text.
- Confirmed the app correctly keys "is this a coded field" off the
  `optionSet`'s presence, not the `valueType` string (a real instance
  reports an option-set element as `valueType: "TEXT"`).

Also run end to end in a real browser against a live instance by the
app's own author -- connect, map, preview, and a real write producing a
real Tracker event id, confirming the UI wiring on top of the
contracts above, not just the contracts themselves.

Known, deliberate limitation: one resource at a time -- no multi-resource
batch sync yet.

## [0.1.0] - 2026-09-08

### Added

- DHIS2 App Platform TypeScript scaffold (`@dhis2/cli-app-scripts`).
- `/api/me` connectivity check as the scaffold-stage verification that the
  app can reach a connected DHIS2 instance.
- `minDHIS2Version: '2.40'` declared in `d2.config.js`.
- MIT `LICENSE`.
- CI workflow: install, test, build on every push and pull request.

No mapping features yet. Full design and rationale live in
[`Generic FHIR-to-DHIS2 Mapping Tool — Design.md`](../plan/Generic%20FHIR-to-DHIS2%20Mapping%20Tool%20%E2%80%94%20Design.md).
